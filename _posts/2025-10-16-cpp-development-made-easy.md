---
layout: post
title: "C++ Development Made Easy: Why I Ditched VS Code Tasks for Full IDEs with CMake"
description: From Manual Compiler Setup to Seamless Development with Visual Studio and Qt Creator.
cover: /assets/img/blog/cpp20-m-tool-update/vsstudio.png
date: '2025-10-16'
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

They definitely radiated the same enerty I had making the course. Enjoying manually setting up the compilers, having the power to seemlesly switch between MSVC, GCC and Clang almost makes you feel like a small god. I am not lying! As I came to realize later, the feeling wasn't shared by all students, especially those not keen on fiddling with environment setup, but ready to just tackle C++ development. 

I then thought of reducing that pain, but still give to students to a decent compiler that would handle most of C++ 20, and get the code to work regardless of the Operating System the students are using. On Windows, I could use Microsoft Visual Studio as its support for C++ 20 has been top notch at least for the last 2 or three years. The problem was Linux and Mac. For Linux, students could use GCC or Clang, but the default compilers that you get through package managers were old, forcing students to install their own slightly shinier versions of the compilers. I have come to learn that at least 80% of the students don't appreciate the effort it takes these things to work properly.

But now we are in 2025 and some of my favorite tools have good support for most of the things we do in the [C++20 Masterclass](https://www.udemy.com/course/the-modern-cpp-20-masterclass/?couponCode=STARTAPRIL2025). You may know that Qt is my favorite GUI framework and I have been eyeing Qt Creator as a tool I can recommend in the course for years. Even better, the Qt project had been moving from QMake to CMake as the favored build system. 

I am happy to share that the little dream of mine, sparing the students the pain of environmnet while trying to use C++ 20 and other later standards, has finally been realized. I spent the last few weeks refactoring the code for the course to rely on CMake and make the code work without hassle with both Qt Creator and the Visual Studio IDE on Windows. Just for perspective, here is what you used to do in the old environment set up section of the course:

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

And this is only tied to the VS Code editor, making the project less portable if you wanted to switch to another IDE or editor. This process was not only tedious, but it also distracted from the main goal: learning C++20. 

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

That's it. Twelve lines of CMake, and you're ready to build complex C++20 projects on any platform. Here is a sample project in Visual Studio:

<img src="/assets/img/blog/cpp20-m-tool-update/vsstudio.png" alt="Visual Studio Example" style="max-width: 100%; height: auto; width: 600px;">

Below is the same project opened in Qt Creator, which works seamlessly on Linux and macOS. Even on Windows, Qt Creator is a fantastic free alternative to Visual Studio.

<img src="/assets/img/blog/cpp20-m-tool-update/qtcreator.png" alt="Qt Creator Example" style="max-width: 100%; height: auto; width: 600px;">

## The Benefits of This New Approach

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

## But What About Flexibility?

I can already hear the objections: "But Daniel, what about developers who prefer VS Code? What about customization? What about learning how the build system actually works?"

Fair points. Here's my take:

**VS Code still works.** The CMake setup means VS Code users get the same experience—they just need the CMake Tools extension. The same `CMakeLists.txt` that works in Visual Studio works in VS Code too.

**You still learn the build system.** CMake is more transparent than custom JSON tasks. You can see exactly what's happening, and the skills transfer to real-world projects.

**Less customization can be a feature.** When you're learning C++, you want to focus on C++, not on perfecting your build configuration. There's time for that later.

## The Bottom Line

After making this change in one of my other courses, I've seen:
- Students getting to actual C++ code faster
- Fewer "I can't get it working" support requests  
- Better debugging experiences in class
- More time spent on modern C++ features instead of tooling

The old manual setup approach taught valuable skills about how C++ compilation works. But it also created unnecessary barriers to entry. 

The new approach gets you writing and understanding C++20 features like modules, concepts, ranges, and coroutines without the ceremony. You can always dive deeper into build systems later, once you're comfortable with the language itself.


## Making the Switch

If you're starting your C++ journey, or if you're teaching C++, I strongly recommend this modern approach:

1. **Windows users**: Download Visual Studio 2022 Community (free)
2. **Linux/Mac users**: Install Qt Creator (free)
3. **Everyone**: Learn CMake basics (much simpler than you think)
4. **Start coding**: Focus on C++, not configuration

The [updated C++20 Masterclass](https://www.udemy.com/course/the-modern-cpp-20-masterclass/?couponCode=STARTAPRIL2025) now uses this approach throughout. Students are getting to advanced C++20 features faster and with less frustration. The difference is night and day.

## What's Next?

This tooling change is just the beginning. With students spending less time fighting build systems, we can spend more time exploring the incredible features that make C++20 such an exciting language to learn and use. Speaking of which, if you missed my recent post on [The Ranges Library in C++20](/cpp-20-ranges.html), check it out. It's exactly the kind of modern C++ feature that's much more fun to explore when your development environment just works.

**Ready to experience C++ development the way it should be?** The [C++20 Masterclass](https://www.udemy.com/course/the-modern-cpp-20-masterclass/?couponCode=STARTAPRIL2025) has been completely updated with this new approach. No more configuration headaches, no more tooling frustration—just pure C++ learning from day one.

Let me know in the comments what your experience has been with C++ development environments. What tools do you use? What challenges have you faced? And if you've tried this new approach, how has it changed your learning or development experience? 