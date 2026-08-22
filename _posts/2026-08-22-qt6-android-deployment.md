---
layout: post
title: "From QML to Play Store: Shipping a Qt 6 App on Android"
description: A practical walkthrough of cross-compiling, packaging, signing, and publishing a Qt 6 QML application for Android, from raw NDK setup to a live Play Store release.
date: '2026-08-22'
categories:
    - Qt 6
tags:
    - Qt 6
    - QML
    - Android
    - Deployment
    - Google Play
comments: true
sidebar: true
---

Deploying a Qt 6 app to Linux, macOS, and Windows is largely the same problem three times: compile, gather dependencies, package. Android breaks that pattern completely. There's no executable, no `lib/` folder next to a binary, no double-click to launch. Your C++ code becomes a component inside a Java application, wrapped in a ZIP file with a very specific internal shape, and the whole thing has to be digitally signed before a device will even look at it.

This post walks through that entire path for **Squared**, a real Qt 6 QML app, as part of my [Qt QML Cross-Platform Deployment course](/courses/qt-qml-deployment/): understanding why Android is structured the way it is, installing the four tools that make cross-compilation possible, configuring CMake, building, inspecting the output, signing it, running it on a device or emulator, and publishing it to the Google Play Store.

## Why Android Is a Different Problem

On desktop, the operating system runs your compiled binary directly. The dynamic linker (the OS component that loads shared libraries a program depends on) finds Qt's `.so` or `.dll` files in a folder next to it, and your `main()` function is the entry point the OS calls.

Android doesn't work that way. Your C++ code compiles into a shared library instead of an executable. The Android OS launches a Java component called an Activity. That Java code calls `System.loadLibrary()`, which loads your compiled C++ through **JNI** (the Java Native Interface, the mechanism Java uses to call into native code). Your `main()` still runs. Your Qt code is unchanged. But it now runs inside a Java application, not as a standalone process.

```
  Desktop                              Android
  ─────────────────────────            ─────────────────────────────
  OS calls exec(./Squared)             OS launches a Java Activity
        │                                    │
        ▼                                    ▼
  dynamic linker loads Qt              QtActivity.java calls
  libraries from lib/                  System.loadLibrary()
        │                                    │
        ▼                                    ▼
  main() runs directly              JNI calls into
                                     libSquared_arm64-v8a.so
                                            │
                                            ▼
                                     main() runs inside the .so,
                                     Qt libraries loaded from
                                     lib/arm64-v8a/
```

Same C++ code, same Qt libraries, a completely different container. The output of an Android build isn't an executable, it's `libSquared_arm64-v8a.so`, packaged alongside every Qt shared library the app needs into an **APK**: a ZIP file with a structure Android knows how to install and run. Everything in this post follows from that one fact.

## Three Numbers You Need to Get Right

Before touching any build configuration, three numbers show up everywhere in Android projects, and getting them wrong is one of the most common causes of build failures and Play Store rejections.

Every Android release has an **API level**, a single integer identifying which version of Android's public interface an app is built against. Android 14 is API 34, Android 15 is API 35, and so on. Think of it like a versioned header file: a feature Google adds in API 34 won't compile, or will crash, on a device running API 33.

Three separate settings all use this same integer scale, but they each control something different:

```
compileSdk ── build time only ──────────────────────────────────────────┐
              Which android.jar the compiler checks your API calls      │
              against. No effect at runtime. Must be >= targetSdk.      │
                                                                         │
  targetSdk ── runtime signal to the OS ─────────────────────────┐      │
               "I have tested my app against this Android        │      │
               version." The OS uses it to decide how much       │      │
               backward-compatibility behavior to apply.          │      │
               Google Play enforces a minimum. Must be >= minSdk. │      │
                                                                   │      │
    minSdk ── install-time filter ──────────────────────────┐     │      │
              Oldest Android version allowed to install      │     │      │
              the app. Play Store hides it below this level. │     │      │
                                                              │     │      │
                    minSdk  <=  targetSdk  <=  compileSdk    ▼     ▼      ▼
```

Two of the three aren't really your choice. **compileSdk** is dictated by your Qt version (Qt's Android build tools depend on Google compatibility libraries with their own minimum API requirement, and Qt's supported-platforms page lists it for every release). **targetSdk** is dictated by Google Play policy, which sets an annually-updated minimum for new submissions. **minSdk** is the one number you actually pick, based on how far back you want to support devices. API 26 (Android 8.0) covers roughly 97% of active devices as of 2025 and is a safe default.

For Qt 6.11, that works out to `compileSdk = 36`, `targetSdk = 35`, `minSdk = 26`. Keep those three numbers straight now; they'll reappear as literal CMake properties shortly.

## Four Tools Before Any Code

Cross-compiling for Android needs four pieces of software on the build machine, none of which are things a desktop Qt setup already has.

**1. JDK 21.** Android's build tools are written in Java, and Gradle 9.x (the Java-based build system Qt uses to assemble the final APK) requires JDK 21 specifically. We use [Eclipse Temurin](https://adoptium.net/), a free open-source JDK distribution. Extract it, rename the versioned folder to something stable like `jdk-21`, and export `JAVA_HOME` in your shell profile:

```bash
mkdir -p ~/Android
tar -xf OpenJDK21U-jdk_x64_linux_*.tar.gz -C ~/Android/
mv ~/Android/jdk-21.* ~/Android/jdk-21

# add to ~/.bashrc (or ~/.zshrc on macOS)
export JAVA_HOME=$HOME/Android/jdk-21
```

**2. The Android SDK.** Not a single binary, but a directory of tools managed by `sdkmanager`, a command-line utility for installing and updating individual SDK pieces. You bootstrap `sdkmanager` itself from a small command-line-tools package, then use it to pull down the actual platform APIs and build tools:

```bash
mkdir -p ~/Android/Sdk/cmdline-tools/latest
unzip commandlinetools-linux-*.zip -d /tmp/ct
mv /tmp/ct/cmdline-tools/* ~/Android/Sdk/cmdline-tools/latest/

# add to shell profile
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

sdkmanager --install "platform-tools" "platforms;android-35" "platforms;android-36" "build-tools;35.0.0"
```

`platform-tools` gives you `adb`, the Android Debug Bridge used later to install and debug the app on a device. The `platforms;android-XX` packages are API stubs the compiler validates against. `build-tools` contains the tools that do final APK assembly.

**3. The NDK (Native Development Kit), version r27d.** This is the actual cross-compiler: it turns your C++ into ARM machine code and provides the sysroot (the set of Android system headers and libraries your code compiles against). Qt's supported-platforms page recommends matching the exact NDK series Qt itself was built with, to avoid missing-symbol errors at link time. r27d is the current release in that series:

```bash
unzip android-ndk-r27d-linux.zip -d ~/Android/
# results in ~/Android/android-ndk-r27d/
```

**4. The Qt Android kit.** Prebuilt Qt libraries compiled for `arm64-v8a`, plus a wrapper script called `qt-cmake` that knows how to point CMake at the right toolchain automatically. Installed through the same Qt Maintenance Tool you used for desktop Qt: tick **Android arm64-v8a** under your Qt version, and it lands at a path like `/opt/Qt/6.11.0/android_arm64_v8a/`.

One more dependency worth flagging early: **OpenSSL**. Android doesn't expose a system OpenSSL to apps (Google removed it in Android 7), so if your app makes HTTPS requests and you don't bundle OpenSSL yourself, those requests fail silently. No crash, no error, just no data. We'll wire this into the CMake configuration below.

A quick note on host OS: Android cross-compilation works on Linux, macOS, and Windows, but Linux is the smoothest (a clean build takes under two minutes) and macOS is nearly identical. Windows has two sharp edges worth knowing about upfront: a 260-character path length limit that Gradle's generated intermediate files can exceed if your install paths are deeply nested, and silent CMake configuration failures if any path (Qt, SDK, NDK, or project) contains a space. Installing everything close to the drive root (`C:\Qt`, `C:\Android`, `C:\projects\...`) avoids both.

## The Manifest and Launcher Icons

On desktop, the application is a standalone executable. On Android, it's a component inside a Java application, and that Java application needs a manifest describing itself to the OS: its package name, permissions, and which class starts it. It also needs launcher icons at every screen density Android supports.

Create `android/AndroidManifest.xml` at the project root. This is a template, not the final manifest: Qt's `androiddeployqt` tool (the utility that assembles the whole Android build, covered in detail below) merges it with its own required entries during the build.

```xml
<?xml version="1.0"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.squared.app"
    android:installLocation="auto"
    android:versionCode="-- %%INSERT_VERSION_CODE%% --"
    android:versionName="-- %%INSERT_VERSION_NAME%% --">

    <supports-screens
        android:anyDensity="true"
        android:largeScreens="true"
        android:normalScreens="true"
        android:smallScreens="true" />

    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:hardwareAccelerated="true"
        android:label="Squared"
        android:icon="@mipmap/ic_launcher"
        android:allowBackup="true"
        android:fullBackupOnly="false">

        <activity
            android:name="org.qtproject.qt.android.bindings.QtActivity"
            android:configChanges="orientation|uiMode|screenLayout|screenSize|smallestScreenSize|layoutDirection|locale|fontScale|keyboard|keyboardHidden|navigation|mcc|mnc|density"
            android:launchMode="singleTop"
            android:screenOrientation="unspecified"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <meta-data
                android:name="android.app.lib_name"
                android:value="-- %%INSERT_APP_LIB_NAME%% --" />
        </activity>
    </application>
</manifest>
```

The important part is the `meta-data` tag near the bottom. `%%INSERT_APP_LIB_NAME%%` is a placeholder that `androiddeployqt` replaces with the real library name during the build. That's how the Java activity knows which `.so` file to load with `System.loadLibrary()`. Get this wrong or leave it missing, and the app crashes at startup with an `UnsatisfiedLinkError` (Java's error for "I tried to load a native library and couldn't find it").

`org.qtproject.qt.android.bindings.QtActivity` is Qt's own Java bootstrap class. It handles loading the native library, setting up the OpenGL rendering surface, and forwarding input events into your C++ code.

For icons, Android needs them at five densities (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi), each in its own `mipmap-*` folder under `android/res/`. You can generate these with Android Asset Studio from a single 512x512 source image, or automate it with ImageMagick (a command-line image manipulation tool) run inside a Docker container, so nothing needs installing locally:

```bash
docker run --rm -v "$(pwd)":/work -w /work --entrypoint sh dpokidov/imagemagick -c "
  magick assets/icons/squared-512.png -resize 48x48   android/res/mipmap-mdpi/ic_launcher.png &&
  magick assets/icons/squared-512.png -resize 72x72   android/res/mipmap-hdpi/ic_launcher.png &&
  magick assets/icons/squared-512.png -resize 96x96   android/res/mipmap-xhdpi/ic_launcher.png &&
  magick assets/icons/squared-512.png -resize 144x144 android/res/mipmap-xxhdpi/ic_launcher.png &&
  magick assets/icons/squared-512.png -resize 192x192 android/res/mipmap-xxxhdpi/ic_launcher.png
"
```

`--rm` removes the container instance when it exits (the downloaded image itself stays cached). `-v "$(pwd)":/work` mounts the project directory into the container so it can see your source PNG and write the results back out. `--entrypoint sh` swaps the container's default single-command behavior for a shell, so the `-c` string can run five `magick` resize commands chained with `&&`, each one only running if the last one succeeded.

## Wiring Android Into CMake

Two files change: the root `CMakeLists.txt` and `src/CMakeLists.txt`.

In the root file, guard the `find_package` call. Qt's Android kit doesn't include QuickTest, Test, or DBus, so those are desktop-only:

```cmake
if(ANDROID)
    find_package(Qt6 REQUIRED COMPONENTS Quick QuickControls2 Network)
else()
    find_package(Qt6 REQUIRED COMPONENTS Quick QuickControls2 QuickTest Test Network)
    if(UNIX AND NOT APPLE)
        find_package(Qt6 REQUIRED COMPONENTS DBus)
    endif()
endif()
```

Skip the test subdirectory entirely on Android, since the test framework isn't available there:

```cmake
if(NOT ANDROID)
    enable_testing()
    add_subdirectory(tests)
endif()
```

Then, before `add_subdirectory(src)` (CMake evaluates target properties when that subdirectory runs, so anything it depends on must already be defined), add the Android configuration block:

```cmake
# --- Android configuration ---
if(ANDROID)
    # Version code: MAJOR * 10000 + MINOR * 100 + PATCH (e.g., 0.1.0 -> 100)
    math(EXPR ANDROID_VERSION_CODE
        "${PROJECT_VERSION_MAJOR} * 10000 + ${PROJECT_VERSION_MINOR} * 100 + ${PROJECT_VERSION_PATCH}")

    # Bundle OpenSSL for TLS/HTTPS support on Android.
    set(ANDROID_OPENSSL_DIR "$ENV{ANDROID_HOME}/android_openssl"
        CACHE PATH "Path to KDAB/android_openssl prebuilt libs")
    if(EXISTS "${ANDROID_OPENSSL_DIR}/CMakeLists.txt")
        include("${ANDROID_OPENSSL_DIR}/CMakeLists.txt")
    else()
        message(WARNING "Android OpenSSL not found at ${ANDROID_OPENSSL_DIR}")
    endif()
endif()
```

Android tracks two version identifiers per release. **Version name** is the human-readable string users see (`0.1.0`), taken straight from `PROJECT_VERSION`. **Version code** is an integer the OS uses to decide whether an incoming APK is an upgrade, and it must strictly increase between releases: upload one equal to or lower than what's installed, and Android silently rejects the update. The formula above converts a semantic version into a code that always increases as long as you bump the version normally:

| Version name | Formula | Version code |
|---|---|---|
| 0.1.0 | 0×10000 + 1×100 + 0 | 100 |
| 0.1.1 | 0×10000 + 1×100 + 1 | 101 |
| 0.2.0 | 0×10000 + 2×100 + 0 | 200 |
| 1.0.0 | 1×10000 + 0×100 + 0 | 10000 |

The OpenSSL block includes a prebuilt library repository maintained by [KDAB](https://github.com/KDAB/android_openssl), cloned once into your SDK directory:

```bash
git clone https://github.com/KDAB/android_openssl.git $ANDROID_HOME/android_openssl
```

That repository's own `CMakeLists.txt` sets `ANDROID_EXTRA_LIBS` with the paths to `libssl` and `libcrypto`, which the `src/CMakeLists.txt` block below then bundles into the APK.

In `src/CMakeLists.txt`, add:

```cmake
# --- Android configuration ---
if(ANDROID)
    set_target_properties(Squared PROPERTIES
        QT_ANDROID_PACKAGE_SOURCE_DIR "${CMAKE_SOURCE_DIR}/android"
        QT_ANDROID_MIN_SDK_VERSION    26
        QT_ANDROID_TARGET_SDK_VERSION 35
        QT_ANDROID_COMPILE_SDK_VERSION 36
        QT_ANDROID_VERSION_NAME "${PROJECT_VERSION}"
        QT_ANDROID_VERSION_CODE "${ANDROID_VERSION_CODE}"
    )

    # Copy mipmap icons into android-build/res/
    add_custom_command(TARGET Squared POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_directory
            "${CMAKE_SOURCE_DIR}/android/res"
            "${CMAKE_BINARY_DIR}/src/android-build/res"
        COMMENT "Copying Android resources (icons) to android-build/res/"
    )

    # Bundle OpenSSL libs if found (set up in root CMakeLists.txt)
    if(ANDROID_EXTRA_LIBS)
        set_target_properties(Squared PROPERTIES
            QT_ANDROID_EXTRA_LIBS "${ANDROID_EXTRA_LIBS}"
        )
    endif()
endif()
```

`QT_ANDROID_PACKAGE_SOURCE_DIR` points Qt at the manifest template and resources from the previous section, which it merges with its own generated manifest, injecting the version name and code as it goes. The three SDK version properties are exactly the three numbers from earlier in this post, now expressed as literal CMake values:

```cmake
QT_ANDROID_MIN_SDK_VERSION     26   # oldest device allowed to install the app
QT_ANDROID_TARGET_SDK_VERSION  35   # runtime signal: "I've tested against API 35"
QT_ANDROID_COMPILE_SDK_VERSION 36   # build-time only: which android.jar to compile against

# invariant that must always hold:
#   compileSdk >= targetSdk >= minSdk
#      36      >=     35    >=   26      OK
```

`QT_ANDROID_COMPILE_SDK_VERSION` was added in Qt 6.7 specifically so you can set compileSdk independently of targetSdk; without it, Qt reuses targetSdk for both, which can leave compileSdk too low for whatever Android libraries Qt's current build tools depend on. And `QT_ANDROID_EXTRA_LIBS` is what actually tells `androiddeployqt` to copy the OpenSSL libraries into the APK. Skip it, and HTTPS requests fail with no error message at all, one of the harder bugs to track down on this platform precisely because it's silent.

## Cross-Compiling With qt-cmake

Here's the configure command:

```bash
/opt/Qt/6.11.0/android_arm64_v8a/bin/qt-cmake \
    -S . \
    -B build-android \
    -DCMAKE_BUILD_TYPE=MinSizeRel \
    -DQT_HOST_PATH=/opt/Qt/6.11.0/gcc_64 \
    -DANDROID_SDK_ROOT=$ANDROID_HOME \
    -DANDROID_NDK_ROOT=$HOME/Android/android-ndk-r27d
```

Notice this calls `qt-cmake`, not plain `cmake`. It's a wrapper script Qt installs inside the Android kit that pre-sets the Android toolchain file, target architecture, API level, and roughly twenty other variables that would be tedious to specify by hand.

`CMAKE_BUILD_TYPE` is `MinSizeRel` rather than the `Release` you'd use on desktop. MinSizeRel optimizes for binary size (using the compiler's `-Os` flag) instead of speed, because on mobile, download size matters more than the last few percent of runtime performance.

`QT_HOST_PATH` is the setting that makes cross-compilation actually work. While the compiler is producing ARM binaries, some build steps still need to run tools on your *build* machine: `moc` (Qt's meta-object compiler), `rcc` (the resource compiler), `qmlcachegen`, and `androiddeployqt` itself are all x86_64 Linux binaries. `QT_HOST_PATH` tells CMake where your desktop Qt installation lives so it can run those host-side tools during the build, separately from the target libraries being linked into the app.

`ANDROID_NDK_ROOT` is passed explicitly here rather than set as a global environment variable, which means different projects on the same machine can each pin their own NDK version without conflicting.

Watch the compiler identification line in the CMake output: it reports Clang 18.0.4, the NDK's own cross-compiler, not your system's default compiler. From this point, every C++ file in the project compiles to ARM64 machine code.

Build with the ordinary CMake invocation:

```bash
cmake --build build-android --parallel
```

The default target compiles the C++ into shared libraries, runs `androiddeployqt` to generate a complete Gradle project, then invokes **Gradle** (Android's own build system) to assemble the actual APK. `androiddeployqt` plays the same role here that `linuxdeploy` or `macdeployqt` play on desktop: it walks the dependency tree, copies the required libraries, and lays out the final package structure, just targeting Android's very different package format instead of a flat directory tree.

## What Got Generated

After the build finishes, `androiddeployqt` has produced a complete, standard Android project at `build-android/src/android-build/`, the kind any Android developer would recognize on sight:

```
build-android/src/android-build/
├── AndroidManifest.xml          <- Merged from your template
├── build.gradle                 <- Generated Gradle build script
├── gradle.properties            <- Build config (minSdk, targetSdk)
├── gradlew                      <- Gradle wrapper
├── libs/
│   └── arm64-v8a/
│       ├── libSquared_arm64-v8a.so     <- Your app
│       ├── libQt6Core_arm64-v8a.so     <- Qt Core
│       ├── libQt6Quick_arm64-v8a.so    <- Qt Quick
│       ├── libQt6Qml_arm64-v8a.so      <- QML engine
│       └── ... (~89 .so files total)
├── assets/
│   └── android_rcc_bundle.rcc   <- QML + resources (compiled)
├── res/
│   └── mipmap-*/                <- App icons at each density
└── build/outputs/apk/release/
    └── android-build-release-unsigned.apk
```

This maps cleanly onto the same four layers of deployment you'd recognize from a desktop build, just reshaped for Android's rules. Shared libraries: on desktop these sit in a flat `lib/` folder; here they sit in `libs/arm64-v8a/` in the Gradle project, which Gradle then repacks into `lib/arm64-v8a/` inside the final APK. Same roughly 89 `.so` files (Qt Core, Qt Quick, the QML engine, plugins, OpenSSL), different location.

QML files and resources work differently too. On desktop they compile directly into the binary; on Android that doesn't work because the QML engine needs to find files at runtime through Android's sandboxed asset APIs. Instead, everything gets packed into a single compiled resource bundle, `assets/android_rcc_bundle.rcc`.

And the manifest template from earlier is now the real thing: `%%INSERT_APP_LIB_NAME%%` has been replaced with `Squared`, and the version code, version name, min SDK, and target SDK have all been injected from the CMake properties you set.

## Inside the APK, and APK vs AAB

An APK is a ZIP file under the hood, so you can inspect one with any archive tool:

```bash
unzip -l build-android/src/android-build/build/outputs/apk/release/android-build-release-unsigned.apk
```

What's inside maps directly onto what was just generated: `lib/arm64-v8a/` holds all the shared libraries (Gradle renamed the directory from `libs/` to `lib/` along the way), `assets/android_rcc_bundle.rcc` holds the compiled QML and resources, `res/` holds the launcher icons, and `AndroidManifest.xml` is the merged manifest, now converted to a compact binary format for faster on-device parsing. One new piece appears here that wasn't in the Gradle project: `classes.dex`, Qt's compiled Java bootstrap Activity, the small class Android actually launches before it hands off to your native code.

An APK is a complete installable package, which makes it ideal for testing and direct installs (`adb install` and you're done). But because it has to work on any device, it carries libraries and resources for every ABI and screen density, even ones a given device will never use.

Google's answer to that waste is the **AAB**, the Android App Bundle: a publishing format, not something you install directly. You upload an AAB to the Play Store, and Google's infrastructure generates a slimmed-down, per-device APK from it on the fly, stripping out the ABIs and densities that specific device doesn't need.

| | APK | AAB |
|---|---|---|
| What it is | Installable package | Publishing format |
| Install directly | Yes (`adb install`, sideload) | No, Play Store converts it |
| Contains | Single ABI, all densities | All ABIs, all densities |
| Signed with | `apksigner` | `jarsigner` |
| Use for | Testing, direct distribution | Google Play Store uploads |

The default CMake build target produces an APK. Building an AAB instead just means targeting a different Gradle task:

```bash
cmake --build build-android --target aab
```

This runs the same compile and `androiddeployqt` steps, then has Gradle run its bundle tasks in addition to the usual APK ones. You'll likely see harmless warnings about unresolved QML imports for platform styles like `QtQuick.Controls.Windows` or `.macOS`. Those styles genuinely don't exist on Android, `androiddeployqt` logs it and moves on, and your app falls back to whichever style you actually configured for Android. The AABs land under `build/outputs/bundle/{debug,release}/`, and as a side effect this target also produces a release APK, still unsigned at this point.

## Signing

Every APK and AAB has to be digitally signed before Android will install it or the Play Store will accept it. Even debug builds are signed, with a throwaway key the tools generate automatically; release builds need your own.

The signature is what proves an update came from the same developer as the original install. If the keys don't match, Android rejects the update outright, and if you lose your signing key, there is no recovery path: you permanently lose the ability to update that app under its existing identity. Keep the keystore file (an encrypted file holding your signing key) somewhere safe outside the project directory, and never commit it to version control.

Generate the keystore once with `keytool`, a JDK utility already on your `PATH` from the `$JAVA_HOME/bin` setup earlier:

```bash
mkdir -p ~/.android-keystore
keytool -genkeypair -v \
    -keystore ~/.android-keystore/release.keystore \
    -alias squared-release \
    -keyalg RSA -keysize 2048 -validity 10000
```

`-alias` names this key entry; you'll reference it by that name every time you sign a release. `-validity 10000` sets the certificate's lifetime in days, roughly 27 years, comfortably past the Play Store's own minimum validity requirement.

Signing an APK is three steps, using tools that live in the Android SDK's build-tools directory:

```bash
BT=$(ls -v $ANDROID_HOME/build-tools | tail -1)
```

`ls -v` sorts version-aware (so `35.0.0` correctly sorts after `9.0.0`), and `tail -1` grabs the newest.

**Step 1, zipalign.** Android reads some APK contents directly from the file rather than extracting them first, which only works efficiently if those entries sit at specific byte alignments. `zipalign` is the SDK tool that repositions them, and it has to run before signing, since signing locks the file's bytes in place:

```bash
$ANDROID_HOME/build-tools/$BT/zipalign -f -p 4 \
    build-android/src/android-build/build/outputs/apk/release/android-build-release-unsigned.apk \
    squared-release-aligned.apk
```

**Step 2, apksigner sign.** `apksigner`, also from the SDK build-tools, applies your keystore's signature:

```bash
$ANDROID_HOME/build-tools/$BT/apksigner sign \
    --ks ~/.android-keystore/release.keystore \
    --ks-key-alias squared-release \
    --out squared-release.apk \
    squared-release-aligned.apk
```

**Step 3, apksigner verify.** Confirm before distributing anything:

```bash
$ANDROID_HOME/build-tools/$BT/apksigner verify --verbose --print-certs squared-release.apk
```

You'll see several `false` lines for older or unused signature schemes (v1, v3.1, v4, SourceStamp). These are expected, not failures. What actually matters is `v2: true` and `v3: true`, which together cover every Android version from 7.0 onward and are what the Play Store and device installers actually check.

AABs are signed differently, with `jarsigner` instead of `apksigner`:

```bash
jarsigner \
    -keystore ~/.android-keystore/release.keystore \
    -sigalg SHA256withRSA \
    -digestalg SHA-256 \
    build-android/src/android-build/build/outputs/bundle/release/android-build-release.aab \
    squared-release
```

One difference worth flagging: `jarsigner` signs the file **in place**, unlike `apksigner`'s separate `--out` file. There's no distinct output path to remember here. It also prints a warning that "the signer's certificate is self-signed," which is expected and not a problem: Android keystores are always self-signed, and the Play Store only checks that the same certificate is used consistently across your updates, not who issued it.

If you'd rather not run these commands by hand every release, both Android Studio (**Build → Generate Signed Bundle / APK**) and Qt Creator (**Projects → Build → Sign package**) wrap the same `zipalign`/`apksigner` calls in a GUI wizard. Knowing what happens at the command line just means you can debug or reproduce the process without them.

## Running It: Device, adb, and logcat

With a signed APK, getting it onto a device is three commands.

First, enable USB debugging on the phone (**Settings → About phone → tap Build number 7 times**, then **Settings → Developer Options → USB Debugging**), connect it, and confirm `adb` (the Android Debug Bridge, the SDK's device communication tool) sees it:

```bash
adb devices
```

Install:

```bash
adb install -r squared-release.apk
```

`-r` replaces an existing install in place without wiping user data.

Launch, using `am`, Android's Activity Manager, given the package name and fully-qualified activity class separated by a slash:

```bash
adb shell am start -n com.squared.app/org.qtproject.qt.android.bindings.QtActivity
```

For debugging, `logcat` is Android's live system log, and every `qDebug()`, `qWarning()`, and QML `console.log()` call flows through it. To make your own messages findable in that stream, register a named logging category in `main.cpp`:

```cpp
#include <QLoggingCategory>

Q_LOGGING_CATEGORY(lcSquared, "Squared")

int main(int argc, char *argv[])
{
    qCInfo(lcSquared) << "App starting on Android";

    QGuiApplication app(argc, argv);
    // ...
}
```

The string `"Squared"` becomes the logcat tag you filter on. Since logcat is a live stream, start it *before* launching the app, or you'll miss every startup message:

```bash
# terminal 1, start the stream first
adb logcat -s "Qt:*" "qtlogging:*" "Squared:*" "AndroidRuntime:E"

# terminal 2, then launch
adb shell am start -n com.squared.app/org.qtproject.qt.android.bindings.QtActivity
```

A line in that stream looks like:

```
01-15 10:23:44.812  4521  4521 I Squared : App starting on Android
```

Timestamp, process ID, thread ID, a level character (`V`/`D`/`I`/`W`/`E`), the tag, then the message. `qCInfo()` produces `I`, `qCWarning()` produces `W`, and so on. QML's own `console.log()` needs no extra setup at all; it shows up automatically under the `qtlogging:*` tag with a `qml:` prefix.

A quick reference for the failures you'll actually hit:

| Symptom | Cause | Fix |
|---|---|---|
| `UnsatisfiedLinkError` | Library name wrong in manifest | Check the merged manifest for the real library name |
| `SIGSEGV` at startup | Native crash | Check `AndroidRuntime:E`, run `ndk-stack` on the trace |
| QML binding errors | Type mismatch or missing import | Check `Qt:*` and `qtlogging:*` tags |
| HTTPS requests return nothing | OpenSSL not bundled | Verify `QT_ANDROID_EXTRA_LIBS` is set |

## The Emulator, When a Device Isn't Handy

The Android emulator runs a full x86_64 Android system image as a virtual machine, with Android's ART runtime translating ARM instructions on the fly so unmodified ARM apps still run, just more slowly. That's fine for UI and functional testing; for benchmarking or anything touching real sensors (camera, Bluetooth, GPS), use a physical device instead.

It needs hardware virtualization support: KVM on Linux, Hypervisor.framework on macOS (built in since 10.10), or WHPX on Windows 10/11. It will not run inside WSL2 at all, since WSL2's own Hyper-V layer blocks access to the virtualization the emulator needs; from WSL2, a real device over USB is the only path.

Install the emulator binary and a system image, then define an AVD (Android Virtual Device, a named configuration pairing a system image with a hardware profile):

```bash
sdkmanager "emulator" "system-images;android-35;google_apis;x86_64"

avdmanager create avd \
    --name Pixel7_API35 \
    --package "system-images;android-35;google_apis;x86_64" \
    --device "pixel_7"

$ANDROID_HOME/emulator/emulator -avd Pixel7_API35 -no-snapshot-load
```

`google_apis` variants include Google Play Services, which most real-world apps depend on somewhere. It's worth keeping a few different hardware profiles around rather than just one: a Pixel 7 as a current mainstream default, a Pixel 4 (shorter, denser screen) to catch layouts that quietly assume too much vertical space, and a Pixel Tablet (wide, low-density) to expose adaptive-layout problems before they show up on a real tablet.

Once running, the emulator shows up in `adb devices` alongside any real device, and every `adb` command from the section above works against it unchanged. If more than one device is connected, target the emulator explicitly with `-s emulator-5554`.

## Publishing to Google Play

With a signed AAB in hand, the rest is entirely on Google's side of the fence.

You need a one-time Google Play Developer account ($25, permanent, covers unlimited submissions) at [play.google.com/console](https://play.google.com/console). Since August 2021, Google requires the AAB format for new app submissions; a raw APK is no longer accepted as a new app.

The most important concept to understand before uploading anything is **Play App Signing**, because it permanently changes how your releases get signed. In the old model, you signed the APK yourself and devices verified it against your own public key; lose that key and you can never update the app again. Play App Signing splits this into two separate keys:

```
You sign the AAB with your keystore (the "upload key")
                    │
                    ▼
     Google verifies it's really you
                    │
                    ▼
Google re-signs the APK with their own separate key
              (the "app signing key")
                    │
                    ▼
   User devices verify against Google's key, not yours
```

Your keystore becomes just a credential for authenticating uploads, essentially a password. The actual key that ends up on user devices is one Google generates and holds entirely on their own servers; you never see it. This is also what makes losing your upload key survivable: Google can issue you a replacement credential, and because devices never trusted your key in the first place, nothing on users' phones is affected. On your first upload, Google detects the AAB is signed with your key and automatically enrolls you into this scheme; there's nothing extra to configure.

Creating the app itself in the Play Console asks for a name, default language, app-or-game category, and free-or-paid status (the last one is permanent once set). From there, releases move through **tracks** that expose them to progressively larger audiences:

```
Internal testing ──► Closed testing ──► Open testing ──► Production
   (up to 100            (named             (public          (full
    testers,             groups,             opt-in,          rollout)
    no review)           review opt.)        review req.)
```

Internal testing goes live immediately with no Google review at all, and it's the right place for your first upload just to confirm the AAB is technically valid and installs cleanly. Production requires review (1 to 3 days for a brand-new app, usually hours for an update to an already-published one), and that review is a policy and safety check, not a code quality audit. You're free to skip straight from internal testing to production; the review requirement still applies whenever you first reach production, regardless of which tracks you passed through.

Before you can submit to production, the store listing needs several assets: a short description (80 characters, the hook shown in search results), a full description (up to 4000 characters, also feeds Play Store search indexing), a feature graphic (1024x500, the banner at the top of your listing), and at least two phone screenshots. The app icon itself isn't uploaded separately; it's extracted straight from the APK Google builds from your AAB.

Finally, the same version-code rule from earlier applies here without exception: every AAB you upload needs a strictly higher `versionCode` than anything already live in any track, or the upload is rejected outright. As long as you bump the semantic version in your `project()` call before each release, the formula from the CMake configuration section handles this automatically.

## The Takeaway

Everything in this chapter traces back to that one fact from the very first section: on Android, your app isn't a process, it's a native library loaded by someone else's Java code. That single difference is why the build output is a `.so` instead of an executable, why the package is a signed ZIP instead of a flat directory, why deployment needs `androiddeployqt` instead of `linuxdeploy`, and why publishing runs through Google's own signing infrastructure instead of a file you hand to a user directly.

None of the individual pieces are exotic once you see where they fit: `qt-cmake` is still CMake, just pre-configured for a cross-compiler. `androiddeployqt` still does the same dependency-walking and copying job as `macdeployqt` or `linuxdeploy`, just for a different package format. Signing is two JDK tools and two SDK tools, run in a fixed order. And the Play Console's track system is just a staged rollout, not a different way of shipping software.

If you want to see this whole path built from scratch, alongside the same app shipped to Windows, Linux, macOS, iOS, and embedded ARM, with a GitHub Actions pipeline tying it all together, I walk through it in my [Qt QML Cross-Platform Deployment course](/courses/qt-qml-deployment/). Nine chapters, one Qt QML application, every platform Qt supports.

Happy shipping!
