---
layout: post
title: "The Same Four Commands, Three Different Operating Systems: A Qt 6 Desktop Deployment Guide"
description: A complete guide to packaging and shipping a Qt 6 QML application on Windows, Linux, and macOS, showing how CMake makes the workflow nearly identical while each OS handles linking, packaging, and trust differently underneath.
date: '2026-08-22'
categories:
    - Qt 6
tags:
    - Qt 6
    - QML
    - Windows
    - Linux
    - macOS
    - Deployment
    - CMake
comments: true
sidebar: true
---

You have a Qt 6 QML application. It builds. It runs on your machine. Then you try to hand it to someone else, and it doesn't run on theirs. Not because your code is broken, because your binary is quietly depending on a pile of Qt shared libraries that only exist at a specific path on *your* computer, and every operating system has its own opinion about how a program is supposed to find those libraries, how it should be packaged for distribution, and whether it's allowed to run at all before someone vouches for it.

This post is a complete walk-through of that problem and its solution on Windows, Linux, and macOS, using **Squared**, a real Qt 6 QML app, as the running example, as part of my [Qt QML Cross-Platform Deployment course](/courses/qt-qml-deployment/). The interesting part isn't that the three platforms are different (they are), it's *how much of the workflow stays identical* once CMake is doing the driving. The same four commands, roughly, get you from source to a self-contained install on every platform. What changes underneath is the dynamic linker, the packaging format, and, on macOS, an entire trust system layered on top of everything else.

## The Starting Point

A fresh Qt Quick project from Qt Creator gives you three files: `CMakeLists.txt`, `main.cpp`, `Main.qml`. There's an install target, but it only installs your binary, not the Qt libraries or QML modules it depends on, and there's no packaging configuration and no app icons. Run `cmake --install` on that and hand the result to someone: the application won't start.

The app used throughout this guide, Squared, started from exactly that template. It builds and runs the same way everywhere:

```bash
cmake -G Ninja -B build-release -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_PREFIX_PATH=/opt/Qt/6.11.0/gcc_64   # path varies per OS
cmake --build build-release --parallel
./build-release/src/Squared
```

**Ninja** is the build tool CMake generates instructions for here; it's fast and used identically on all three platforms. `CMAKE_PREFIX_PATH` just points at wherever your Qt installation lives, and that's really the only per-OS detail in the command itself. It builds. It runs. Now: how does this get onto someone else's machine?

## Why It Runs Here But Not There

On every platform, the binary behaves fine from the build directory, and the reason is the same shape everywhere even though the mechanism differs. At link time, Qt bakes an absolute path into the binary pointing at its own library directory. Your development machine's dynamic linker (the OS component that loads shared libraries a running program depends on) follows that path automatically, so nothing looks broken until you move the binary somewhere that path doesn't exist, like a user's machine.

Each OS has its own name for this baked-in path, its own binary format, and its own inspection tools:

| | Windows | Linux | macOS |
|---|---|---|---|
| Binary format | PE (`.exe`, `.dll`) | ELF (no extension, `.so`) | Mach-O (no extension, `.dylib`) |
| "I need this library" | Import table entry | `DT_NEEDED` | `LC_LOAD_DYLIB` |
| "Search here for libraries" | `PATH` (runtime env) | `RUNPATH` | `LC_RPATH` |
| List dependencies | `dumpbin /DEPENDENTS` | `readelf -d` | `otool -L` |
| Dynamic linker | `ntdll.dll` | `ld.so` | `dyld` |

Windows is the outlier: it doesn't bake a library search path into the binary at all, which is why, as you'll see below, a Windows build genuinely fails the moment you copy it somewhere new, while Linux and macOS binaries still work right up until you deliberately strip the baked-in path to simulate a clean machine.

## Windows: DLLs, windeployqt, and the Hierarchical Layout

On Windows, Qt supports two compilers, MSVC (Microsoft's own) and MinGW (a bundled GCC for Windows), and the rule is that your compiler has to match whichever Qt variant you installed. MinGW ships directly with the Qt installer, so it's the path of least resistance and what this guide uses.

```bash
cmake -G Ninja -B build-manual -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_PREFIX_PATH=C:/Qt/6.10.1/mingw_64 \
    -DCMAKE_INSTALL_PREFIX=install \
    -DCMAKE_C_COMPILER=C:/Qt/Tools/mingw1310_64/bin/gcc.exe \
    -DCMAKE_CXX_COMPILER=C:/Qt/Tools/mingw1310_64/bin/g++.exe

cmake --build build-manual --target Squared --parallel
build-manual\Squared.exe
```

Run that last line, and nothing happens, or you get a dialog complaining about a missing DLL. Copy the `.exe` somewhere else and run it directly, and you get an explicit system error:

```
Squared.exe - System Error
The code execution cannot proceed because Qt6Core.dll was not found.
```

This happens because Windows' DLL loader searches, in order: the directory containing the executable, the system directories, then `PATH`. The Qt DLLs live somewhere like `C:\Qt\6.10.2\mingw_64\bin`, which is in none of those places on a clean machine. `objdump -p Squared.exe | findstr "DLL Name"` shows three groups of dependencies: the Qt DLLs, the MinGW runtime DLLs (`libgcc_s_seh-1.dll`, `libstdc++-6.dll`, `libwinpthread-1.dll`, the GCC runtime and C++ standard library MinGW needs, which don't appear at all if you build with MSVC instead), and Windows system DLLs that are always present and never your responsibility to ship.

Copying every missing DLL by hand next to the `.exe` works, but Qt ships a tool that automates it: **windeployqt**.

```bash
C:/Qt/6.10.1/mingw_64/bin/windeployqt.exe --release --qmldir qml --qmldir src/sdk/ui build-manual\Squared.exe
```

`--release` copies release DLLs rather than debug ones. `--qmldir` points it at your QML source directories so it can scan `import` statements and figure out which QML modules to bundle; pass one per QML source directory your project has. It runs in place, copying everything next to `Squared.exe`: Qt DLLs, the MinGW runtime, the platform plugin, and the QML modules. The binary now runs. This produces a **flat layout**, everything living in one directory next to the `.exe`, which works but isn't what CPack (the packaging tool used later) expects.

### cmake --install: The Hierarchical Layout

The cleaner path folds this into the CMake build itself, producing separate `bin\`, `plugins\`, and `qml\` subdirectories instead of one flat pile. This is also the layout Linux and macOS use, so it's worth introducing here as the pattern the rest of this guide builds on:

```cmake
install(TARGETS Squared
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)

qt_generate_deploy_qml_app_script(
    TARGET Squared
    OUTPUT_SCRIPT deploy_script
    NO_UNSUPPORTED_PLATFORM_ERROR
)
install(SCRIPT ${deploy_script})
```

`install(TARGETS ...)` puts the binary in `bin\`. `qt_generate_deploy_qml_app_script` doesn't run anything at configure time, it generates a CMake script that runs later, at *install* time. On Windows, that generated script calls `windeployqt` internally, but with different flags than you'd use by hand, ones that produce the hierarchical layout instead of the flat one.

```bash
cmake --install build-manual
```

The result: `bin\`, `plugins\`, `qml\`, and `translations\`, with `bin\` holding `Squared.exe`, every Qt DLL, the MinGW runtime, and a small text file called `qt.conf`:

```ini
[Paths]
Prefix = ..
```

One line. The executable sits in `bin\`, and `Prefix = ..` goes one level up to the install root, from which Qt finds `plugins\` and `qml\` at the top level automatically. This exact mechanism, a `qt.conf` with a relative `Prefix`, is what Linux and macOS deployments use too; only the surrounding directory names differ. Run `install\bin\Squared.exe` and everything it needs is self-contained inside `install\`, no dependency on the original Qt installation directory.

### Packaging: NSIS and ZIP

With a clean install tree, packaging is CPack's job, CMake's built-in packaging tool, configured entirely inside `CMakeLists.txt`:

```cmake
elseif(WIN32)
    set(CPACK_PACKAGE_NAME "Squared")
    set(CPACK_PACKAGE_INSTALL_DIRECTORY "Squared")
    set(CPACK_PACKAGE_EXECUTABLES "Squared;Squared")
    set(CPACK_GENERATOR "NSIS;ZIP")
    set(CPACK_NSIS_DISPLAY_NAME "Squared")
    set(CPACK_NSIS_MUI_ICON "${CMAKE_SOURCE_DIR}/assets/icons/squared.ico")
    set(CPACK_NSIS_ENABLE_UNINSTALL_BEFORE_INSTALL ON)
    set(CPACK_NSIS_CREATE_ICONS_EXTRA
        "CreateShortCut '$SMPROGRAMS\\\\$STARTMENU_FOLDER\\\\Squared.lnk' '$INSTDIR\\\\bin\\\\Squared.exe'
         CreateShortCut '$DESKTOP\\\\Squared.lnk' '$INSTDIR\\\\bin\\\\Squared.exe'")
endif()
```

**NSIS** (Nullsoft Scriptable Install System) is the open-source installer framework most Windows open-source projects use, and CPack has native support for it. `CPACK_NSIS_CREATE_ICONS_EXTRA` is raw NSIS script that runs post-install, using NSIS's own built-in path variables (`$SMPROGRAMS` for the Start Menu folder, `$DESKTOP`, `$INSTDIR` for wherever the user chose to install) to create Start Menu and Desktop shortcuts. The four backslashes in the shortcut paths are needed because CMake processes the string once and NSIS processes it again; each processing pass consumes one pair.

```bash
cd build-manual
cpack -G NSIS
```

This needs NSIS installed (`choco install nsis` or from `nsis.sourceforge.io`). CPack generates the NSIS script, runs the NSIS compiler, and produces a `.exe` installer with a wizard, your icon, and working shortcuts, and it shows up correctly in Add or Remove Programs with a functioning uninstaller.

Since `CPACK_GENERATOR` already lists both formats, the second format is one command:

```bash
cpack -G ZIP
```

The ZIP contains the identical install tree, just without the installer wrapping it. NSIS is for end users who expect a wizard and Start Menu integration; ZIP is for portable distribution, CI pipelines, or anywhere running an installer isn't practical, the direct Windows equivalent of a Linux tar.gz.

## Linux: RUNPATH, linuxdeploy, and Three Formats

Linux starts differently, because unlike Windows, the binary *does* run when you just copy it around, at first:

```bash
cmake -G Ninja -B build-release -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_PREFIX_PATH=/opt/Qt/6.11.0/gcc_64
cmake --build build-release --parallel
./build-release/src/Squared
```

It runs immediately, no setup. The reason is **RUNPATH**, an absolute path Qt bakes directly into the ELF binary at link time. Two Linux tools make this visible: `readelf`, which reads what's literally written in the binary file, and `ldd`, which simulates the dynamic linker's actual runtime search and reports what it would resolve, or fail to resolve.

```bash
readelf -d build-release/src/Squared | grep RUNPATH
# Library runpath: [/opt/Qt/6.11.0/gcc_64/lib]

ldd build-release/src/Squared
# libQt6Core.so.6 => /opt/Qt/6.11.0/gcc_64/lib/libQt6Core.so.6
```

That RUNPATH only means anything on *this* machine, because it only exists because Qt happens to be installed at that exact path here. Move the binary anywhere else, and it's pointing at nothing.

### Simulating a Clean Machine

To see the actual failure, strip the RUNPATH deliberately with `chrpath` and try again:

```bash
chrpath -d ./Squared
./Squared
```

```
error while loading shared libraries:
libQt6QuickControls2.so.6: cannot open shared object file: No such file or directory
```

The Linux dynamic linker's search order is: RPATH baked into the binary, then `LD_LIBRARY_PATH`, then RUNPATH, then the system cache, then default system paths. With the RUNPATH gone and Qt sitting at a non-standard `/opt/Qt/` location, none of those find anything.

Copying the missing libraries by hand surfaces a subtlety worth knowing: `ldd` run *before* you copy anything reports what the *system's* older Qt would resolve, which understates the real dependency tree. Once you copy in your actual Qt 6.11 libraries and re-run `ldd`, it reveals a second round of **transitive dependencies**, dependencies of your dependencies that only become visible once the correct libraries are actually loaded. And critically, plain `.so` copying alone isn't enough: Qt's platform plugin (the piece connecting Qt to the display system, X11 or Wayland) isn't a regular ELF dependency at all, `ldd` is blind to it entirely, because it's loaded by Qt's own separate plugin system. Same story for QML modules, which the QML engine locates through its own import path mechanism, untouched by both `ldd` and the plugin system. Getting a manually-deployed app running from scratch needs four separate environment variables in the end: `LD_LIBRARY_PATH`, `QT_PLUGIN_PATH`, `QML_IMPORT_PATH`, and `QT_QPA_PLATFORM`.

### qt.conf: Collapsing the Environment Variables

The same `qt.conf` mechanism from Windows applies here, cutting the Qt-specific variables down to just the dynamic linker's own `LD_LIBRARY_PATH` (which `qt.conf` can't help with, since the linker is a separate system that never reads it):

```ini
[Paths]
Prefix = .
Plugins = plugins
QmlImports = qml
Libraries = lib
```

```
┌─────────────────────────────────────────┐
│  Qt application startup                 │
│                                         │
│  1. ld-linux loads the binary           │
│     reads RUNPATH / LD_LIBRARY_PATH     │
│     finds libQt6Core.so.6, etc.         │
│                                         │
│  2. Qt initialises                      │
│     reads qt.conf                       │
│     finds plugins/ and qml/             │
│                                         │
│  qt.conf only affects step 2.           │
│  The linker in step 1 ignores it.       │
└─────────────────────────────────────────┘
```

The last environment variable disappears by rewriting the binary's RUNPATH to use `$ORIGIN`, a special token the dynamic linker expands to "the directory this binary actually lives in right now." `$ORIGIN/../lib` means "look in `lib/` one level up from wherever I am," with no absolute paths and no environment variables needed, and this is exactly what `cmake --install` does automatically.

### linuxdeploy: Windows' windeployqt, Linux's Way

Before wiring deployment into CMake, it's worth seeing the standalone automation tool, the Linux counterpart to `windeployqt`: **linuxdeploy**, a self-contained downloadable binary with a companion Qt plugin, `linuxdeploy-plugin-qt`, that handles QML scanning and platform plugin bundling.

```bash
QML_SOURCES_PATHS=qml:src/sdk/ui QMAKE=/opt/Qt/6.11.0/gcc_64/bin/qmake \
    ~/tools/linuxdeploy-x86_64.AppImage \
    --appdir AppDir --executable AppDir/usr/bin/Squared --plugin qt
```

linuxdeploy works against an **AppDir**, a directory following a `usr/` prefix convention (your binary in `usr/bin/`, and everything else gets filled in from there). `QML_SOURCES_PATHS` is the Linux equivalent of `windeployqt`'s `--qmldir`. `--plugin qt` activates the Qt-specific plugin, which scans for QML imports, copies Qt plugins, and patches RPATH to `$ORIGIN`-relative paths, all automatically.

### cmake --install: The CMake-Native Path

Same pattern as Windows, folded into `src/CMakeLists.txt`:

```cmake
install(TARGETS Squared
    BUNDLE  DESTINATION .
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)

qt_generate_deploy_qml_app_script(
    TARGET Squared
    OUTPUT_SCRIPT deploy_script
    NO_UNSUPPORTED_PLATFORM_ERROR
)
install(SCRIPT ${deploy_script})
```

This is *the exact same CMake* as the Windows version, down to the line. (`BUNDLE DESTINATION .` is a macOS-only concern that's simply ignored here.) `qt_generate_deploy_qml_app_script` does four things at install time: scans QML files and copies the modules they use, copies Qt's shared libraries into `lib/`, generates `qt.conf`, and rewrites RPATH on the binary and every copied library to `$ORIGIN`-relative paths.

```bash
cmake --install build-release
```

`readelf -d install/bin/Squared | grep RUNPATH` now shows `$ORIGIN` and `$ORIGIN/../lib`, and `ldd` resolves every Qt library to `install/lib/`. Run it: no environment variables, no Qt installation required, fully self-contained.

One optimization worth doing before packaging: Qt's deploy script copies *every* Quick Controls style (Basic, Fusion, Material, Imagine, FluentWinUI3, Universal), but an app importing only `Basic` never loads the rest. They're dead weight, safely removed:

```bash
rm -rf qml/QtQuick/Controls/{Material,Imagine,Fusion,FluentWinUI3,Universal}
rm -f lib/libQt6QuickControls2{Material,Imagine,Fusion,FluentWinUI3,Universal}*
rm -rf plugins/qmltooling plugins/egldeviceintegrations
```

This `install/` directory is the shared foundation every packaging format below starts from.

### FreeDesktop Metadata: .desktop and Icons

Before packaging, Linux desktop environments expect two things unrelated to Qt or CMake entirely: a `.desktop` file (a plain INI-format text file naming the app, how to launch it, and which icon to use) and icons following the FreeDesktop hicolor theme layout, a fixed directory tree keyed by icon size:

```ini
[Desktop Entry]
Type=Application
Name=Squared
Exec=Squared
Icon=com.squared.app
Categories=Development;
```

The `Icon` field is a reverse-DNS name with no file extension, resolved by the desktop environment searching the hicolor tree for a matching PNG. Generating all eight required sizes from one 512x512 source is one loop with ImageMagick:

```bash
for size in 16 24 32 48 64 128 256 512; do
    mkdir -p linux/icons/hicolor/${size}x${size}/apps
    convert assets/icons/squared-512.png -resize ${size}x${size} \
        linux/icons/hicolor/${size}x${size}/apps/com.squared.app.png
done
```

Run once, commit the results, done. Both packaging formats below need them.

### Three Formats: AppImage, DEB, tar.gz

**AppImage** is a single executable file containing the entire application, built on SquashFS (a read-only compressed filesystem baked into the Linux kernel since 2010) mounted at runtime via **FUSE** (Filesystem in Userspace). The user experience is about as minimal as it gets: download, `chmod +x`, run, no installation, no root.

```bash
~/tools/linuxdeploy-x86_64.AppImage \
    --appdir AppDir \
    --executable AppDir/usr/bin/Squared \
    --desktop-file AppDir/usr/share/applications/com.squared.app.desktop \
    --icon-file linux/icons/hicolor/256x256/apps/com.squared.app.png \
    --output appimage
```

`linuxdeploy` scans all ELF binaries to build a full dependency graph, copies anything missing, patches every RPATH to `$ORIGIN`-relative, generates an `AppRun` entry-point script, then compresses the whole AppDir into SquashFS with a small runtime stub in front. One important gotcha: `linuxdeploy` is itself distributed as an AppImage, and inside a Docker container or CI runner, FUSE mounting is typically blocked by reduced kernel capabilities. The fix is `--appimage-extract` to unpack it into a plain directory and run its `AppRun` script directly, bypassing FUSE entirely; the resulting AppImage is identical either way.

**DEB** is the native package format for Debian, Ubuntu, and derivatives, installed with `apt` or `dpkg`, and it's CPack-driven, using the same install rules already in place:

```cmake
if(UNIX AND NOT APPLE)
    set(CPACK_GENERATOR "DEB;TGZ")
    set(CPACK_DEBIAN_PACKAGE_MAINTAINER "Squared <hello@squared.dev>")
    set(CPACK_DEBIAN_PACKAGE_SHLIBDEPS OFF)
    set(CPACK_DEBIAN_PACKAGE_DEPENDS
        "libxcb1, libxkbcommon0, libgl1, libegl1, libfontconfig1, libdbus-1-3")
endif()
```

`CPACK_DEBIAN_PACKAGE_SHLIBDEPS OFF` matters specifically because this app bundles its own Qt: with shlibdeps left on, CPack would run `dpkg-shlibdeps` and declare a dependency on the *system's* Qt packages, exactly wrong when you're shipping your own copy. Instead, the dependency list names only the low-level system libraries the bundled Qt itself needs underneath.

```bash
cd build-release && cpack -G DEB
sudo apt install ./squared-0.1.0-Linux.deb
```

Installing through `apt` rather than `dpkg -i` lets it automatically pull in anything from the `Depends` field, and the result integrates properly: it appears in the application launcher, and `sudo apt remove squared` (or `purge`, to also clear config files) cleanly uninstalls it.

**tar.gz** is the simplest format, no tooling, no runtime, no package manager, just the install tree compressed:

```bash
cpack -G TGZ
# or
tar czf squared-linux_amd64.tar.gz -C install .
```

Extract anywhere and run; the `$ORIGIN`-based RUNPATH means it just works, no environment variables. Each format serves a distinct audience: AppImage for end users who want single-file simplicity, DEB for system administrators who want proper package-manager integration, tar.gz for developers, CI pipelines, and embedded targets that need nothing but a compressed archive.

## macOS: Frameworks, App Bundles, and a Trust System

macOS shares the same underlying shape (linker path baked into the binary, tools to inspect it, a manual-copy exercise, then automation, then packaging) but adds a fourth layer none of the other platforms have: nothing you ship publicly works until Apple has personally vouched for it.

Building and running is the same pattern as always:

```bash
cmake -G Ninja -B build-release -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_PREFIX_PATH=$HOME/Qt/6.11.0/macos -DCMAKE_INSTALL_PREFIX=install
cmake --build build-release --parallel
./build-release/src/Squared
```

It runs, because Qt bakes path information into the compiled binary here too, macOS's version being an `LC_RPATH` load command inside the **Mach-O** binary format (macOS's equivalent of ELF or PE). The inspection tool is `otool`: `otool -L` lists dependencies (comparable to `ldd` or `dumpbin /DEPENDENTS`), and `otool -l` dumps the full load command table, including the `LC_RPATH` entries `-L` doesn't show. Since macOS has no direct `ldd` equivalent for confirming what actually loaded at runtime, `DYLD_PRINT_LIBRARIES=1` fills that gap by having `dyld` (the dynamic linker) print every library it resolves as the app runs.

### Three Path Variables

Before copying anything, macOS's linking model needs three special path tokens explained up front, because they show up constantly:

| Variable | Resolves to |
|---|---|
| `@executable_path` | Directory of the main app binary |
| `@loader_path` | Directory of the binary containing the load command |
| `@rpath` | Searched against the list of `LC_RPATH` entries in the loading binary |

`@loader_path` is the true equivalent of Linux's `$ORIGIN`: it resolves relative to whichever binary actually contains the reference, not necessarily the main executable, which is how Qt frameworks reference each other internally. `@rpath` is a placeholder resolved against whatever `LC_RPATH` entries exist in the binary doing the loading. A properly deployed app chains these together: the main binary has `LC_RPATH = @executable_path/../Frameworks`, each Qt framework is linked as `@rpath/Foo.framework/...`, and `dyld` resolves the `@rpath` reference through that RPATH straight to `Contents/Frameworks/`.

### Manually Assembling a Bundle

Stripping the RPATH with `install_name_tool -delete_rpath` and copying the binary elsewhere reproduces the same failure seen on Linux and Windows, `Library not loaded`, `dyld` unable to resolve any `@rpath/...` reference with no RPATHs left. Rebuilding it by hand starts with the `.app` bundle shape itself:

```bash
mkdir -p Squared.app/Contents/MacOS
mv Squared Squared.app/Contents/MacOS/
mkdir -p Squared.app/Contents/Frameworks
cp -R $HOME/Qt/6.11.0/macos/lib/QtCore.framework Squared.app/Contents/Frameworks/
# ...repeated for QtGui, QtQuick, QtQml, and roughly 15 more
```

Two details matter here that don't come up on the other platforms. First, Qt ships as **frameworks** on macOS, directory bundles containing the dylib, headers, and metadata together, not flat `.so`/`.dll` files, so copying has to use `cp -R` to preserve the internal symlink structure; a plain `cp` follows the symlinks and silently breaks the framework. Second, adding the RPATH doesn't happen automatically:

```bash
install_name_tool -add_rpath @executable_path/../Frameworks \
    Squared.app/Contents/MacOS/Squared
```

From there it's the same layered discovery as Linux: frameworks resolve, but the platform plugin (`libqcocoa.dylib`, the macOS analog of `libqxcb.so`, connecting Qt to AppKit, the native windowing system) is invisible to `otool -L` the same way Linux's platform plugin was invisible to `ldd`, needing its own `QT_PLUGIN_PATH`. QML modules need their own path too. Getting a hand-built bundle running needs both variables set at launch, same shape as the four-variable Linux exercise, just macOS's names for the same problem.

### qt.conf, Same Idea, Different Layout

```ini
[Paths]
Prefix = ..
Plugins = PlugIns
QmlImports = Resources/qml
```

Placed in `Contents/Resources/qt.conf`, `Prefix = ..` resolves up to `Contents/`, exactly the same relative-prefix trick used on both other platforms, just with macOS's own subdirectory names.

### macdeployqt: The Automation Tool

The manual exercise mirrors the Windows/`windeployqt` and Linux/`linuxdeploy` pattern precisely, and macOS's own tool is **macdeployqt**:

```bash
$HOME/Qt/6.11.0/macos/bin/macdeployqt build-manual/src/Squared.app \
    -qmldir=qml -qmldir=src/sdk/ui
```

It requires `MACOSX_BUNDLE TRUE` set on the CMake target first, so the build actually produces a `.app` rather than a bare executable. `-qmldir` is the same idea as `windeployqt`'s and `linuxdeploy`'s equivalent flags. In one command it does everything the manual walkthrough above did by hand: copies frameworks into `Contents/Frameworks/`, plugins into `Contents/PlugIns/`, QML modules into `Contents/Resources/qml/`, rewrites install names to `@rpath`-relative paths with `install_name_tool`, adds the `LC_RPATH`, and generates `qt.conf`.

### cmake --install: The Same CMake, Again

```cmake
if(APPLE AND NOT ANDROID)
    set_target_properties(Squared PROPERTIES
        MACOSX_BUNDLE TRUE
        MACOSX_BUNDLE_ICON_FILE squared.icns
        MACOSX_BUNDLE_GUI_IDENTIFIER "com.squared.app"
        MACOSX_BUNDLE_BUNDLE_VERSION "${PROJECT_VERSION}"
    )
endif()

install(TARGETS Squared
    BUNDLE  DESTINATION .
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)

qt_generate_deploy_qml_app_script(
    TARGET Squared
    OUTPUT_SCRIPT deploy_script
    NO_UNSUPPORTED_PLATFORM_ERROR
)
install(SCRIPT ${deploy_script})
```

The `install()` and `qt_generate_deploy_qml_app_script()` block is identical, word for word, to the Windows and Linux versions. `BUNDLE DESTINATION .` is what actually triggers `.app` packaging here (ignored on Linux); everything else is the platform-agnostic core this whole guide keeps returning to. The `MACOSX_BUNDLE_*` properties map directly onto keys in `Info.plist`, the bundle metadata file macOS reads at every launch, and macOS's icon format is `.icns` rather than `.ico` or `.png`, built from a source PNG with two built-in tools, `sips` for resizing and `iconutil` for packaging into the final `.icns`.

```bash
cmake --install build-release
```

`otool -l install/Squared.app/Contents/MacOS/Squared | grep -A2 LC_RPATH` now shows `@executable_path/../Frameworks`, portable no matter where the bundle moves. The resulting layout maps cleanly onto the same four layers seen on every other platform, just under different names:

| macOS | Linux |
|---|---|
| `Contents/MacOS/Squared` | `bin/Squared` |
| `Contents/Frameworks/` | `lib/` |
| `Contents/PlugIns/` | `plugins/` |
| `Contents/Resources/qml/` | `qml/` |

Finder shows `Squared.app` as one clickable icon, hiding the directory tree entirely (right-click → Show Package Contents reveals it), which is exactly why everything has to live inside `Contents/`.

### Two Formats: DMG and tar.gz

**DMG** is the standard macOS distribution format outside the App Store, a disk image that mounts as a virtual drive when double-clicked, showing the `.app` for the user to drag into Applications. `hdiutil`, which ships with macOS, builds one directly:

```bash
hdiutil create -volname "Squared" -srcfolder install/Squared.app \
    -ov -format UDZO dist/macos/Squared-0.1.0.dmg
```

`-format UDZO` is compressed and read-only, the standard distribution format. CPack has a built-in generator producing the identical result as part of the normal build pipeline instead of a separate command:

```cmake
elseif(APPLE AND NOT IOS)
    set(CPACK_GENERATOR "DragNDrop")
    set(CPACK_DMG_VOLUME_NAME "Squared")
endif()
```

```bash
cpack -G DragNDrop
```

**tar.gz** rounds out the set, for CI pipelines, headless build machines, and anywhere mounting a disk image isn't convenient:

```bash
tar czf squared-macos_arm64.tar.gz -C install Squared.app
```

Note this archives `Squared.app` specifically rather than the whole `install/` directory, since on macOS the entire application already lives inside that one bundle.

### Code Signing: A Fourth Layer the Other Platforms Don't Have

This is where macOS genuinely diverges from Windows and Linux, not in packaging mechanics, but in trust. An unsigned app downloaded from the internet triggers **Gatekeeper**, macOS's built-in gatekeeping system, refusing to launch anything from an "unidentified developer."

Signing, with `codesign` (which ships with Xcode Command Line Tools), does three things: hashes the entire bundle contents, encrypts that hash with your private key to produce a signature, and embeds the signature directly inside the bundle. Verification reverses it: Gatekeeper reads the embedded signature, extracts the public key from the also-embedded certificate, decrypts to recover the original hash, independently re-hashes the current contents, and compares. Modify a single byte of a signed app afterward, and the hashes no longer match.

Signing identities live in the **Keychain** (comparable to the Windows Certificate Store or a Linux GPG keyring), always as a matched pair of a locally-generated private key and an Apple-issued certificate. And unlike Linux (sign with your own GPG key, distribute it however) or Windows (buy a certificate from any commercial CA), **Apple is the only trusted certificate authority for macOS app signing**, full stop. Getting a real identity means generating a keypair locally via Keychain Access, submitting a Certificate Signing Request to Apple's developer portal, and installing the certificate Apple signs and returns.

```
Apple Root CA
    │
    └── Developer ID Certification Authority
            │
            └── Developer ID Application: Your Name (AB12CD34EF)
                        │
                        └── Signature embedded in Squared.app
```

There are two tiers. **Ad-hoc signing**, free and requiring no Apple account at all, uses a literal dash as the identity:

```bash
codesign --force --deep --sign "-" install/Squared.app
```

`--deep` recurses into the bundle, signing every nested framework and binary. Ad-hoc signed apps still trigger Gatekeeper warnings when downloaded from the internet; they're fine for local testing, not for public distribution. **Developer ID signing** requires the paid Apple Developer Program ($99/year) and produces something Gatekeeper will eventually trust fully:

```bash
codesign --force --deep \
    --sign "Developer ID Application: Your Name (AB12CD34EF)" \
    install/Squared.app
```

Verification (`codesign --verify --verbose`) only confirms the app hasn't been tampered with since signing, not whether Gatekeeper will actually accept it; `codesign -dv --verbose=4` shows the real authority chain for that. Signing order matters strictly: `cmake --install` first to assemble the complete bundle, any `install_name_tool` patching next (which invalidates any prior signature and requires re-signing), then `codesign` on the fully assembled `.app`, then packaging into a DMG, then a separate `codesign` pass on the DMG container itself, since Gatekeeper checks the container independently from what's inside it. Ad-hoc signing specifically does not work on DMGs; the container needs a real Developer ID regardless of how the `.app` inside was signed.

### Notarization: The Step Nothing Else Requires

Signing proves the app came from you and hasn't been altered. **Notarization** is Apple actually scanning it and issuing a ticket Gatekeeper checks before allowing the app to run with zero warnings, mandatory for all Developer ID-signed software distributed outside the App Store since macOS 10.15.

The tool is `notarytool`, authenticated with an app-specific password (never your real Apple ID password) stored once in the Keychain under a profile name:

```bash
xcrun notarytool store-credentials "AC_PASSWORD" \
    --apple-id your@email.com --team-id AB12CD34EF --password xxxx-xxxx-xxxx-xxxx
```

Submission requires signing with two additional flags beyond ordinary Developer ID signing: `--options runtime` (the hardened runtime, a security mode blocking unsigned library loading and memory injection, mandatory for notarization) and `--timestamp` (a trusted timestamp from Apple's own server, so the signature stays provably valid even after the certificate eventually expires). Apple's submission API takes a ZIP, not a raw bundle, and specifically **not** one made with plain `zip`, which silently drops symlinks and extended attributes bundles rely on; `ditto`, macOS's own archiving tool, handles it correctly:

```bash
codesign --force --deep --options runtime --timestamp \
    --sign "Developer ID Application: Your Name (AB12CD34EF)" install/Squared.app

ditto -c -k --keepParent install/Squared.app Squared.zip
xcrun notarytool submit Squared.zip --keychain-profile "AC_PASSWORD" --wait
```

`--wait` polls Apple until the scan finishes, typically a few minutes. On success, the ticket needs stapling directly onto the bundle:

```bash
xcrun stapler staple install/Squared.app
```

Without stapling, Gatekeeper has to contact Apple's servers on every single launch to verify the ticket, meaning the app won't open offline. Stapling embeds it as local metadata instead, verified entirely on-device afterward. The same ticket, notably, covers both the `.app` and any DMG built from it; `stapler` looks up the ticket from Apple's CDN by the bundle's code hash, no second submission required, so packaging into a DMG after stapling and then signing and stapling the DMG container separately completes the pipeline:

```bash
hdiutil create -volname "Squared" -srcfolder install/Squared.app -ov -format UDZO Squared-0.1.0.dmg
codesign --force --sign "Developer ID Application: Your Name (AB12CD34EF)" Squared-0.1.0.dmg
xcrun stapler staple Squared-0.1.0.dmg
```

A user who downloads and double-clicks the result gets no Gatekeeper warning at all; macOS checks the stapled ticket locally.

## What's Actually the Same, and What Isn't

Stepping back across all three platforms, the pattern that emerges is worth stating plainly, since it's the whole point of structuring the course this way:

```
                    Windows        Linux          macOS
                    ───────        ─────          ─────
configure           cmake -G Ninja -DCMAKE_PREFIX_PATH=... (identical)
build                        cmake --build ... --parallel  (identical)
install       install(TARGETS...) + qt_generate_deploy_qml_app_script()
                                                    (identical CMake block)
                    │              │                │
                    ▼              ▼                ▼
              bin\ plugins\   bin/ lib/        Contents/MacOS
              qml\            plugins/ qml/    Contents/Frameworks
                                                Contents/PlugIns
                                                Contents/Resources/qml

linker path      (none baked      RUNPATH         LC_RPATH
                   in by default)  ($ORIGIN)       (@executable_path)

package        NSIS / ZIP     AppImage / DEB   DMG / tar.gz
                (CPack)       / tar.gz (CPack)  (CPack / hdiutil)

trust model     none built in  none built in   Gatekeeper +
                                                Developer ID +
                                                notarization
```

The `cmake --install` step, the actual `install()` and `qt_generate_deploy_qml_app_script()` CMake block, is *identical* across all three platforms, down to the exact lines. That's not a coincidence; it's the entire reason to reach for it instead of hand-copying libraries or scripting `windeployqt`/`linuxdeploy`/`macdeployqt` separately for each OS. What differs is everything CMake is abstracting away underneath: the shape of the linker's search path, the name and internal layout of the packaging format, and, on macOS only, an entire signing and notarization system with no equivalent anywhere else in this guide.

## The Takeaway

Every platform in this guide follows the same three-act structure: the binary runs from the build directory because of a path baked in at link time that only exists on your machine; stripping that path and trying to run the binary elsewhere reproduces exactly the failure a real user would see; and the fix is always the same shape, find the missing pieces (shared libraries, platform plugin, QML modules), copy them into a self-contained tree, and rewrite the binary's search path to be relative instead of absolute. Windows calls that mechanism DLL search order and windeployqt. Linux calls it RUNPATH and linuxdeploy. macOS calls it `LC_RPATH` and macdeployqt, and then adds Gatekeeper on top because Apple, uniquely among the three, insists on personally vouching for anything that runs on its hardware.

None of it is exotic once you've seen it built by hand once per platform, and `cmake --install` with Qt's deploy script means you rarely have to build it by hand again: the same CMake block, the same four commands, three different sets of plumbing underneath, one consistent workflow on top.

If you want to see this entire pipeline built from scratch, step by step, alongside the same app shipped further still to Android, iOS, and embedded ARM, with a GitHub Actions pipeline tying every platform together behind one `git tag`, I walk through the whole thing in my [Qt QML Cross-Platform Deployment course](/courses/qt-qml-deployment/). Nine chapters, one Qt QML application, every platform Qt supports.

Happy shipping!
