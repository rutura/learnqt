---
layout: post
title: "Ship Qt on Three Platforms With One Git Tag: A GitHub Actions Pipeline for Qt 6"
description: A practical walkthrough of building a real GitHub Actions CI/CD pipeline that packages a Qt 6 QML app for Linux, macOS, and Windows from a single tag push.
date: '2026-08-22'
categories:
    - Qt 6
tags:
    - Qt 6
    - QML
    - CI/CD
    - GitHub Actions
    - Deployment
comments: true
sidebar: true
---

If you've been following along with the deployment side of Qt development, you know the drill by now: `cmake --install`, then `linuxdeploy` or `macdeployqt` or `cpack`, run by hand, on your machine, one platform at a time. It works. It also means every release depends on you remembering the right sequence of commands, having access to a Linux box, a Mac, and a Windows machine, and doing the whole thing again for the next version.

This post walks through replacing that with a GitHub Actions pipeline that does it for you. Push a tag like `host-v1.2.0`, and a few minutes later there's a GitHub Release with a Linux AppImage, a DEB, a tar.gz, a macOS tar.gz for both Apple Silicon and Intel, a Windows ZIP, and a Windows installer — seven artifacts, three platforms, zero terminals opened on any of them.

This is the pipeline built for **Squared**, a real cross-platform Qt 6 QML app, as part of my [Qt QML Cross-Platform Deployment course](/courses/qt-qml-deployment/). Everything below is the actual workflow file, not a simplified example.

## What CI/CD Actually Is

"CI/CD" gets thrown around a lot, so let's strip the acronym down. It stands for **Continuous Integration / Continuous Delivery**. Instead of a person manually building and packaging software, a server does it automatically, the same way, every time, triggered by something you did anyway — like pushing code. "Continuous Integration" is the automatic building-and-testing half. "Continuous Delivery" is the automatic packaging-for-release half. This post is really about the CD side: we already know the app builds, we want it *packaged and published* without touching a keyboard on three different computers.

We're using **GitHub Actions** because Squared's code already lives on GitHub. Other CI providers exist — Jenkins, CircleCI, GitLab CI — but GitHub Actions is already sitting there, reading the same repository, free for public repos and generously priced for private ones.

## Five Words That Explain Everything

GitHub Actions has five terms that show up constantly. Once these click, every YAML file below reads as plain English instead of magic:

- **Event** — something that happens to the repository: a push, a pull request, a new tag. This is the *trigger*.
- **Workflow** — the automation you define, as a YAML file. One event can trigger one workflow, or several.
- **Job** — a workflow is made of one or more jobs. Each job gets its own fresh machine to run on. Jobs can run in parallel or wait on each other.
- **Step** — a job is a sequence of steps, run in order, on that same machine. A step is either a shell command or a reusable **action**.
- **Runner** — the actual machine. A fresh Linux, Windows, or macOS virtual machine that GitHub spins up, runs your steps on, and throws away afterward.

Chain them together and you get the whole mental model: **an event triggers a workflow; a workflow runs one or more jobs; each job runs on its own runner, executing a sequence of steps.** Everything from here is just filling in *our* event, *our* jobs, and *our* steps.

Translated into what we actually want:

- **Event**: pushing a tag matching `host-v*`.
- **Workflow**: one YAML file that reacts to that event.
- **Jobs**: one for Linux, one for macOS + Windows together (via a matrix), running in parallel since neither depends on the other.
- **Steps**: checkout the code, install Qt, configure, build, install, package, upload — the exact same commands you'd type by hand, just running on hosted runners instead of your own machine.

## Creating the Workflow File

GitHub looks for workflow files in one exact path: `.github/workflows/`, at the repository root. Any `.yml` file placed there is picked up automatically — no registration step, no config elsewhere pointing at it.

```bash
mkdir -p .github/workflows
```

Create a file called `release-host.yml` inside it:

```yaml
name: Release Host Binary

on:
  push:
    tags:
      - "host-v*"

permissions:
  contents: write
```

`on.push.tags` defines the event: push a tag matching `host-v*` — `host-v0.1.0`, `host-v1.2.3`, anything starting with `host-v` — and this workflow runs. Nothing else triggers it. Not a push to main, not a pull request.

The `permissions` block grants `contents: write`. Every workflow run gets a temporary token for talking back to GitHub's API, and by default that token is read-only. We need write access because later steps create a GitHub Release and upload files to it — without this line, the upload step fails with a 403.

The workflow has two jobs: `build-linux`, which runs inside a Docker container with Qt pre-installed, and `build-desktop`, a matrix that covers macOS Apple Silicon, macOS Intel, and Windows. They run in parallel — nothing about the Linux artifacts depends on the macOS or Windows ones.

## The Linux Job: Building Inside a Container

GitHub's `ubuntu-24.04` runner is a clean Ubuntu VM — no Qt, nothing project-specific. There are two ways to get Qt onto it: install it as a step, or run the job inside a container that already has it. We pick the second.

```yaml
build-linux:
  runs-on: ubuntu-24.04
  container:
    image: carlonluca/qt-dev:6.8.3
```

`runs-on: ubuntu-24.04` still requests the VM, same as any job. `container.image` tells Actions to pull `carlonluca/qt-dev:6.8.3` from Docker Hub and run every subsequent step inside it. It's a community-maintained image (not official Qt or GitHub) that ships Qt 6.8.3 pre-built under `/opt`, including a desktop build, an Android build, and others side by side. We only need the desktop one.

Pinning the tag to `:6.8.3` rather than `:latest` matters for a reason easy to overlook: **glibc**, the C standard library every Linux binary links against. The tar.gz this pipeline produces doesn't bundle glibc, so the app's real compatibility floor is whatever glibc ships inside the container it was built in. glibc guarantees backward compatibility — a binary built against an older glibc runs fine on newer systems — but not forward compatibility, so pinning the image tag keeps that floor fixed and reproducible across every release instead of silently shifting whenever the image maintainer pushes an update.

### Checkout, System Dependencies, Configure

Nothing runs without the source code, and GitHub does not clone your repository into a job automatically — that's the first step, every time:

```yaml
steps:
  - uses: actions/checkout@v4
    with:
      submodules: recursive
```

`actions/checkout` is GitHub's official action for cloning your repo at the commit that triggered the workflow. `submodules: recursive` matters specifically here — Squared pulls in `external/qtkeychain` as a git submodule, and a plain clone leaves that directory empty. Every job runs with `$GITHUB_WORKSPACE` already set, and checkout puts the code exactly there, so no step in this whole pipeline ever needs to `cd` into the project first.

```yaml
- name: Install system dependencies
  run: apt-get update && apt-get install -y libsecret-1-dev curl file
```

`libsecret-1-dev` is needed because Squared's SecureStorage links against libsecret on Linux. `curl` and `file` are needed later by linuxdeploy.

Then comes Configure — the part where the pipeline earns its keep by doing something you'd never want to do by hand every time:

```yaml
- name: Configure
  run: |
    QT_PREFIX=$(find /opt -type f -path "*/gcc_64/lib/cmake/Qt6/Qt6Config.cmake" -exec dirname {} \; | sed 's#/lib/cmake/Qt6$##' | head -1)
    test -n "$QT_PREFIX" || { echo "No desktop Qt kit found"; exit 1; }
    test -f "$QT_PREFIX/lib/cmake/Qt6DBus/Qt6DBusConfig.cmake" || { echo "Qt6DBus missing in $QT_PREFIX"; exit 1; }

    cmake -G Ninja -B build \
      -DCMAKE_BUILD_TYPE=Release \
      -DCMAKE_PREFIX_PATH="$QT_PREFIX" \
      -DCMAKE_INSTALL_PREFIX=install
```

The Docker image has Qt somewhere under `/opt`, but the exact path varies by image version, and we don't control that image. So this finds it at run time instead of hardcoding it. Worth unpacking:

- **`find /opt -type f -path "*/gcc_64/lib/cmake/Qt6/Qt6Config.cmake"`** — baking `gcc_64` (the desktop Linux build's directory name) directly into the search pattern means it only ever finds the desktop kit, never the Android one sitting right next to it in the same image.
- **`-exec dirname {} \;`** — strips the filename off each match as part of the same command.
- **`sed 's#/lib/cmake/Qt6$##'`** — the path at this point looks like `/opt/qt/6.8.3/gcc_64/lib/cmake/Qt6`; this strips the trailing `/lib/cmake/Qt6` in one precise cut, leaving `/opt/qt/6.8.3/gcc_64`, the real Qt prefix.
- **`head -1`** — a safety net in case more than one desktop Qt version ever exists in the same image.
- **The `test` guards** — fail loudly and immediately if the image's layout ever changes, instead of handing `cmake` an empty `CMAKE_PREFIX_PATH` and failing confusingly several steps later. The second guard specifically checks for `Qt6::DBus`, which Squared requires for desktop integration — catching a mismatched Qt install before spending minutes compiling against it.

Configure only plans the build. Build and Install are one line each, identical to what you'd run locally:

```yaml
- name: Build
  run: cmake --build build --target Squared --parallel

- name: Install
  run: cmake --install build
```

`cmake --install` runs the deploy script `qt_generate_deploy_qml_app_script` generated during configure — copying the binary, Qt's shared libraries, the platform plugin, the QML modules, generating `qt.conf`, patching RPATH. Same four layers as building it by hand.

### Trimming Dead Weight

Between install and packaging, the pipeline removes what it doesn't need. Qt's deploy script copies every Quick Controls style it finds — Basic, Fusion, Material, Imagine, FluentWinUI3, Universal — into `install/qml/QtQuick/Controls/`. Squared only imports Basic, so the rest are dead weight the app never loads.

```yaml
- name: Trim install
  run: |
    cd install
    for style in FluentWinUI3 Material Imagine Fusion Universal; do
      rm -rf qml/QtQuick/Controls/$style
      rm -f lib/libQt6QuickControls2${style}* lib/libQt6QuickControls2${style}StyleImpl*
    done
    rm -rf plugins/qmltooling plugins/egldeviceintegrations
```

The loop deletes each unused style's QML directory and its compiled library. The last line removes two plugin directories that don't belong in a release build regardless of platform: `qmltooling` (the QML debugger's hooks — a development-time tool) and `egldeviceintegrations` (EGL backends for embedded targets this desktop build doesn't run on).

### Packaging: tar.gz, DEB, and the AppImage/FUSE Problem

```yaml
- name: Package (tar.gz)
  run: tar czf squared-host_linux_amd64.tar.gz -C install .

- name: Package (DEB)
  run: cd build && cpack -G DEB
```

Both are exact commands you'd run locally, unchanged. The DEB reads `CPACK_DEBIAN_*` variables already set in `CMakeLists.txt` — nothing CI-specific to configure, because the packaging logic lives in the CMake project, not the workflow file.

The AppImage is where CI genuinely diverges from local development:

```yaml
- name: Package (AppImage)
  run: |
    curl -sL https://github.com/linuxdeploy/linuxdeploy/releases/download/continuous/linuxdeploy-x86_64.AppImage -o linuxdeploy.AppImage
    chmod +x linuxdeploy.AppImage
    ./linuxdeploy.AppImage --appimage-extract
    mv squashfs-root linuxdeploy-extracted
    rm -rf AppDir && mkdir -p AppDir/usr
    cp -r install/* AppDir/usr/
    mkdir -p AppDir/usr/share/applications AppDir/usr/share/icons
    cp linux/com.squared.app.desktop AppDir/usr/share/applications/
    cp -r linux/icons/hicolor AppDir/usr/share/icons/
    ./linuxdeploy-extracted/AppRun \
      --appdir AppDir \
      --executable AppDir/usr/bin/Squared \
      --desktop-file AppDir/usr/share/applications/com.squared.app.desktop \
      --icon-file linux/icons/hicolor/256x256/apps/com.squared.app.png \
      --output appimage
    rm -rf AppDir linuxdeploy-extracted linuxdeploy.AppImage
```

`linuxdeploy` is itself distributed as an AppImage — a compressed SquashFS filesystem with a small runtime stub in front. Running it normally means that stub mounts the SquashFS image via **FUSE** (Filesystem in Userspace) before executing anything inside it. Mounting a filesystem requires the `SYS_ADMIN` Linux capability and access to `/dev/fuse`. Docker containers run with a deliberately reduced capability set, and `SYS_ADMIN` is excluded precisely because it's broad enough to let a container reach outside its intended isolation. So `linuxdeploy.AppImage` tries to mount itself, the container has neither the capability nor the device node, and the step fails.

You could grant the missing capability via the `container.options` field, but that's a wider hole than the problem deserves, and it's brittle. The fix instead: `--appimage-extract` unpacks the AppImage into a plain directory — no mounting, just regular file extraction any container can do. Inside sits `AppRun`, the same entry point the runtime stub would normally invoke after mounting, so calling it directly reaches the identical program without the FUSE step. Everything after that is unchanged: build the AppDir from `install/`, add the desktop file and icons, run linuxdeploy, get an `.AppImage` back.

If you ever see `fuse: device not found` in a CI log for any AppImage tool, this is the fix — extract, then run `AppRun` directly.

One detail worth knowing: `--output appimage` writes the finished file to the current working directory, not inside `AppDir/`. So this step produces `Squared-x86_64.AppImage` sitting directly at the repo root, ready for the upload step.

## The macOS + Windows Job: One Job, Three Runners

macOS introduces a problem the Linux job didn't have: we need *two* different Mac binaries — Apple Silicon and Intel — built the same way, on different machines. Rather than duplicate the job definition, GitHub Actions has a feature built for exactly this: the **strategy matrix**.

```yaml
build-desktop:
  strategy:
    fail-fast: false
    matrix:
      include:
        - os: macos-14
          platform: darwin
          arch: arm64
        - os: macos-15
          platform: darwin
          arch: amd64
        - os: windows-latest
          platform: windows
          arch: amd64
  runs-on: ${{ matrix.os }}
```

`strategy.matrix.include` lists three combinations, and `runs-on: ${{ matrix.os }}` means each combination runs as its own independent instance of this same job — three runners, three parallel executions of the same steps, each with different values for `os`, `platform`, and `arch`. This is why Windows lives in the same job as macOS even though its steps look nothing alike — it's a third row in the matrix, not a separate job.

`fail-fast: false` matters specifically because these are release builds: without it, GitHub cancels every other matrix instance the moment any one fails, and a Windows-only NSIS problem would take down both macOS builds you actually needed. With it, all three run to completion independently, and you get whichever artifacts succeeded.

`platform` and `arch` aren't anything GitHub understands natively — they're custom variables used later to build artifact filenames that describe what's inside them.

### Installing Qt With an Action

Unlike the Linux job's container, none of these three runners come with Qt pre-installed:

```yaml
- name: Install Qt
  uses: jurplel/install-qt-action@v4
  with:
    version: "6.8.3"
    target: desktop
    modules: qtshadertools
    cache: true
```

Notice what's missing: no `if: runner.os == '...'` guard. This one step runs identically on all three matrix rows, because `jurplel/install-qt-action` detects the runner's OS itself and fetches the right Qt build for it.

This is also the first `uses:` step worth pausing on properly, since we've used `run:` almost everywhere else. An **action** is a public GitHub repository containing an `action.yml` at its root, declaring its inputs, its outputs, and how it runs under the hood — a JavaScript program, a Docker container, or a bundle of ordinary steps given a name. The `uses:` string, `jurplel/install-qt-action@v4`, is literally an address: `{owner}/{repo}@{ref}`. There's no separate vetted registry behind the scenes — GitHub fetches that exact repository at that exact tag and runs whatever `action.yml` says. The GitHub Marketplace is just a searchable storefront for discovering actions published this way, not a more-vetted category of them — which is exactly why pinning to a specific tag like `@v4`, rather than something that can silently move like `@main`, matters more for a third-party action than an official one.

`jurplel/install-qt-action` wraps `aqtinstall`, the unofficial Qt installer, and downloads the actual SDK from Qt's servers at whatever version you specify. `modules: qtshadertools` adds Qt Quick's shader-compilation module, not in the default set but required here. `cache: true` stores the downloaded SDK in GitHub's Actions cache — a second run with the same version and modules skips the download entirely, saving three to four minutes per run.

### macOS: Configure, Build, Package

```yaml
- name: Install macOS dependencies
  if: runner.os == 'macOS'
  run: brew install ninja

- name: Configure (macOS)
  if: runner.os == 'macOS'
  run: |
    cmake -G Ninja -B build \
      -DCMAKE_BUILD_TYPE=Release \
      -DCMAKE_PREFIX_PATH=$Qt6_DIR \
      -DCMAKE_INSTALL_PREFIX=install
```

GitHub's macOS runners ship with Homebrew pre-installed. The configure command is the familiar Ninja/Release/install-prefix trio, except `CMAKE_PREFIX_PATH=$Qt6_DIR` reads the environment variable the Install Qt step already set, rather than a hardcoded local path.

Build and Install are the same two lines used everywhere in this pipeline. On macOS, `cmake --install` produces a `.app` bundle rather than a flat tree, because the project sets `MACOSX_BUNDLE TRUE`. No `macdeployqt` step anywhere — `qt_generate_deploy_qml_app_script` already does everything `macdeployqt` would: copying frameworks, rewriting install names, generating `qt.conf`.

```yaml
- name: Package (macOS tar.gz)
  if: runner.os == 'macOS'
  run: tar czf squared-host_${{ matrix.platform }}_${{ matrix.arch }}.tar.gz -C install .
```

Same one-liner as the Linux tar.gz, except the filename is built from matrix variables — `squared-host_darwin_arm64.tar.gz` on the `macos-14` row, `squared-host_darwin_amd64.tar.gz` on `macos-15`. One step definition, running twice, with different values each time.

### Windows: MSVC in CI, MinGW Locally

Windows is the third row in the same matrix — same checkout, same shared Install Qt step — but its own steps diverge because of one rule resurfacing from local development: your compiler must match your Qt build.

Locally, MinGW ships bundled with the Qt installer, so there's nothing extra to install. In CI, we use MSVC instead, for an entirely practical reason: the shared Install Qt step downloads the MSVC variant of Qt by default on Windows. We could fight that and separately install a MinGW toolchain, but MSVC is already pre-installed on GitHub's Windows runners — the path of least resistance.

```yaml
- name: Setup MSVC
  if: runner.os == 'Windows'
  uses: ilammy/msvc-dev-cmd@v1
```

Unlike GCC or Clang, MSVC's `cl.exe` isn't reachable from an arbitrary terminal just because Visual Studio is installed — it only becomes usable after `vcvarsall.bat` runs in that session and populates `PATH`, `INCLUDE`, and `LIB`. A developer normally launches a "Developer Command Prompt" shortcut that runs this automatically; a CI step has no such shortcut. `ilammy/msvc-dev-cmd` runs `vcvarsall.bat` on your behalf and exports its environment variables into every step that follows. Skip it, and `cmake -G Ninja` fails to find a working C++ compiler at all.

```yaml
- name: Install Windows dependencies
  if: runner.os == 'Windows'
  run: choco install ninja nsis -y

- name: Configure (Windows)
  if: runner.os == 'Windows'
  run: |
    cmake -G Ninja -B build `
      -DCMAKE_BUILD_TYPE=Release `
      -DCMAKE_PREFIX_PATH="$env:Qt6_DIR" `
      -DCMAKE_INSTALL_PREFIX=install
```

`choco` is Chocolatey, pre-installed on GitHub's Windows runners the same way Homebrew is on macOS — one line installs both Ninja and NSIS. Notice there's no `shell:` override here: GitHub's default shell on a Windows runner is PowerShell, and this step just uses it as-is. That's why the syntax differs from every other cmake call in this pipeline — a backtick for line continuation instead of a backslash, and `$env:Qt6_DIR` instead of bash's `$Qt6_DIR`.

```yaml
- name: Package (Windows portable ZIP)
  if: runner.os == 'Windows'
  shell: pwsh
  run: Compress-Archive -Path install/* -DestinationPath squared-host_${{ matrix.platform }}_${{ matrix.arch }}.zip

- name: Package (Windows NSIS installer)
  if: runner.os == 'Windows'
  run: cd build && cpack -G NSIS
```

Two artifacts from one runner: a portable ZIP for users who just want to unzip and run, and an NSIS installer — reading the same `CPACK_NSIS_*` variables set in `CMakeLists.txt` — for users who want Start Menu shortcuts and an uninstaller.

### Trimming on macOS: Same Goal, Different Shape

The trim step runs here too, once per matrix row, right after Build and Install. Windows shares Linux's flat `install/` layout, so its half is identical to what you already saw. macOS doesn't, and the difference is worth understanding, because it's the kind of thing that's easy to get wrong:

```yaml
- name: Trim install
  shell: bash
  run: |
    if [ "${{ runner.os }}" = "macOS" ]; then
      cd install/Squared.app/Contents/Resources
      for style in FluentWinUI3 Material Imagine Fusion Universal; do
        rm -rf "qml/QtQuick/Controls/$style"
        rm -rf "../Frameworks/QtQuickControls2${style}.framework" \
               "../Frameworks/QtQuickControls2${style}StyleImpl.framework"
      done
      rm -rf ../PlugIns/qmltooling ../PlugIns/egldeviceintegrations
    else
      cd install
      for style in FluentWinUI3 Material Imagine Fusion Universal; do
        rm -rf "qml/QtQuick/Controls/$style"
        rm -f "lib/libQt6QuickControls2${style}"* "lib/libQt6QuickControls2${style}StyleImpl"*
      done
      rm -rf plugins/qmltooling plugins/egldeviceintegrations
    fi
```

On macOS, the app doesn't have top-level `qml/`, `lib/`, or `plugins/` directories — everything lives inside `Squared.app/Contents/`: QML under `Contents/Resources/qml/`, shared libraries under `Contents/Frameworks/`, plugins under `Contents/PlugIns/`. The branch `cd`s into `Contents/Resources` and reaches sideways for the other two.

The library removal can't reuse Linux's pattern either, for a reason specific to how macOS packages code. On Linux and Windows, each Quick Controls style is a flat file (`libQt6QuickControls2Material.so`), so a glob matches it directly. On macOS, Qt ships every module as a `.framework` **directory** — no `lib` prefix, no version suffix, `.framework` instead of `.so`. A style there is removed with `rm -rf` on a named directory, not a glob on a filename.

`shell: bash` is what makes this step run in Git Bash on the Windows runner instead of its default PowerShell — which is why *this* step uses `for` loops and `rm` while *Configure (Windows)* right above it used backtick continuation. On macOS, the default shell is already bash, so nothing changes there.

## Publishing the Release

Each job uploads its own artifacts directly to the GitHub Release:

```yaml
# build-linux job
- name: Upload release assets
  uses: softprops/action-gh-release@v2
  with:
    files: |
      squared-host_linux_amd64.tar.gz
      build/squared-*.deb
      Squared-*.AppImage
```

```yaml
# build-desktop job
- name: Upload release assets
  uses: softprops/action-gh-release@v2
  with:
    files: |
      squared-host_*.tar.gz
      squared-host_*.zip
      build/Squared-*-win64.exe
```

`softprops/action-gh-release` creates a GitHub Release for the triggering tag and attaches the listed files. If the release already exists because another job created it first, it adds files to the existing one. That's how both jobs upload independently without any coordination — first job to finish creates the release, the rest attach to it. No race condition, no locking.

Glob patterns absorb the filenames that include matrix variables. `squared-host_*.tar.gz` matches both macOS archives. `squared-host_*.zip` matches only the Windows portable ZIP — the macOS runners don't produce a `.zip` at all, so that glob simply matches nothing on those runners and the step silently skips it. Same story in reverse for the tar.gz pattern on Windows.

The result: one GitHub Release page, seven downloadable files. A Linux user picks the AppImage, the DEB, or the tar.gz. A macOS user picks the tar.gz matching their architecture. A Windows user picks the ZIP or the installer.

## The Complete Workflow

Put together, this is the entire `.github/workflows/release-host.yml` — nothing simplified, nothing omitted:

```yaml
name: Release Host Binary

on:
  push:
    tags:
      - "host-v*"

permissions:
  contents: write

jobs:
  # --- Linux: Docker container with full Qt ---
  build-linux:
    runs-on: ubuntu-24.04
    container:
      image: carlonluca/qt-dev:6.8.3

    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Install system dependencies
        run: apt-get update && apt-get install -y libsecret-1-dev curl file

      - name: Configure
        run: |
          QT_PREFIX=$(find /opt -type f -path "*/gcc_64/lib/cmake/Qt6/Qt6Config.cmake" -exec dirname {} \; | sed 's#/lib/cmake/Qt6$##' | head -1)
          test -n "$QT_PREFIX" || { echo "No desktop Qt kit found"; exit 1; }
          test -f "$QT_PREFIX/lib/cmake/Qt6DBus/Qt6DBusConfig.cmake" || { echo "Qt6DBus missing in $QT_PREFIX"; exit 1; }

          cmake -G Ninja -B build \
            -DCMAKE_BUILD_TYPE=Release \
            -DCMAKE_PREFIX_PATH="$QT_PREFIX" \
            -DCMAKE_INSTALL_PREFIX=install

      - name: Build
        run: cmake --build build --target Squared --parallel

      - name: Install
        run: cmake --install build

      - name: Trim install
        run: |
          cd install
          for style in FluentWinUI3 Material Imagine Fusion Universal; do
            rm -rf qml/QtQuick/Controls/$style
            rm -f lib/libQt6QuickControls2${style}* lib/libQt6QuickControls2${style}StyleImpl*
          done
          rm -rf plugins/qmltooling plugins/egldeviceintegrations

      - name: Package (tar.gz)
        run: tar czf squared-host_linux_amd64.tar.gz -C install .

      - name: Package (DEB)
        run: cd build && cpack -G DEB

      - name: Package (AppImage)
        run: |
          curl -sL https://github.com/linuxdeploy/linuxdeploy/releases/download/continuous/linuxdeploy-x86_64.AppImage -o linuxdeploy.AppImage
          chmod +x linuxdeploy.AppImage
          ./linuxdeploy.AppImage --appimage-extract
          mv squashfs-root linuxdeploy-extracted
          rm -rf AppDir && mkdir -p AppDir/usr
          cp -r install/* AppDir/usr/
          mkdir -p AppDir/usr/share/applications AppDir/usr/share/icons
          cp linux/com.squared.app.desktop AppDir/usr/share/applications/
          cp -r linux/icons/hicolor AppDir/usr/share/icons/
          ./linuxdeploy-extracted/AppRun \
            --appdir AppDir \
            --executable AppDir/usr/bin/Squared \
            --desktop-file AppDir/usr/share/applications/com.squared.app.desktop \
            --icon-file linux/icons/hicolor/256x256/apps/com.squared.app.png \
            --output appimage
          rm -rf AppDir linuxdeploy-extracted linuxdeploy.AppImage

      - name: Upload release assets
        uses: softprops/action-gh-release@v2
        with:
          files: |
            squared-host_linux_amd64.tar.gz
            build/squared-*.deb
            Squared-*.AppImage

  # --- macOS + Windows: install-qt-action ---
  build-desktop:
    strategy:
      fail-fast: false
      matrix:
        include:
          - os: macos-14
            platform: darwin
            arch: arm64
          - os: macos-15
            platform: darwin
            arch: amd64
          - os: windows-latest
            platform: windows
            arch: amd64
    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Install Qt
        uses: jurplel/install-qt-action@v4
        with:
          version: "6.8.3"
          target: desktop
          modules: qtshadertools
          cache: true

      - name: Install macOS dependencies
        if: runner.os == 'macOS'
        run: brew install ninja

      - name: Install Windows dependencies
        if: runner.os == 'Windows'
        run: choco install ninja nsis -y

      - name: Setup MSVC
        if: runner.os == 'Windows'
        uses: ilammy/msvc-dev-cmd@v1

      - name: Configure (macOS)
        if: runner.os == 'macOS'
        run: |
          cmake -G Ninja -B build \
            -DCMAKE_BUILD_TYPE=Release \
            -DCMAKE_PREFIX_PATH=$Qt6_DIR \
            -DCMAKE_INSTALL_PREFIX=install

      - name: Configure (Windows)
        if: runner.os == 'Windows'
        run: |
          cmake -G Ninja -B build `
            -DCMAKE_BUILD_TYPE=Release `
            -DCMAKE_PREFIX_PATH="$env:Qt6_DIR" `
            -DCMAKE_INSTALL_PREFIX=install

      - name: Build
        run: cmake --build build --target Squared --parallel

      - name: Install
        run: cmake --install build

      - name: Trim install
        shell: bash
        run: |
          if [ "${{ runner.os }}" = "macOS" ]; then
            cd install/Squared.app/Contents/Resources
            for style in FluentWinUI3 Material Imagine Fusion Universal; do
              rm -rf "qml/QtQuick/Controls/$style"
              rm -rf "../Frameworks/QtQuickControls2${style}.framework" \
                     "../Frameworks/QtQuickControls2${style}StyleImpl.framework"
            done
            rm -rf ../PlugIns/qmltooling ../PlugIns/egldeviceintegrations
          else
            cd install
            for style in FluentWinUI3 Material Imagine Fusion Universal; do
              rm -rf "qml/QtQuick/Controls/$style"
              rm -f "lib/libQt6QuickControls2${style}"* "lib/libQt6QuickControls2${style}StyleImpl"*
            done
            rm -rf plugins/qmltooling plugins/egldeviceintegrations
          fi

      - name: Package (macOS tar.gz)
        if: runner.os == 'macOS'
        run: tar czf squared-host_${{ matrix.platform }}_${{ matrix.arch }}.tar.gz -C install .

      - name: Package (Windows portable ZIP)
        if: runner.os == 'Windows'
        shell: pwsh
        run: Compress-Archive -Path install/* -DestinationPath squared-host_${{ matrix.platform }}_${{ matrix.arch }}.zip

      - name: Package (Windows NSIS installer)
        if: runner.os == 'Windows'
        run: cd build && cpack -G NSIS

      - name: Upload release assets
        uses: softprops/action-gh-release@v2
        with:
          files: |
            squared-host_*.tar.gz
            squared-host_*.zip
            build/Squared-*-win64.exe
```

Notice something about this whole file: there's no packaging logic actually *in* the workflow. The DEB reads `CPACK_DEBIAN_*` from `CMakeLists.txt`. The NSIS installer reads `CPACK_NSIS_*` from the same place. The AppImage step is the same `linuxdeploy` invocation you'd run locally, with one flag added for the Docker/FUSE conflict. The trim loop is identical to what you'd run by hand after any local install. **The pipeline doesn't invent new deployment logic — it automates the exact solutions already worked out by hand, running them on a schedule instead of at a keyboard.**

## Triggering a Release

From the developer's side, shipping a new version is three steps.

**1. Run the tests locally.** Catch problems before they reach CI.

**2. Bump the version.** Update `PROJECT_VERSION` in the root `CMakeLists.txt`. That string propagates into the DEB metadata, the NSIS installer version, and every artifact filename CPack generates.

**3. Tag and push:**

```bash
git tag host-v0.1.0
git push origin host-v0.1.0
```

That push triggers the workflow. Two jobs start in parallel. A few minutes later, the release page has seven downloadable artifacts. No manual builds on three machines, no copying files between operating systems, no uploading anything by hand.

### A Note on Tag Namespaces

If your repository ships more than one deliverable, separate tag patterns keep their pipelines from colliding. Squared also has a CLI tool written in Go, with its own workflow triggered on plain `v*` tags:

```yaml
name: Release CLI

on:
  push:
    tags:
      - "v*"
```

That workflow uses GoReleaser to cross-compile the CLI for every target platform from a single Ubuntu runner — one runner, because Go has native cross-compilation support. The contrast is instructive: the Qt host app needs four runners because each platform's C++ toolchain and Qt SDK can only build for its own platform. Native C++ applications with framework dependencies need per-platform runners; your CI configuration should reflect that rather than fight it. `host-v` tags build the Qt app, `v` tags build the CLI — they never overlap.

## Runner vs. Container: Don't Conflate Them

One distinction is worth calling out on its own, since it's easy to blur: the **runner** is the VM GitHub gives your job — unavoidable, every job needs one. A **container** is optional and layered on top. When a job specifies `jobs.<job_id>.container`, every step in that job runs inside a Docker container on the runner instead of directly on its filesystem — the runner's job is reduced to hosting Docker. That's exactly what `build-linux` does with `carlonluca/qt-dev:6.8.3`, and exactly what `build-desktop` does *not* do, installing Qt as a step instead. Same underlying problem (get Qt onto a clean machine), two different mechanisms, chosen per-platform based on which one is cheaper to set up.

## The Takeaway

Every CI step in this pipeline maps to something you'd otherwise do by hand: `cmake --install` replaces manually copying libraries. The `linuxdeploy` invocation is the same command you'd run locally, extended with one flag for a container-specific FUSE limitation. `cpack -G DEB` and `cpack -G NSIS` are identical to running them at your own terminal. The trim loop is the same cleanup you'd run after any local install.

What changes isn't the deployment logic — it's who's driving. Once this file is committed, releasing a new version stops being a personal ritual involving three operating systems and becomes `git tag && git push`. That's the entire point of CI/CD: not new capabilities, just the same capabilities, running unattended, the same way, every single time.

If you want to see this pipeline built from scratch alongside the rest of Squared's deployment story — packaging for Windows, Linux, macOS, Android, iOS, and embedded ARM, with proper installers and signed bundles before any of this CI work even starts — I walk through the whole thing in my [Qt QML Cross-Platform Deployment course](/courses/qt-qml-deployment/). Nine chapters, taking one Qt QML application from a working build to a release pipeline that ships itself.

Happy shipping!
