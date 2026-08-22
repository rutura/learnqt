---
layout: post
title: "From QML to the App Store: Shipping a Qt 6 App on iOS"
description: A practical walkthrough of building, signing, packaging, and publishing a Qt 6 QML application for iOS, from static linking and Xcode setup to a live App Store submission.
date: '2026-08-22'
categories:
    - Qt 6
tags:
    - Qt 6
    - QML
    - iOS
    - Deployment
    - App Store
comments: true
sidebar: true
---

Android reshapes a Qt app into a shared library loaded by Java. iOS goes further: it collapses the entire application, Qt included, into a single static binary, then wraps that binary in a chain of signing and packaging steps that has no real equivalent on any other platform. There's no `lib/` folder, no dynamic loading at launch, and no way to hand someone a finished app without going through Apple's own tooling at some point.

This post walks through that whole path for **Squared**, a real Qt 6 QML app, as part of my [Qt QML Cross-Platform Deployment course](/courses/qt-qml-deployment/): why iOS links statically, installing the three prerequisites, building the icon asset catalog, wiring CMake for both the simulator and real devices, code signing, packaging an IPA, and submitting to App Store Connect.

## Why iOS Is a Different Problem Again

Every desktop and Android build we've looked at follows the same shape: a small binary, and a pile of shared libraries the OS loads at launch. On Linux that's `.so` files in `lib/`. On macOS it's dynamic frameworks inside the `.app` bundle. On Windows it's `.dll` files next to the `.exe`. On Android it's 89 `.so` files packed into an APK. This is **dynamic linking**: the executable declares what it needs, and the operating system's runtime linker resolves those dependencies from disk when the process starts. Update a library, and you don't have to recompile the app that uses it, but every one of those files has to be present, in the right place, correctly configured. That's the deployment problem this whole course has been solving.

iOS actually *allows* dynamic frameworks. Third-party apps have been able to bundle `.framework` folders inside `MyApp.app/Frameworks/` since iOS 8, and the linker resolves them at launch the same way macOS does. What Apple genuinely forbids is loading code that wasn't part of the signed submission (no `dlopen()` of remote code, no loose `.dylib` files floating outside a framework bundle). Whatever form Qt shipped in, static or dynamic, we'd still have to bundle it with the app at submission time either way.

But Qt for iOS is distributed only as static libraries. The Qt 6 build system explicitly rejects a shared-library iOS configuration with the error *"Building Qt for iOS as shared libraries is not supported."* This is a decision made by the Qt Company, not an Apple restriction. Qt's iOS port predates iOS 8's framework support, and that static-only assumption is now baked into how Qt resolves `main()`, registers plugins, and exports symbols on this platform.

```
  Dynamic (desktop, Android)              Static (iOS)
  ───────────────────────────             ───────────────────────────
  Squared (binary)                        Squared (binary)
    depends on libQt6Core.so                Qt Core code:    compiled in
    depends on libQt6Quick.so                Qt Quick code:   compiled in
    depends on libQt6Qml.so                  QML engine:      compiled in
    depends on platform plugin               platform plugin: compiled in
         │
         ▼
  OS loads these from disk               Linker resolved everything
  at runtime                             at build time
```

Same application, same Qt code, a different linking model. With static linking there are no separate library files at all: the linker pulls in every Qt symbol our code touches, then every symbol *those* symbols touch, and keeps going until it produces one self-contained binary. Qt Core is in there. Qt Quick is in there. The QML engine, the platform integration plugin, the image codecs, all of it. The four layers we've been managing on every other platform (shared libraries, platform plugins, QML import paths, `qt.conf`) are all resolved at link time here instead of bundled as sibling files. The practical effect: there's no separate bundling step for us to get wrong. Configure CMake correctly, and the linker does the rest.

## Three Things Before Any Code

Building for iOS needs three things on the Mac, and yes, it has to be a Mac. Xcode, the compiler toolchain, and the signing tools it depends on simply don't exist anywhere else.

**1. Qt for iOS.** Installed through the Qt Maintenance Tool, the same GUI installer used for desktop Qt. Sign in, navigate to your Qt version, tick **iOS**, and it drops a complete iOS component at `~/Qt/6.11.0/ios/`: the statically compiled arm64 Qt libraries, the iOS toolchain file, and `qt-cmake`, the wrapper script used for every configure command in this post.

**2. Xcode**, the full application, not just its command-line tools. Xcode bundles the compiler (Clang), the iOS SDK, the simulator SDK, and every code-signing and device-provisioning tool. One app replaces what took four separate pieces on Android (the NDK, the SDK, `sdkmanager`, and the JDK). Qt 6.11 requires Xcode 15 or later (the iOS 17 SDK); Qt's supported-platforms page is the source of truth for whichever version you're targeting.

After installing, Xcode needs to pull down a few extra components (the simulator runtime, device support, license acceptance) before `xcodebuild` will actually work. Opening `/Applications/Xcode.app` once handles this interactively, or you can script it for a headless machine like a CI runner:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
sudo xcodebuild -runFirstLaunch
```

Verify both pieces landed correctly:

```bash
ls ~/Qt/6.11.0/ios/bin/qt-cmake
xcodebuild -version
xcodebuild -showsdks | grep iphoneos
```

**3. An Apple Developer account**, and only sometimes. Simulator builds need nothing at all; the simulator runs unsigned code directly on your Mac. Deploying to a real device needs a signing certificate and provisioning profile, which come from enrolling in the Apple Developer Program ($99/year), or from a free tier that allows limited device testing without App Store access. Either way, Xcode can manage the certificates automatically once you sign in under **Xcode → Settings → Accounts**.

One pleasant contrast with Android worth flagging here: on Android, system OpenSSL was removed years ago, so every app has to bundle its own TLS library by hand. On iOS, Apple's Security framework is always present, and Qt's iOS build uses Apple's native TLS implementation. HTTPS just works, with nothing extra to configure.

## The Asset Catalog

iOS requires app icons in a specific packaged format called an **asset catalog**: a directory with a defined structure that Xcode compiles into the `.app` bundle, containing every icon size the OS might need plus a `Contents.json` file mapping each size and scale to its PNG. A bare PNG icon file, the kind that works fine on desktop or Android, is not accepted here at all.

Apple wants a lot of sizes. iPhone needs 8 icons across four point sizes at 2x and 3x scale. iPad adds 9 more across five point sizes at 1x and 2x. The App Store itself needs one 1024x1024 marketing image. Eighteen files in total.

The fastest path is a generator like [appicon.co](https://appicon.co): upload a 512x512 source PNG, and it produces a ready-to-use `AppIcon.appiconset/` folder, `Contents.json` included, that you unzip directly into `ios/Assets.xcassets/`.

The command-line alternative uses `sips` (Scriptable Image Processing System, built into macOS with nothing to install), running one resize per required size:

```bash
mkdir -p ios/Assets.xcassets/AppIcon.appiconset &&
sips -z 40 40   assets/icons/squared-512.png --out ios/Assets.xcassets/AppIcon.appiconset/icon-20@2x.png &&
sips -z 60 60   assets/icons/squared-512.png --out ios/Assets.xcassets/AppIcon.appiconset/icon-20@3x.png &&
# ... 16 more sizes, one per line
sips -z 1024 1024 assets/icons/squared-512.png --out ios/Assets.xcassets/AppIcon.appiconset/icon-1024.png
```

If you go this route, you also write `Contents.json` by hand, mapping each PNG to its idiom, size, and scale so Xcode knows which file to reach for:

```json
{
  "images": [
    { "idiom": "iphone", "scale": "2x", "size": "20x20", "filename": "icon-20@2x.png" },
    { "idiom": "iphone", "scale": "3x", "size": "20x20", "filename": "icon-20@3x.png" },
    { "idiom": "ipad",   "scale": "1x", "size": "20x20", "filename": "icon-20@1x~ipad.png" },
    { "idiom": "ios-marketing", "scale": "1x", "size": "1024x1024", "filename": "icon-1024.png" }
  ],
  "info": { "author": "xcode", "version": 1 }
}
```

Once `ios/Assets.xcassets/AppIcon.appiconset/` holds all 18 PNGs and the JSON, the catalog is complete, and Xcode can compile the full icon set at build time.

## Wiring CMake for iOS

Two files change, same as the Android chapter: the root `CMakeLists.txt` and `src/CMakeLists.txt`.

In the root file, guard `find_package` the same way Android needed, since testing and DBus aren't available on mobile at all:

```cmake
if(ANDROID OR IOS)
    find_package(Qt6 REQUIRED COMPONENTS Quick QuickControls2 Network)
else()
    find_package(Qt6 REQUIRED COMPONENTS Quick QuickControls2 QuickTest Test Network)
    if(UNIX AND NOT APPLE)
        find_package(Qt6 REQUIRED COMPONENTS DBus)
    endif()
endif()
```

And skip the test subdirectory on iOS just like on Android:

```cmake
if(NOT ANDROID AND NOT IOS)
    enable_testing()
    add_subdirectory(tests)
endif()
```

In `src/CMakeLists.txt`, add an `if(IOS)` block:

```cmake
if(IOS)
    set_target_properties(Squared PROPERTIES
        MACOSX_BUNDLE TRUE
        MACOSX_BUNDLE_BUNDLE_NAME "Squared"
        MACOSX_BUNDLE_GUI_IDENTIFIER "com.squared.app"
        MACOSX_BUNDLE_BUNDLE_VERSION "${PROJECT_VERSION}"
        MACOSX_BUNDLE_SHORT_VERSION_STRING "${PROJECT_VERSION}"
        XCODE_ATTRIBUTE_TARGETED_DEVICE_FAMILY "1,2"
        XCODE_ATTRIBUTE_IPHONEOS_DEPLOYMENT_TARGET "16.0"
        XCODE_ATTRIBUTE_ASSETCATALOG_COMPILER_APPICON_NAME "AppIcon"
    )
    if(EXISTS "${CMAKE_SOURCE_DIR}/ios/Assets.xcassets")
        target_sources(Squared PRIVATE "${CMAKE_SOURCE_DIR}/ios/Assets.xcassets")
        set_source_files_properties("${CMAKE_SOURCE_DIR}/ios/Assets.xcassets"
            PROPERTIES MACOSX_PACKAGE_LOCATION Resources)
    endif()
    set_target_properties(Squared PROPERTIES
        XCODE_ATTRIBUTE_INFOPLIST_KEY_UILaunchScreen_Generation YES
    )
endif()
```

`MACOSX_BUNDLE TRUE` is the same CMake property macOS uses; iOS bundles reuse it. `TARGETED_DEVICE_FAMILY "1,2"` means both iPhone and iPad (`1` alone would mean iPhone only). `IPHONEOS_DEPLOYMENT_TARGET` sets the oldest iOS version the app supports; anyone older simply won't see the app on the App Store. `ASSETCATALOG_COMPILER_APPICON_NAME` tells Xcode which icon set from the catalog to actually use, and the `target_sources` block registers the asset catalog itself so Xcode compiles it into `Assets.car`, the single packed asset file that ends up in the finished bundle.

`INFOPLIST_KEY_UILaunchScreen_Generation` auto-generates a plain white launch screen (the placeholder screen shown while the app loads; Apple requires one for every app). Fine for development. For a real release, you'd design a `LaunchScreen.storyboard` in Xcode and swap this property for a reference to it:

```cmake
set_target_properties(Squared PROPERTIES
    XCODE_ATTRIBUTE_INFOPLIST_KEY_UILaunchScreen_File "LaunchScreen"
)
```

A quick sanity-check configure confirms everything parses:

```bash
~/Qt/6.11.0/ios/bin/qt-cmake -S . -B build-ios -G Xcode
```

Worth knowing now: by default this configures against the **device** SDK (`iphoneos`), not the simulator. If you followed this configure with a plain `cmake --build`, it would only succeed with a physical iPhone connected and trusted, because of how Xcode resolves a signing identity for a device target. The simulator build, which sidesteps all of that, comes next.

## Building for the Simulator

```bash
~/Qt/6.11.0/ios/bin/qt-cmake \
    -S . \
    -B build-ios-sim \
    -G Xcode \
    -DCMAKE_OSX_SYSROOT=iphonesimulator \
    -DQT_HOST_PATH=$HOME/Qt/6.11.0/macos
```

Two things stand out here. First, the generator: `-G Xcode`, not Ninja. On desktop, Ninja (or whatever CMake defaults to) is enough, because there's no code signing involved. On iOS, code signing, provisioning profiles, and entitlements are all things Xcode's own build system understands and Ninja simply doesn't. You could get away with Ninja for an unsigned simulator build, but the moment you need a real device or an IPA, you need Xcode, so using it from the start keeps the workflow consistent.

Second, `CMAKE_OSX_SYSROOT`. A **sysroot** ("system root") is a folder of headers and libraries describing a specific target platform, the blueprint the compiler reads while it works out what APIs exist and what kind of binary to produce. Apple ships two: `iphoneos` for real devices and `iphonesimulator` for the simulator. They aren't interchangeable, because a real iPhone runs ARM code while the simulator runs as a native process on your Mac's own CPU. `qt-cmake` defaults to `iphoneos`; overriding it to `iphonesimulator` here is what makes the resulting binary runnable in the simulator at all. `QT_HOST_PATH` plays the same role it did for Android: it points at the desktop Qt install so host-only tools like `moc`, `rcc`, and `qmlcachegen` can run on your Mac during the build, separate from the target libraries being linked into the app.

Build with Debug configuration, since on the simulator you're testing, not distributing:

```bash
cmake --build build-ios-sim --config Debug
```

The `.app` bundle lands at `build-ios-sim/src/Debug-iphonesimulator/Squared.app`.

Running it uses two tools that only exist on macOS: `xcrun` (Xcode Run, which locates and runs developer tools from whichever Xcode `xcode-select` currently points at) and `simctl` (Simulator Control, the tool that actually manages simulators: listing, booting, installing, launching). List what's available, boot one, open the Simulator app, then install and launch:

```bash
xcrun simctl list devices available
xcrun simctl boot "iPhone 15"
open -a Simulator

xcrun simctl install booted build-ios-sim/src/Debug-iphonesimulator/Squared.app
xcrun simctl launch booted com.squared.app
```

`booted` is a pseudo-identifier meaning "every simulator currently running." `com.squared.app` here is the bundle identifier, not the app's display name, and it has to match `MACOSX_BUNDLE_GUI_IDENTIFIER` from the CMake configuration exactly.

The simulator is fast for a reason worth understanding: it isn't emulating ARM hardware in software (which would be slow), it's running your app as a genuine native Mac process, made possible precisely because the `iphonesimulator` sysroot gave the compiler a Mac-compatible blueprint at build time. To stream the app's `qDebug()`, `qWarning()`, and QML `console.log()` output live into your terminal instead of the system log, add `--console-pty`:

```bash
xcrun simctl terminate booted com.squared.app
xcrun simctl launch --console-pty booted com.squared.app
```

## What's Actually Inside the .app Bundle

```
Squared.app/
├── Squared              (single binary)
├── Info.plist
├── Assets.car
├── PkgInfo
├── LaunchScreen.storyboardc
├── AppIcon60x60@2x.png
├── AppIcon76x76@2x~ipad.png
└── _CodeSignature/
```

`Squared` is the program itself, the file iOS runs when a user taps the icon. `Info.plist` is the bundle's ID card: bundle identifier, version, minimum supported iOS version, and other facts iOS reads both at install time and every subsequent launch. `.plist` files are Apple's XML-based property list format, usually stored in a compact binary encoding; `plutil -p` prints one in readable text:

```bash
plutil -p build-ios-sim/src/Debug-iphonesimulator/Squared.app/Info.plist
```

```text
{
  "CFBundleIdentifier" => "com.squared.app"
  "CFBundleVersion" => "0.1.0"
  "CFBundleShortVersionString" => "0.1.0"
  "MinimumOSVersion" => "16.0"
  "UILaunchStoryboardName" => "LaunchScreen"
}
```

`Assets.car` is the compiled asset catalog from earlier, all 18 icon sizes packed into a single file iOS can pull the right one from on demand. `PkgInfo` is an 8-byte relic from the old NeXT and classic Mac days that just says "this is an application"; modern iOS doesn't really need it, but Apple's tooling still writes one for backwards compatibility. `LaunchScreen.storyboardc` is the compiled launch screen (the `c` suffix marks it as compiled from a human-readable `.storyboard` source into a binary form iOS loads quickly).

`_CodeSignature/` is a folder of cryptographic hashes, one per file in the bundle. When iOS is asked to launch the app, it re-hashes every file and checks it against this folder; if anything's been modified since signing, it refuses to run. Even simulator builds carry this folder, signed with what's called an **ad-hoc signature**: enough to prove nothing's been tampered with, not tied to any real Apple developer certificate, and not enough to install on a real device or ship anywhere.

## Building for a Real Device and Signing

Configuring for actual hardware swaps the sysroot to `iphoneos` and adds two variables that bake a signing identity directly into the generated Xcode project:

```bash
~/Qt/6.11.0/ios/bin/qt-cmake \
    -S . \
    -B build-ios \
    -G Xcode \
    -DCMAKE_OSX_SYSROOT=iphoneos \
    -DCMAKE_XCODE_ATTRIBUTE_DEVELOPMENT_TEAM=ABCDE12345 \
    -DCMAKE_XCODE_ATTRIBUTE_CODE_SIGN_STYLE=Automatic \
    -DQT_HOST_PATH=$HOME/Qt/6.11.0/macos
```

`DEVELOPMENT_TEAM` tells Xcode which Apple account to sign under, identified by a 10-character **Team ID** unique to every developer account, free or paid. `CODE_SIGN_STYLE=Automatic` lets Xcode handle two pieces of paperwork on its own: a **signing certificate** (a cryptographic key Apple issued to your account, proving a build genuinely came from you) and a **provisioning profile** (a small file pairing that certificate with a specific bundle ID and list of authorized device UDIDs, essentially a permission slip saying who you are and what you're allowed to install where).

Find your Team ID with:

```bash
security find-identity -v -p codesigning
```

```text
1) 3EFD4C5F2A0F3850E7D8117F3A714D3743B71AA7 "Apple Development: name@example.com (ABCDE12345)"
```

There are two paths from here, and they diverge on what you get.

**Free Apple ID (Personal Team).** Adding any free Apple ID under **Xcode → Settings → Accounts** creates a Personal Team, and Xcode issues a free development certificate automatically. This is genuinely enough to run your own app on your own phone, but with real limits: the certificate expires after 7 days (the app stays installed, but refuses to launch until you rebuild and reinstall), there's no App Store path at all, no TestFlight (Apple's official beta-testing service, which lets you email an install link to up to 10,000 testers with no cable or Mac required on their end), and no access to paid-only entitlements like Push Notifications or iCloud sync.

```bash
cmake --build build-ios --config Debug -- -allowProvisioningUpdates
```

The `--` forwards everything after it straight to `xcodebuild`, and `-allowProvisioningUpdates` tells Xcode to register the connected device and generate a provisioning profile on the spot if one doesn't already exist.

**Apple Developer Program ($99/year).** Unlocks App Store and TestFlight distribution, a full year of certificate validity instead of 7 days, and paid-only entitlements. The configure command is identical; only the build configuration changes, to `Release`:

```bash
cmake --build build-ios --config Release -- -allowProvisioningUpdates
```

Either way, install with `xcrun devicectl` (which needs iOS 17+ and ships with Xcode 15; for older devices, `ios-deploy`, a third-party tool installable via `brew install ios-deploy`, fills the gap):

```bash
xcrun devicectl list devices
xcrun devicectl device install app --device <UDID> build-ios/src/Debug-iphoneos/Squared.app
```

Confirm the signature actually took, and that its certificate chain genuinely traces back to Apple, with `codesign`:

```bash
codesign -dv --verbose=4 build-ios/src/Debug-iphoneos/Squared.app
```

```text
Identifier=com.squared.app
Authority=Apple Development: our@email.com (ABCDE12345)
Authority=Apple Worldwide Developer Relations Certification Authority
Authority=Apple Root CA
TeamIdentifier=ABCDE12345
```

The three-line `Authority` chain running from your personal certificate up through Apple's own root CA is the structural piece worth checking; a Release build from a paid account shows `Apple Distribution:` on that first line instead of `Apple Development:`, which is the only meaningful difference between the two. `TeamIdentifier` should match what you passed at configure time, and `Identifier` should match your bundle ID exactly; a mismatch on either is the most common reason a device install fails outright.

## Packaging an IPA

An **IPA** (iOS App Store Package) is a plain ZIP file renamed to `.ipa`, containing a `Payload/` folder with the signed `.app` bundle plus some metadata. Anywhere iOS "installs an app," whether the App Store, TestFlight, or a direct enterprise link, an IPA is the thing actually moving across the wire. Producing one is two separate steps.

**Archive.** Xcode compiles in Release, signs the `.app`, and bundles it with debug symbols and metadata into an `.xcarchive`, an intermediate "master copy" that isn't itself distributable but holds everything needed to produce one:

```bash
mkdir -p dist/ios
xcodebuild -project build-ios/Squared.xcodeproj \
    -scheme Squared -configuration Release \
    -archivePath dist/ios/Squared.xcarchive \
    -destination 'generic/platform=iOS' \
    archive -allowProvisioningUpdates \
    DEVELOPMENT_TEAM=ABCDE12345
```

**Export.** Reads the archive and a small config file, `ExportOptions.plist`, that says which distribution channel to target, then produces the actual IPA:

```bash
xcodebuild -exportArchive \
    -archivePath dist/ios/Squared.xcarchive \
    -exportOptionsPlist ios/ExportOptions.plist \
    -exportPath dist/ios \
    -allowProvisioningUpdates
```

The `ExportOptions.plist` `method` key is what determines who can install the resulting IPA. Three values, three audiences:

```
   development              ad-hoc                  app-store
─────────────────────  ─────────────────────  ─────────────────────
Only devices you've    Up to 100 devices per   Anyone, once Apple
registered yourself.   type, per year, by      has approved the
                        UDID you add by hand.   submission.

Free (Personal Team     Requires paid           Requires paid
works fine).             Developer Program.       Developer Program.

Rebuild + reinstall     Send the .ipa file      Upload through App
on your own devices     directly (email,        Store Connect;
as you iterate.         AirDrop, a link).        Apple re-signs it.
```

The genuinely useful part: the same `.xcarchive` can produce all three IPAs. Change `method` in `ExportOptions.plist`, re-run the export, and Xcode picks a different provisioning profile against the exact same compiled code. Nothing gets rebuilt.

```xml
<!-- ios/ExportOptions.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>development</string>
    <key>teamID</key>
    <string>ABCDE12345</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>stripSwiftSymbols</key>
    <true/>
</dict>
</plist>
```

`signingStyle: automatic` lets Xcode pick the right certificate and profile itself, based on the team ID and method. `stripSwiftSymbols` trims Swift standard library symbols to reduce size; a pure C++/Qt app like this one has no Swift in it, so the flag is harmless to leave on.

## Publishing to the App Store

Two things need to be true before this step: a paid Apple Developer Program membership, and an IPA exported with `method = app-store`.

An important detail about what "uploading" even means here: the certificate that ends up on user devices is never the one you signed the IPA with. Apple verifies your upload came from your own distribution certificate, then re-signs the whole thing with Apple's own delivery certificate before it ever reaches a device. Two consequences follow directly from that. Your store listing's identity is tied to your Apple Developer account, not to a specific certificate file, so losing your certificate doesn't lock you out of your own app; Xcode issues a new one and the next upload goes out under the same listing. And your private signing key never leaves your machine at all; Apple never touches it, and neither does any user's device.

First, an app record has to exist in **App Store Connect** ([appstoreconnect.apple.com](https://appstoreconnect.apple.com)), Apple's developer dashboard, separate from the certificate-and-profile-focused Developer Portal. Creating one asks for a platform, a name (up to 30 characters), a primary language, and a bundle ID. The bundle ID has to match `MACOSX_BUNDLE_GUI_IDENTIFIER` from CMake exactly, and it **cannot be changed** once any build has been uploaded against it.

The single most common upload failure is a build number that hasn't strictly increased. `CFBundleVersion` (set via `MACOSX_BUNDLE_BUNDLE_VERSION` in CMake) is the build number Apple tracks per upload, and App Store Connect rejects anything less than or equal to a previous upload in that same app record, including builds that only ever went to TestFlight. `CFBundleShortVersionString` (`MACOSX_BUNDLE_SHORT_VERSION_STRING`) is the marketing version users actually see, and it's free to repeat across multiple uploads as long as the build number keeps climbing. Check both before uploading:

```bash
plutil -p dist/ios/Squared.xcarchive/Products/Applications/Squared.app/Info.plist \
    | grep -E "CFBundleVersion|CFBundleShortVersionString"
```

Uploading itself goes through **Transporter**, Apple's official upload tool, a free download from the Mac App Store that doesn't ship with macOS or Xcode by default:

```bash
open -a Transporter
```

Sign in, drag `dist/ios/Squared.ipa` into the window, click **Deliver**. Transporter validates the IPA, checks the build number against what's already on record, and pushes it to App Store Connect. Apple then runs its own processing pass on the binary, usually under 30 minutes, before the build becomes selectable anywhere in the dashboard.

From there, App Store Connect splits into two audiences worth understanding separately:

```
Internal testing ──► Closed testing ──► Open testing ──► Production
   (up to 100            (named             (public          (full
    team members,        testers by         opt-in via       App Store
    no review,            email link,        TestFlight,      listing,
    instant)              review opt.)       review req.)     review req.)
```

**TestFlight**, Apple's official beta channel, lets you push a build to internal team members (up to 100, no review, live immediately) or external testers (up to 10,000 by email link, gated behind a one-time Beta App Review on the first build of each new version). It's the natural place to land your first upload, since it puts the app on a real device without waiting on Apple's full review process.

**Distribution** (older accounts may still see it labelled App Store) is the public listing path. Before submission can happen, App Store Connect requires a complete set of listing assets: an app name and subtitle (30 characters each), a description (up to 4000 characters, though only the first ~250 show before the "more" fold), search keywords (up to 100 characters, never shown to users), a privacy policy URL (mandatory, no exceptions), and screenshots for every required device class (at least one, up to ten). The app icon itself needs no separate upload; it's pulled straight from the asset catalog already embedded in the IPA.

Once every field in the listing shows green, **Submit for Review** unlocks. Review checks that the app behaves the way the listing claims and clears Apple's technical bar (no private API usage, no crash on first launch), typically 1 to 2 days for an update, up to 7 for a brand-new app. Once approved, the release rolls out automatically, either to the public App Store or to whichever TestFlight audience you targeted.

## The Takeaway

Everything on this platform traces back to the same fact the first section opened with: Qt for iOS is static, and the operating system only trusts code it has personally verified end to end, from your certificate up through Apple's own root authority. That's why there's no separate library-bundling step (the linker already did it), why every build has to pass through Xcode's signing machinery rather than a plain compiler invocation, and why publishing runs through Apple's own re-signing infrastructure instead of a file you can just hand someone directly.

None of the individual pieces are exotic once you see how they connect. `qt-cmake` is still CMake, pointed at a different sysroot depending on whether you're targeting the simulator or a device. An `.xcarchive` is just a signed, reusable master copy, and an IPA is just that master copy repackaged for whichever audience `ExportOptions.plist` names. And Apple's review process is the same staged-rollout idea you'd recognize from any other platform's beta system, just with Apple sitting in the loop.

If you want to see this whole path built from scratch, alongside the same app shipped to Windows, Linux, macOS, Android, and embedded ARM, with a GitHub Actions pipeline tying it all together, I walk through it in my [Qt QML Cross-Platform Deployment course](/courses/qt-qml-deployment/). Nine chapters, one Qt QML application, every platform Qt supports.

Happy shipping!
