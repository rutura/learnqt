---
layout: post
title: "C++ Development Made Easy: Why I Ditched VS Code Tasks for Full IDEs with CMake"
description: From Manual Compiler Setup to Seamless Development with Visual Studio and Qt Creator.
cover: /assets/img/blog/cpp-development-made-easy/cpp-development-hero.png
date: '2025-01-16'
categories:
    - C++
tags:
    - Modern C++
    - Development Tools
    - CMake
    - Visual Studio
    - Qt Creator
comments: true
sidebar: true

coursescard: true
bookcard: true
---

The [C++20 Masterclass](https://www.udemy.com/course/the-modern-cpp-20-masterclass/?couponCode=STARTAPRIL2025) as had a good run for the last 4 or 5 years has gathered more than 35,000 students as of October 2025. I really got excited about C++ when I first learnt about its development around 2019 and started reading extensively about it even before it officially got released. That meant manually pulling compiler patches and trying things like coroutines and concepts on whatever compiler happened to have these features implemented.

That was fun for me, as it filled me with a sense of enjoyment I can't explain, to get these things running on my machines. I was almost 100 % sure students would completely enjoy the process and started planning the C++ Masterclass in my head. I kept planning in my head and actually started drafting the curriculum for the course in many of those quarantine days of 2020. I planned for the course to be no more than 30 hours but I wanted this to be really useful for people starting out, so it kept growing and before I knew it, I was past the 100 hour mark. I have to admit that, having spent at least almost a decade writting C++ proffissionaly, spending hours talking about stream operators sounded boring at times, but I was determined to make it the most beginner friendly C++ course out there. I was greatly pleased when I realeased the course in 2021 and I almost instantly started getting positive reviews from students. Here is one of the first reviews to pour in.

![One of the Positive Reviews](/assets/img/blog/cpp20-m-tool-update/review1.png)

They definitely radiated the same enerty I had making the course. Enjoying manually setting up the compilers, having the power to seemlesly switch between MSVC, GCC and Clang almost makes you feel like a small god. I am not lying!


If you've ever tried to get started with C++ development, you know the drill: spend hours setting up compilers, configuring build systems, wrestling with `tasks.json` files, and debugging path issues before you even write your first `Hello World` program. It's like having to assemble your car before you can learn to drive.

Well, I've had enough of that. After years of teaching C++ and watching students get frustrated before they even started coding, I made a big change to my [C++20 Masterclass](https://www.udemy.com/course/the-modern-cpp-20-masterclass/?couponCode=STARTAPRIL2025). Out with the manual VS Code compiler configurations. In with full-featured IDEs that just work.

Let me tell you why this change is a game-changer for C++ beginners and seasoned developers alike.

## The Old Way: Pain Before Programming

Picture this: you're excited to learn modern C++. You install VS Code, then spend the next two hours:

- Installing MinGW or MSVC manually
- Setting up compiler paths
- Writing cryptic `tasks.json` files
- Configuring `c_cpp_properties.json`
- Debugging why your includes aren't working
- Fighting with build configurations

Here's what a typical VS Code setup used to look like in the old course materials:

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "type": "cppbuild",
            "label": "C/C++: g++.exe build active file",
            "command": "C:\\msys64\\mingw64\\bin\\g++.exe",
            "args": [
                "-fdiagnostics-color=always",
                "-g",
                "-std=c++20",
                "${file}",
                "-o",
                "${fileDirname}\\${fileBasenameNoExtension}.exe"
            ],
            "options": {
                "cwd": "${fileDirname}"
            },
            "problemMatcher": ["$gcc"],
            "group": {
                "kind": "build",
                "isDefault": true
            }
        }
    ]
}
```

And that's just for a single file! Multi-file projects? Good luck with that complexity.

![Old VS Code Setup](/assets/img/blog/cpp-development-made-easy/old-vscode-setup.png)

By the time you finally got everything working, your enthusiasm for actually learning C++ had probably taken a serious hit. I watched too many students give up at this stage, and frankly, I don't blame them.

## The New Way: CMake + Modern IDEs = Pure Joy

So what changed? Three words: **Visual Studio**, **Qt Creator**, and **CMake**.

Instead of manual compiler management, I've reworked the entire course to use:

- **Visual Studio 2022** on Windows (free Community edition)
- **Qt Creator** on Linux and macOS (completely free and excellent)
- **CMake** as the build system that ties everything together

Here's what the same project looks like now. This is the complete setup for a C++20 project:

```cmake
cmake_minimum_required(VERSION 3.20)

# Project name
project(rooster)

# Set C++ standard to C++20
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Create executable
add_executable(rooster main.cpp)

# For multi-file projects with headers and separate .cpp files
# add_executable(rooster main.cpp dog.cpp dog.h cat.cpp cat.h)
```

That's it. Twelve lines of CMake, and you're ready to build complex C++20 projects on any platform.

![New IDE Setup](/assets/img/blog/cpp-development-made-easy/new-ide-setup.png)

## Why This Changes Everything

### 1. **Zero Configuration Anxiety**

Both Visual Studio and Qt Creator come with everything you need:
- Modern C++20 compliant compilers
- IntelliSense/code completion that actually works
- Built-in debuggers
- CMake integration out of the box
- Package managers for dependencies

No more hunting for compiler installations or deciphering cryptic error messages about missing headers. You download the IDE, open your CMake project, and start coding.

### 2. **Cross-Platform Consistency**

The beauty of CMake is that the same `CMakeLists.txt` works everywhere:

```cpp
#include <iostream>

int main(){
    std::cout << "Number1" << std::endl;
    std::cout << "Number2" << std::endl;
    std::cout << "Number3" << std::endl;
    return 0;
}
```

This simple program builds and runs identically whether you're on:
- Windows with Visual Studio
- Linux with Qt Creator  
- macOS with Qt Creator
- Or even VS Code if you really want to

The build system is consistent. The debugging experience is consistent. The project structure is consistent.

### 3. **Professional Development Workflow**

Real C++ projects use CMake. Real C++ developers use full-featured IDEs. By starting with these tools from day one, you're learning industry standards, not toy configurations.

You're also getting:
- Proper project templates
- Integrated testing frameworks
- Dependency management
- Version control integration
- Performance profiling tools

All without any manual setup.

### 4. **Focus on C++, Not Tooling**

Here's the thing that really sold me on this approach: **students start learning C++ immediately**.

No more losing half the first lesson to tooling setup. No more "it works on my machine" problems. No more debugging JSON configuration files when you should be debugging actual C++ code.

The old approach had its place when we needed maximum flexibility. But for learning modern C++? The new approach wins hands down.

## Real Example: From Pain to Pleasure

Let me show you a concrete example. Here's how the same first C++ program experience differs:

**Old way (VS Code + manual setup):**
1. Install VS Code
2. Install compiler toolchain manually
3. Configure paths and environment variables
4. Write tasks.json configuration
5. Debug why compiler isn't found
6. Create c_cpp_properties.json
7. Test build system
8. Finally write `Hello World`
9. Spend 20 minutes figuring out why includes don't work

**New way (Visual Studio/Qt Creator + CMake):**
1. Install IDE (one download, one installer)
2. Create new CMake project
3. Write your C++ code
4. Hit build and run

You can see the difference. One approach gets you coding in 5 minutes. The other might take hours, and that's if you're lucky.

## The `.gitignore` That Works Everywhere

Another nice touch with the new setup: a comprehensive `.gitignore` that handles all the IDE-specific files you don't want in version control:

```gitignore
# IDE and Editor files
.vscode/*
.vs/
.idea/

# Build directories (nested anywhere)
**/build/
**/Build/
**/out/
**/bin/

# Visual Studio files
*.user
*.suo
*.vcxproj.user

# Qt Creator files
*.pro.user
CMakeLists.txt.user
*.autosave

# CMake generated files
CMakeCache.txt
CMakeFiles/
cmake_install.cmake
```

One `.gitignore` file that covers Visual Studio, Qt Creator, VS Code, and any other IDE someone might use. Clean repositories, happy team members.

## But What About Flexibility?

I can already hear the objections: "But Daniel, what about developers who prefer VS Code? What about customization? What about learning how the build system actually works?"

Fair points. Here's my take:

**VS Code still works.** The CMake setup means VS Code users get the same experience—they just need the CMake Tools extension. The same `CMakeLists.txt` that works in Visual Studio works in VS Code too.

**You still learn the build system.** CMake is more transparent than custom JSON tasks. You can see exactly what's happening, and the skills transfer to real-world projects.

**Less customization can be a feature.** When you're learning C++, you want to focus on C++, not on perfecting your build configuration. There's time for that later.

## The Bottom Line

After making this change, I've seen:
- Students getting to actual C++ code faster
- Fewer "I can't get it working" support requests  
- Better debugging experiences in class
- More time spent on modern C++ features instead of tooling

The old manual setup approach taught valuable skills about how C++ compilation works. But it also created unnecessary barriers to entry. 

The new approach gets you writing and understanding C++20 features like modules, concepts, ranges, and coroutines without the ceremony. You can always dive deeper into build systems later, once you're comfortable with the language itself.

![Modern C++ Features](/assets/img/blog/cpp-development-made-easy/modern-cpp-features.png)

## Making the Switch

If you're starting your C++ journey, or if you're teaching C++, I strongly recommend this modern approach:

1. **Windows users**: Download Visual Studio 2022 Community (free)
2. **Linux/Mac users**: Install Qt Creator (free)
3. **Everyone**: Learn CMake basics (much simpler than you think)
4. **Start coding**: Focus on C++, not configuration

The [updated C++20 Masterclass](https://www.udemy.com/course/the-modern-cpp-20-masterclass/?couponCode=STARTAPRIL2025) now uses this approach throughout. Students are getting to advanced C++20 features faster and with less frustration.

You can check out the old manual setup approach [here in the main branch](https://github.com/rutura/The-C-20-Masterclass-Source-Code/tree/main/03.FirstSteps), and compare it with the [new streamlined approach here](https://github.com/rutura/The-C-20-Masterclass-Source-Code/tree/tooling_rework/03.FirstSteps/3.2FirstCppProgram).

The difference is night and day.

## What's Next?

This tooling change is just the beginning. With students spending less time fighting build systems, we can spend more time exploring the incredible features that make C++20 such an exciting language to learn and use.

Speaking of which, if you missed my recent post on [The Ranges Library in C++20](/cpp-20-ranges.html), check it out. It's exactly the kind of modern C++ feature that's much more fun to explore when your development environment just works.

**Ready to experience C++ development the way it should be?** The [C++20 Masterclass](https://www.udemy.com/course/the-modern-cpp-20-masterclass/?couponCode=STARTAPRIL2025) has been completely updated with this new approach. No more configuration headaches, no more tooling frustration—just pure C++ learning from day one.

Let me know in the comments what your experience has been with C++ development environments. Have you made the switch to modern IDEs? Are you still wrestling with manual configurations? I'd love to hear your thoughts!