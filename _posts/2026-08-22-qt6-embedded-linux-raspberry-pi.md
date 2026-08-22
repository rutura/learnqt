---
layout: post
title: "From QML to a Raspberry Pi: Cross-Compiling a Qt 6 App for Embedded Linux"
description: A practical walkthrough of cross-compiling a Qt 6 QML application for a Raspberry Pi using Docker, from building a sysroot and a CMake toolchain file to a fullscreen kiosk running on real hardware.
date: '2026-08-22'
categories:
    - Qt 6
tags:
    - Qt 6
    - QML
    - Embedded Linux
    - Raspberry Pi
    - Docker
    - Deployment
comments: true
sidebar: true
---

Every platform so far in this series has had *something* pre-built waiting for us: Qt's own installer for desktop, Qt's Android kit, Qt's iOS kit. Embedded Linux hands you none of that. There's no NDK-equivalent for a Raspberry Pi, no maintenance tool with a checkbox for "ARM." You build the cross-compiler's target environment yourself, write the CMake configuration that tells it how to cross-compile by hand, and compile Qt itself from source, twice, before your own application ever enters the picture.

This post walks through that whole path for **Squared**, a real Qt 6 QML app, as part of my [Qt QML Cross-Platform Deployment course](/courses/qt-qml-deployment/): what cross-compilation actually means, building a sysroot (a local copy of the Pi's system libraries) and a CMake toolchain file, the four-stage Docker build that compiles Qt for the host, cross-compiles Qt for the Pi, and finally cross-compiles the app itself, then getting the result running fullscreen on real hardware.

The destination: the same Squared binary and QML files you'd deploy anywhere else, now compiled for ARM, running fullscreen on a Raspberry Pi 4 or 5 via `eglfs` (Qt's platform plugin for drawing directly to the display with no desktop underneath), with a one-command build and a fast update loop for whenever the code changes.

## Cross-Compilation, in One Idea

Normally, the machine compiling your code and the machine running it are the same machine. You build on your laptop, you run on your laptop. **Cross-compilation** breaks that assumption on purpose: the **host** is the machine doing the compiling (an x86_64 environment, a regular Intel or AMD chip), and the **target** is the machine the result actually runs on (the Pi, which is ARM, specifically `aarch64`, a completely different instruction set).

That means you need a **cross-compiler**: a compiler that *runs* on x86_64 but *emits* ARM machine code. The binary it produces won't run on your laptop at all; try it and you'll get "cannot execute binary file." It only runs on the Pi, and that's not a bug, that's the entire point.

For CMake (the build system generator Qt projects use to produce actual build files) to emit ARM binaries instead of x86 ones, you have to hand it three things: the target operating system (Linux, since the Pi runs Linux too, just a different processor), the cross-compiler executables themselves, and a **sysroot**.

The sysroot is the piece that needs unpacking. When the cross-compiler builds Squared, it needs to `#include <EGL/egl.h>` and link against `libGLESv2.so` and dozens of other headers and libraries. On your laptop those live in `/usr/include` and `/usr/lib`, but those are the *x86* versions, and the cross-compiler needs the *ARM* versions, the ones that actually exist on a Pi. A sysroot is a directory holding exactly that: a copy of the target's system headers and libraries, essentially a photocopy of the relevant parts of the Pi's filesystem sitting on your build machine. When you cross-compile, you tell the compiler "don't look in the host's `/usr/include`, look here instead."

If you've done the Android chapter of this series, you've already met this mechanism, you just didn't have to think about it: there, `qt-cmake` set the toolchain file automatically, pointing at the NDK's cross-compiler and Android's own sysroot behind the scenes. Embedded Linux has no NDK equivalent and no automatic setup. This time you write the toolchain file, you build the sysroot, you build Qt from source against that toolchain, and you compile the app against that cross-compiled Qt. More steps, but every one of them is conceptually something you've already met.

One subtlety worth flagging early: Qt's build process needs a few tools, `moc` (Qt's meta-object compiler), `rcc` (the resource compiler), and `qmlcachegen`, to run *during* the build itself, reading your QML and resource files and generating C++ code. Those tools run on the build machine, not the Pi, so they have to be native x86_64 binaries. On Android, `QT_HOST_PATH` pointed at your existing desktop Qt install for this. For the Pi, there's no pre-installed Qt anywhere, so the pipeline builds a throwaway "host Qt" first, purely to get those tools, before cross-compiling the real ARM Qt. File that away now: **there will be two separate Qt builds**, one for the host and one for the target.

## Why All of This Happens Inside Docker

Writing a toolchain file, building a sysroot, and building Qt twice sounds like a lot of fiddly setup to accumulate on your actual machine. It is, so none of it happens there. It all happens inside **Docker**, a tool that packages an application together with everything it needs (libraries, tools, an entire filesystem) into a portable image, and runs it in an isolated environment called a container.

That buys three things: no cross-compiler cluttering your host, no sysroot to assemble by hand, and no ARM Qt build sitting on your system afterward. The only tool you need locally is Docker itself. The container is the build environment, and it's genuinely reproducible: the same Dockerfile produces the same build on your laptop, a colleague's laptop, or in CI.

Two Docker vocabulary items matter for everything that follows. An **image** is a frozen filesystem template, like `debian:bookworm-slim`; it doesn't run, it just exists. A **container** is a running instance of an image; start one and you've got a container, stop it and it's gone, though the image stays put to start another from. And a **Dockerfile** is a plain-text recipe, a sequence of directives that `docker build` walks top to bottom, freezing the result of each one as a **layer**. Layers matter for a very practical reason here: if a directive's inputs haven't changed since the last build, Docker reuses the cached layer instead of re-running it. That's the entire reason this pipeline is "30 to 60 minutes the first time, 2 to 3 minutes after that": once Qt is built and cached, editing your own application code only invalidates the layers below it.

There's one more wrinkle, because this build does something most builds don't: it runs ARM containers and cross-builds on an x86 machine. Three pieces make that possible. **buildx** is Docker's modern build engine; `docker buildx build --platform linux/arm64` is what targets the Pi's architecture instead of your own. **QEMU** is a CPU emulator that lets the parts of the build which actually *run* ARM binaries (like `apt` installing packages inside an ARM container) work on your x86 machine. **binfmt** is the kernel-level switchboard that hands ARM binaries to QEMU instead of just failing to execute them.

On macOS and Windows, Docker Desktop ships all three pre-wired, so `--platform linux/arm64` just works out of the box. On Linux, it depends which Docker you have: Docker Desktop for Linux bundles everything too, but the plain distro package (`apt install docker.io`) is just the engine, so you add the rest once:

```bash
sudo apt update
sudo apt install docker-buildx qemu-user-static binfmt-support
docker buildx create --use
docker buildx ls   # confirm linux/arm64 is listed under the active builder
```

## Three Machines, Two of Them the Same One

Before writing any files, it's worth nailing down a mental model, because the words "host" and "target" trip people up otherwise. There are three places in play:

```
┌──────────────────────────────────────────────────────────────────┐
│  YOUR LAPTOP  (x86_64, Windows / macOS / Linux)                    │
│  Installed here: ONLY Docker. No cross-compiler, no sysroot,       │
│                   no Qt-for-ARM.                                   │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  DOCKER BUILD CONTAINER (x86_64)                             │  │
│  │  ── this is the "HOST" the toolchain file talks about ──     │  │
│  │                                                               │  │
│  │  cross-compiler: runs HERE (x86 program) but                 │  │
│  │  EMITS ARM64 machine code ──────────────────┐                │  │
│  │                                              │                │  │
│  │  /build/sysroot/ ← the Pi's headers + libs   │ (reads the     │  │
│  │    extracted from rasp.tar.gz ───────────────┘  TARGET's      │  │
│  │                                                  headers/libs)│  │
│  └───────────────────────────────────────┬──────────────────────┘  │
└────────────────────────────────────────────┼───────────────────────┘
                                              │ output: ARM64 binaries
                                              ▼
                                   ┌──────────────────────┐
                                   │  scp to the Pi        │
                                   └──────────┬───────────┘
                                              ▼
                                   ┌──────────────────────┐
                                   │  RASPBERRY PI (ARM64) │
                                   │  ── the "TARGET" ──   │
                                   └──────────────────────┘
```

Three things to take from that picture. First, **the cross-compiler lives in the container, not on your laptop**. When the Dockerfile runs `apt-get install gcc-12-aarch64-linux-gnu`, that lands in the container's own `/usr/bin`, which is exactly the path the toolchain file points at. That's why the only thing you install locally is Docker: every messy build tool stays sealed inside the container. Second, **a cross-compiler has a split personality**: it runs on x86 (it's an x86 program executing in that x86 container) but produces ARM64 code. So when the toolchain file later says the compiler "runs on the host," that just means "it's an x86 program running in the x86 build environment," i.e. the container. Third, **the sysroot is the target's half**: the compiler runs host-side, but it has to compile against the Pi's own headers and libraries, and those come from the extracted sysroot.

The one-line version: Docker spins up an x86 container, drops an x86 cross-compiler into it, that compiler reads the Pi's libraries from a sysroot and emits ARM binaries, and you `scp` those to the Pi. Your laptop's involvement starts and ends at running one build script.

## The Pipeline, End to End

```
your source code (the Squared repo)
        │
        ▼
┌────────────────────────────────────────────────┐
│  Docker Stage 1: build a "sysroot"               │
│  a copy of the Pi's system headers + libraries   │
│  → produces rasp.tar.gz                          │
└────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────┐
│  Docker Stage 2: the big build                   │
│   a) build Qt for the host (x86), gives us        │
│      moc / rcc / qmlcachegen                     │
│   b) cross-compile Qt for the Pi (ARM)            │
│   c) cross-compile Squared for the Pi (ARM)       │
│  → produces install-arm/ + qt-pi-binaries.tar.gz  │
└────────────────────────────────────────────────┘
        │
        ▼
   scp the files to the Raspberry Pi
        │
        ▼
   Squared runs fullscreen on the Pi
```

Everything below walks through building each box in that picture, one file at a time.

## Building the Sysroot

The sysroot is the foundation everything else sits on: the toolchain file points at it, the big Dockerfile extracts it, and nothing cross-compiles without it. The question is how to get a photocopy of a Pi's system libraries without owning a Pi to copy from. The answer, again, is Docker: run a real ARM64 container via the buildx/QEMU machinery, install every development library Qt and Squared could need with `apt`, then tar up the results.

The recipe lives in a file called `DockerFileRasp`:

```dockerfile
# Generates the arm64 sysroot from Debian bookworm (matches Raspberry Pi OS)
FROM arm64v8/debian:bookworm

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    libegl1-mesa-dev libgles2-mesa-dev libgbm-dev libdrm-dev \
    libxcb1-dev libinput-dev libssl-dev \
    # ... and roughly 60 more -dev packages

WORKDIR /build
RUN tar cvfz rasp.tar.gz -C / lib usr/include usr/lib
```

`FROM arm64v8/debian:bookworm` is a genuine ARM64 Debian image, running through QEMU emulation on your x86 host (which is why operations inside it feel slow, every ARM instruction is being simulated). "Bookworm" matters because it's the Debian version Raspberry Pi OS is currently based on, so this container's libraries genuinely match a real Pi. The long `apt-get install` line names every `-dev` package (the suffix matters: `-dev` packages carry the headers and `.so` symlinks a compiler needs, not just runtime libraries) that Qt and Squared might touch. `apt` resolves the whole dependency tree for you, so you never have to hunt down individual files at individual versions.

A handful of those packages earn special mention because they're the whole reason the app can draw anything on screen: `libegl1-mesa-dev` and `libgles2-mesa-dev` provide EGL and OpenGL ES, the graphics stack the Pi's GPU actually supports (it does not do full desktop OpenGL), and this is exactly what the `eglfs` platform plugin renders through. `libgbm-dev` (Generic Buffer Management) is what `eglfs` uses to hand finished frames to the display. `libdrm-dev` (Direct Rendering Manager) is the kernel-level display interface underneath all of that.

The final line, `tar cvfz rasp.tar.gz -C / lib usr/include usr/lib`, packs those three directories into a gzipped tarball. Roughly, what ends up inside:

```
rasp.tar.gz
├── lib/ld-linux-aarch64.so.1        (the dynamic linker)
├── usr/include/
│   ├── EGL/egl.h
│   ├── GLES2/gl2.h
│   └── ... (hundreds more, one per -dev package)
└── usr/lib/aarch64-linux-gnu/
    ├── libEGL.so -> libEGL.so.1
    ├── libGLESv2.so -> libGLESv2.so.2
    ├── libgbm.so -> libgbm.so.1
    └── ...
```

This lecture only produces the *recipe*, not the tarball itself; that only gets generated later when the build script actually runs the Dockerfile.

## The Toolchain File

With the sysroot recipe written, CMake needs to be taught how to actually use it. That's the job of `arm64-pi/toolchain.cmake`, and it's the single place where the three ingredients from earlier (target OS, cross-compiler, sysroot) get handed to CMake, plus a few rules to keep it from accidentally reaching for the host's own libraries by mistake.

**Section 1, system and sysroot:**

```cmake
set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR aarch64)

set(TARGET_SYSROOT /build/sysroot)
set(TARGET_ARCHITECTURE aarch64-linux-gnu)
set(CMAKE_SYSROOT ${TARGET_SYSROOT})
```

The important trigger here is subtle: simply *setting* `CMAKE_SYSTEM_NAME` in a toolchain file, to anything at all, is what flips CMake into cross-compilation mode. From that point it stops looking for tools and libraries on the host and starts looking in the sysroot instead. `/build/sysroot` is a path chosen deliberately: it's a contract between this file and the big Dockerfile written next, which will extract `rasp.tar.gz` to that exact location. One path string, two files that have to agree.

**Section 2, the compiler itself:**

```cmake
set(CMAKE_C_COMPILER /usr/bin/${TARGET_ARCHITECTURE}-gcc-12)
set(CMAKE_CXX_COMPILER /usr/bin/${TARGET_ARCHITECTURE}-g++-12)

set(QT_COMPILER_FLAGS "-march=armv8-a+crypto -mtune=cortex-a72")
```

`aarch64-linux-gnu-gcc-12` and `-g++-12` are the actual cross-compilers, x86 binaries living in the build container that emit ARM64 output. That naming pattern (a target triplet followed by the tool name) shows up everywhere in cross-compilation tooling. The `-mtune=cortex-a72` flag tunes generated code for the Raspberry Pi 4/CM4's specific CPU core; it's optional, and if you're targeting a Pi 5 (which has a Cortex-A76 core instead), these Pi 4 flags still build and run fine there, you'd just be leaving a little A76-specific performance on the table.

**Section 3, keeping CMake out of the host's own libraries:**

```cmake
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)
```

This is cheap insurance against a whole category of confusing failures. `PROGRAM` is `NEVER` because the sysroot is full of ARM binaries the x86 host can't execute; CMake should only look for *executables* on the host's normal `PATH`. `LIBRARY`, `INCLUDE`, and `PACKAGE` are all `ONLY`, meaning search exclusively inside the sysroot and never touch the host's own `/usr/lib` or `/usr/include`. Skip these, and CMake might find the host's x86 Qt libraries and try linking them against ARM object files; best case the linker complains loudly, worst case it silently produces a binary that crashes on the Pi.

**Section 4, pointing at the GPU libraries explicitly:**

```cmake
set(EGL_LIBRARY ${TARGET_SYSROOT}/usr/lib/${TARGET_ARCHITECTURE}/libEGL.so)
set(GLESv2_LIBRARY ${TARGET_SYSROOT}/usr/lib/${TARGET_ARCHITECTURE}/libGLESv2.so)
set(gbm_LIBRARY ${TARGET_SYSROOT}/usr/lib/${TARGET_ARCHITECTURE}/libgbm.so)
```

This last section is a plain workaround. Qt's own build tries to auto-detect its graphics libraries during configure, and that detection usually just works, but inside this slightly unusual setup (a sysroot at `/build/sysroot` instead of at the filesystem root) Qt's find logic sometimes misses them. Handing Qt the exact `.so` paths sidesteps the guesswork entirely, and with these set, Qt's configure can enable the `eglfs` platform plugin the whole pipeline is building toward.

Two things end up reading this file: the big Dockerfile passes `-DCMAKE_TOOLCHAIN_FILE=/build/toolchain.cmake` when cross-compiling Qt itself, and the resulting cross-compiled `qt-cmake` wrapper then sets that same flag automatically when building Squared, the same convenience `qt-cmake` gave you on Android.

## The Big Dockerfile: Four Builds in One

This is the heart of the chapter, and it's long, but not complicated, just long, because it runs four builds back to back: extract the sysroot, build Qt for the host, cross-compile Qt for the Pi, cross-compile Squared for the Pi. Hold that four-step shape in mind and the file reads itself.

**Stage 1, base image and cross-compiler.** A regular x86 Debian image, not the ARM one from the sysroot file, so nothing here is emulated:

```dockerfile
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    cmake ninja-build mold \
    gcc-12-aarch64-linux-gnu g++-12-aarch64-linux-gnu \
    binutils-aarch64-linux-gnu
```

Alongside ordinary build tooling (CMake, Ninja, and **mold**, a notably fast linker), this installs the exact cross-compilers the toolchain file points at.

**Stage 2, extract and repair the sysroot:**

```dockerfile
COPY rasp.tar.gz /build/rasp.tar.gz
RUN mkdir -p sysroot/usr sysroot/opt \
    && tar xfz rasp.tar.gz -C sysroot \
    && wget -q https://raw.githubusercontent.com/riscv/riscv-poky/master/scripts/sysroot-relativelinks.py \
    && python3 sysroot-relativelinks.py /build/sysroot
```

There's a repair step here that's easy to miss but genuinely matters. Inside the sysroot, library symlinks point to *absolute* paths, like `libEGL.so` pointing at `/usr/lib/aarch64-linux-gnu/libEGL.so.1`. That path is correct on a real Pi, where those directories live at the filesystem root, but inside this container the sysroot sits at `/build/sysroot/usr/lib/...`, so following the absolute symlink lands nowhere useful. `sysroot-relativelinks.py` rewrites every absolute symlink in the sysroot to a relative one, so the cross-compiler can actually follow them.

**Stage 3, build Qt for the host.** This is the "two Qt builds" idea made concrete: before cross-compiling Qt for the Pi, a throwaway host build produces `moc`, `rcc`, and `qmlcachegen` as native x86 binaries:

```dockerfile
RUN cmake -GNinja -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_INSTALL_PREFIX=/build/qt6/host \
    && cmake --build . --parallel $(nproc) \
    && cmake --install . \
    # ... repeated for each required Qt module
    && rm -rf /build/qt6/host-build
```

Two paths matter here and stay deliberately separate: `/build/qt6/host` is the install prefix, the harvest kept for later; `/build/qt6/host-build` is pure Ninja scratch space (extracted sources, object files) thrown away once the install finishes. The final `rm -rf` runs inside the *same* `RUN` instruction as everything before it, and that placement is deliberate: Docker only captures the net filesystem diff of a `RUN` as its layer, so anything created and deleted within one instruction never actually enters the image. Split that cleanup into a separate `RUN`, and the multi-gigabyte scratch directory would already be baked into the previous layer, invisible but still taking up space.

**Stage 4, cross-compile Qt for the Pi.** Same shape as Stage 3, but now every earlier piece of this chapter shows up in one `cmake` call:

```dockerfile
RUN cmake -GNinja -DCMAKE_BUILD_TYPE=Release \
        -DINPUT_opengl=es2 \
        -DINPUT_tslib=no \
        -DQT_HOST_PATH=/build/qt6/host \
        -DCMAKE_STAGING_PREFIX=/build/qt6/pi \
        -DCMAKE_INSTALL_PREFIX=/usr/local/qt6 \
        -DCMAKE_TOOLCHAIN_FILE=/build/toolchain.cmake \
    && cmake --build . --parallel $(nproc) \
    && cmake --install .

RUN tar -I pigz -cf qt-pi-binaries.tar.gz -C /build/qt6/pi .
```

`-DCMAKE_TOOLCHAIN_FILE` is the flag that flips everything: CMake reads it and picks up the sysroot, the cross-compilers, the find-mode rules, and the GPU library paths all at once. `-DQT_HOST_PATH=/build/qt6/host` is where Stage 3's harvest gets consumed, since Qt's build still needs those native `moc`/`rcc`/`qmlcachegen` tools even while cross-compiling. `-DINPUT_opengl=es2` builds Qt against OpenGL ES 2 rather than desktop OpenGL, matching what the Pi's GPU actually supports; get this wrong and `eglfs` simply won't work. `-DINPUT_tslib=no` skips linking against the old resistive-touchscreen library, since it's present in the sysroot but modern touch panels go through `libinput` instead, and leaving it in would make `eglfs` fail to load on any Pi that lacks `tslib` installed, with a confusingly unhelpful error.

The two prefix flags matter for different reasons. `-DCMAKE_STAGING_PREFIX=/build/qt6/pi` is where the built artifacts land *inside the container*, mirroring the host build's own prefix. `-DCMAKE_INSTALL_PREFIX=/usr/local/qt6` is where Qt believes it lives *at runtime on the Pi*: Qt bakes this path into its own binaries, and `libQt6Core.so.6` will look here for its plugins and QML modules once deployed. The final `RUN tar -I pigz ...` packages that whole ARM Qt install into `qt-pi-binaries.tar.gz`, using **pigz**, a parallel gzip implementation, to knock the packaging step down from minutes to seconds.

**Stage 5, cross-compile Squared, the payoff:**

```dockerfile
COPY project /build/project

RUN cd /build/project \
    && /build/qt6/pi/bin/qt-cmake -GNinja \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_INSTALL_PREFIX=/build/install-arm \
        -DCMAKE_INSTALL_RPATH=/usr/local/qt6/lib \
    && cmake --build . --parallel $(nproc) \
    && cmake --install .
```

This uses the *cross-compiled* `qt-cmake`, not the host one, the wrapper that already knows to cross-build. `-DCMAKE_INSTALL_RPATH=/usr/local/qt6/lib` is worth dwelling on, because it's a deliberate architectural choice. On every desktop and Android build in this series, the app shipped bundled *with* its own copy of Qt, libraries sitting right next to the binary. Here, the pipeline goes the other way: Qt ships separately as `qt-pi-binaries.tar.gz` and lives at `/usr/local/qt6` on the Pi, and this flag writes that exact path into Squared's binary as its **RUNPATH** (the lookup path a Linux binary uses to find its shared libraries at launch). The dynamic linker reads that RUNPATH, finds `libQt6Core.so.6` at `/usr/local/qt6/lib`, and from there Qt (being relocatable) derives its own prefix and locates plugins and QML modules underneath it too. Two separate artifacts, one shared path string tying them together:

```
                              on the Pi
──────────────────────────────────────────────────────────────
/usr/local/qt6/                    ← from qt-pi-binaries.tar.gz
├── lib/libQt6Core.so.6  <──┐         (installed once)
├── plugins/platforms/       │
│   └── libqeglfs.so         │  RUNPATH inside the binary
└── qml/...                  │  points here
                              │
/opt/squared/                 │      ← from install-arm/
└── bin/Squared ───────────────┘        (redeployed every change)
```

If you'd rather mirror the self-contained bundle approach used on desktop and Android instead (drop the RUNPATH flag, run Qt's own deploy script on install, ship a fat tree with `lib/`, `plugins/`, and `qml/` sitting right next to the binary), that's equally valid; it's just a different tradeoff between a smaller redeploy payload (this system-Qt model) and a fully self-contained one.

One last detail that makes the whole pipeline fast on every run after the first: the stages are ordered deliberately, expensive and stable work first, cheap and changing work last. Building Qt twice is slow, but its source never changes, so Docker caches those layers. `COPY project` sits near the bottom, so editing Squared's own code only invalidates that layer and the couple after it; the two Qt builds stay cached untouched.

## build.sh: One Command for the Whole Thing

Every piece above becomes one script, `arm64-pi/build.sh`, whose job is to run the pieces in order and copy the results out. Its shape:

```bash
#!/bin/bash
set -e

# Stage 1: build the sysroot, but only if it's missing
if [ ! -f rasp.tar.gz ] || [ "$REBUILD_SYSROOT" = true ]; then
    docker buildx build --platform linux/arm64 --load -f DockerFileRasp -t raspsysroot .
    docker create --name tmpsysroot raspsysroot
    docker cp tmpsysroot:/build/rasp.tar.gz .
    docker rm tmpsysroot
fi

# Stage the app source into a throwaway build context
rm -rf project && mkdir -p project
rsync -a --exclude='build*' --exclude='.git' "$PROJECT_DIR/" project/

# Stage 2: the big four-build sequence
docker build -t squaredcrossbuild .
docker create --name tmpbuild squaredcrossbuild

# Pull the results out
docker cp tmpbuild:/build/install-arm ./out/install-arm
docker cp tmpbuild:/build/qt-pi-binaries.tar.gz ./out/   # only if not already present
docker rm tmpbuild
rm -rf project
```

`set -e` is bash's fail-fast switch: any command exiting non-zero stops the script immediately, rather than letting a broken build limp along. The sysroot check (`[ ! -f rasp.tar.gz ]`) means the slow ARM-emulated `apt` install only ever runs once; every later invocation just reuses the cached tarball unless you explicitly pass `--rebuild-sysroot`.

The `docker create` / `docker cp` / `docker rm` pattern shows up twice, and it's worth understanding why the script never uses `docker run` here. Image layers are read-only, and there's no `docker cp` that reads directly from an image. `docker create` materializes a container from the image without starting any process inside it, a thin writable scratch layer stacked on the image's read-only ones; through that container, `docker cp` can see and pull files out of the finished filesystem. Create the door, copy through it, remove it.

Two artifacts come out with deliberately different lifecycles. `install-arm/` (just `bin/Squared` and a small `share/` directory of icons and desktop metadata) gets re-extracted on *every* run, since it changes every time you touch the code. `qt-pi-binaries.tar.gz` gets extracted only once and reused across many builds, since it only needs regenerating if you rebuild Qt itself with different options, which is rare.

Running it for the first time:

```bash
cd arm64-pi
./build.sh
```

Be patient. The first run compiles Qt from source twice (once for the host, once for ARM) and typically takes 30 to 60 minutes on a decent machine. That's a one-time cost. When it finishes, `arm64-pi/out/` holds two things:

```
out/
    install-arm/            # bin/Squared + share/ (.desktop, icons)
    qt-pi-binaries.tar.gz   # the ARM Qt runtime, for /usr/local/qt6 on the Pi
```

## Where the App Actually Lives on the Pi

Before deploying anything, there's a question that doesn't even come up on desktop: what is the app running *on top of*? There are really two scenarios.

**Scenario A: Squared as one app on a stock Pi OS desktop.** You flash the standard Raspberry Pi OS image (the one with a full desktop), boot the Pi, and there's a taskbar and wallpaper waiting, just like a small Linux PC. Squared opens in a window like any other app. This is the gentler path for getting your feet wet: you can SSH in, see errors normally, and the Pi behaves predictably. The wrinkle is that a Pi 4 and Pi 5 both run Wayland-based desktops by default (different compositors, but Qt talks to both the same way), and occasionally Qt doesn't auto-detect which display server to use, producing a "platform plugin not found" error that a single environment variable fixes. The tradeoff: it's not a kiosk. Users see a desktop, window borders, a taskbar. Fine for an internal tool, not for a product where the customer should never see anything but your app.

**Scenario B: Squared owning the whole device, the kiosk.** The Pi boots to a plain console, no desktop at all, and the only thing on screen is Squared, fullscreen, like a point-of-sale terminal. This is what most people actually mean by "embedded," and it's what `eglfs` (EGL fullscreen) is for: it talks to the GPU through the kernel's display interface directly, paints the entire screen, and reads input straight from `/dev/input/...`, with no compositor or window manager in the loop at all. This is exactly what the EGL, GBM, and DRM libraries in the sysroot were preparation for.

The two boards diverge slightly here. On a **Pi 4**, `eglfs` is a well-trodden path; the GPU driver and kernel display interface cooperate smoothly, and the only common mistake is forgetting to *tell* Qt to use `eglfs` at all (its default guess on Linux is X11, which doesn't exist on a console-only Pi). On a **Pi 5**, `eglfs` can work, but the board's redesigned display pipeline sometimes makes Qt pick the wrong display device on the first try, needing a small config file to point it at the right one explicitly. A pragmatic middle path some people take on the Pi 5 specifically: keep the stock desktop (Scenario A) but launch the app fullscreen at startup, sidestepping the `eglfs` quirks entirely while looking identical to a kiosk from the user's seat.

## Deploy and Launch

With `install-arm/` and `qt-pi-binaries.tar.gz` in hand, first-time setup on the Pi is three small steps:

```bash
# 1. Qt runtime, installed once, to the exact path Qt was built expecting
scp arm64-pi/out/qt-pi-binaries.tar.gz user@pi:~/
ssh user@pi 'sudo mkdir -p /usr/local/qt6 && sudo tar -xf qt-pi-binaries.tar.gz -C /usr/local/qt6'

# 2. App directory, owned by you so plain scp can write to it
ssh user@pi 'sudo mkdir -p /opt/squared && sudo chown $USER /opt/squared'

# 3. The app itself
scp -r arm64-pi/out/install-arm/* user@pi:/opt/squared/
```

The Qt runtime only ever needs installing once; every later deployment re-copies just the application files. Now SSH in and try running the binary directly:

```bash
ssh user@pi
/opt/squared/bin/Squared
```

Notice what you didn't have to do: no `LD_LIBRARY_PATH`, no `cd`ing into a bundle directory. The binary's RUNPATH already points at `/usr/local/qt6/lib`, so the loader finds Qt on its own. It still fails, though, with something like:

```
could not find or load the Qt platform plugin "xcb"
```

This is expected, and it's the single most common stumble in embedded Qt deployment. With no instructions, Qt fell back to its desktop default and tried `xcb` (Qt's X11 platform plugin). The Pi has no X11 server running, so `xcb` had nothing to talk to. The fix is the one environment variable this whole chapter has been building toward:

```bash
QT_QPA_PLATFORM=eglfs /opt/squared/bin/Squared
```

And there it is: Squared, fullscreen, no window decorations, no taskbar. The lesson worth internalizing permanently: **on embedded boards, always set `QT_QPA_PLATFORM` explicitly.** Never rely on the default; the default is tuned for desktops.

In practice you'll set a few more variables too, mostly because embedded displays are frequently bad at reporting their own physical dimensions, which throws off Qt's DPI guess and leaves fonts comically large or unreadably small:

| Variable | What it does |
|---|---|
| `QT_QPA_PLATFORM=eglfs` | EGL fullscreen, direct GPU, no window manager |
| `QT_QPA_EGLFS_PHYSICAL_WIDTH` / `_HEIGHT` | Physical screen size in mm, for DPI calculation |
| `QT_FONT_DPI` | Override the DPI calculation entirely |
| `QT_QPA_EGLFS_ROTATION` | Rotate output, for portrait-mounted screens |

Rather than typing a pile of `export` lines over SSH every time, wrap them in one launch script, `arm64-pi/run.sh`:

```bash
#!/bin/sh
export QT_QPA_PLATFORM=eglfs
export QT_QPA_EGLFS_PHYSICAL_WIDTH=800
export QT_QPA_EGLFS_PHYSICAL_HEIGHT=480
export QT_FONT_DPI=96
exec /opt/squared/bin/Squared "$@"
```

Using `exec` here matters: it *replaces* the shell process with the Squared process, rather than leaving an idle shell hanging around as a parent. This script becomes the one place display configuration lives; swap the screen for a different one, and you edit exactly one file.

## Updating the Application

Sooner or later you'll change the code, and the update loop is short precisely because the hard work is already cached:

```bash
./build.sh
scp -r out/install-arm/* user@pi:/opt/squared/
```

Then on the Pi, kill the running process (`ssh user@pi pkill Squared`) and relaunch with `run.sh`. The pleasant part is `./build.sh` itself: because the Dockerfile's `COPY project` line sits near the bottom, after both Qt builds, Docker recognizes that only the application layer changed, reuses every cached Qt layer, and rebuilds just the final stage. Minutes instead of an hour. If all you touched was a QML file, it's faster still.

For repeated updates, `rsync` beats `scp -r` by only sending what actually changed:

```bash
rsync -avz --delete --exclude='run.sh' \
    out/install-arm/ user@pi:/opt/squared/
```

`--delete` removes files on the Pi that no longer exist in your build, so a renamed binary or dropped resource doesn't linger and cause confusion later. The `--exclude='run.sh'` matters just as much: that script lives in `/opt/squared/` but isn't part of `install-arm/` (it was copied there separately by hand), and without the exclusion `--delete` would happily wipe it out on the next sync.

For a handful of boards on a desk or a factory floor, `rsync` over SSH is genuinely all you need. It stops scaling once you're managing hundreds or thousands of devices in the field, where "SSH in and rsync" isn't a plan anymore: some devices will be offline when you push, and an update interrupted mid-write can brick a device with no remote recovery path. Purpose-built tools exist for exactly that problem, like **SWUpdate** (dual-copy updates with delta support), **Mender** (a managed fleet-management service), and **RAUC** (slot-based updates with cryptographic verification). What all three add over plain `rsync` is atomicity (a device is always either fully on the old version or fully on the new one, never half-written) and rollback (if the new version fails to boot, it falls back automatically). Worth knowing they exist for when a deployment eventually outgrows a shell script, even if none of them are needed for the scale this chapter targets.

## The Takeaway

Every piece of this pipeline traces back to one constraint stated at the very top: there's no pre-built cross-compilation kit for embedded Linux the way there is for Android or iOS, so you build every layer of it yourself, once, and let Docker make that process reproducible and fast on every run after the first. The sysroot is just a photocopy of a Pi's `/usr`. The toolchain file is just three settings CMake needs to stop assuming it's building for the host. The four-stage Dockerfile is just "build the tools you need to build Qt, then build Qt, then build the app," done twice because host tools and target libraries are architecturally different things. And `eglfs` is just Qt talking to the GPU directly instead of negotiating through a desktop that was never going to be there.

None of it is exotic once you see how the pieces connect, and the payoff is real: the exact same Squared source and QML files that run on Windows, Linux, macOS, Android, and iOS elsewhere in this course, now running fullscreen on a $35 board with no desktop at all.

If you want to see this whole path built from scratch, alongside the same app shipped to every other platform Qt supports, with a GitHub Actions pipeline tying it all together, I walk through it in my [Qt QML Cross-Platform Deployment course](/courses/qt-qml-deployment/). Nine chapters, one Qt QML application, every platform Qt supports.

Happy shipping!
