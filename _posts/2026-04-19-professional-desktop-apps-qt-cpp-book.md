---
layout: post
title: "Professional Desktop Apps with Qt and C++: A New Book on Building a Real Cross-Platform System Monitor"
description: A new book that takes you from an empty Qt project to a complete, themed, cross-platform system monitor. Real OS APIs, custom QPainter widgets, real-time charts, and a clean three-layer architecture across Windows, Linux, and macOS.
cover: /assets/img/blog/system-monitor-book/system-monitor-dark.png
date: '2026-04-19'
categories:
    - Qt 6
tags:
    - Qt 6
    - Qt Widgets
    - C++
    - Cross-Platform
    - Custom Widgets
    - QPainter
comments: true
sidebar: true

coursescard: true
bookcard: true
---

Most Qt tutorials show you a button that prints "Hello World" and call it a desktop application. They are not wrong, technically. But they leave you stuck in the gap between "I can follow a tutorial" and "I can actually build something real."

I wrote a new book to close that gap, and it is now live on Amazon: [Professional Desktop Apps with Qt and C++: Build a Complete System Monitor with Custom Widgets, Real-Time Charts, and Cross-Platform Architecture](https://www.amazon.com/dp/B0GXQ62235).

The premise is simple. You build one non-trivial application from an empty Qt Creator project all the way to a polished, themed, cross-platform desktop tool. Not a toy. A real system monitor that talks to the operating system, samples live data, paints custom widgets, and runs natively on Windows, Linux, and macOS.

Here is what you end up with by the final chapter:

<img src="/assets/img/blog/system-monitor-book/system-monitor-dark.png" alt="Completed System Monitor in Dark Theme" style="max-width: 100%; height: auto; width: 700px;">

That is real CPU usage, real memory pressure, real disk capacity, real network throughput, and a real list of processes that your operating system is actually running. Every number you see was pulled from a platform API the book teaches you to call directly.

## What This Book Is Actually About

The book is built around one idea: you learn to build real software by building real software. No mock data. No "imagine if this were a database." Every iteration adds a piece you can build, run, and see working before the next chapter starts.

If you know some C++ and you have done a tutorial or two on Qt, this book is the next step. It does not assume you have ever touched the Win32 API, or `/proc`, or Mach kernel calls. It does assume you are willing to compile something, run it, and look at the output before turning the page.

## The Seven Iterations

The application is built across seven progressive iterations, each one a self-contained chapter that leaves the project in a runnable state. You never spend forty pages writing code that does not compile.

**Iteration 1** sets up a clean Qt Creator project. Empty window. That is the entire goal of the chapter, and it is the right place to start.

**Iteration 2** is where the real fun begins. You build the data collection layer that talks directly to the operating system. Three implementations, one common interface:

- **Windows**: Performance Data Helper (PDH), `GlobalMemoryStatusEx`, IP Helper, Tool Help, PSAPI
- **Linux**: `/proc/stat`, `/proc/meminfo`, `/proc/net/dev`, `/proc/[pid]/...`, `sysinfo()`, `statvfs()`
- **macOS**: `host_statistics64`, `sysctlbyname`, `getifaddrs`, `proc_listpids`, `proc_pidinfo`

CMake picks the right source file at build time. Preprocessor guards keep each platform safe. By the end of the chapter you have console output proving that all three platforms return real numbers.

**Iteration 3** introduces the `SystemMonitor` business logic class. A `QTimer` polls the data layer once a second, signals fire when values change, and the rest of the application stops caring about platform details forever. This is the layer that makes the architecture clean.

**Iteration 4** is where the UI starts to feel like a real product. You build a custom `InfoCard` widget from scratch using `QPainter`. Icon, title, big value, subtitle, percentage bar, theme-aware colors. Reusable. Composable. Yours.

<img src="/assets/img/blog/system-monitor-book/info-cards.png" alt="Custom InfoCard Widgets in a Grid" style="max-width: 100%; height: auto; width: 700px;">

**Iteration 5** is the chapter people will probably enjoy most. You build a real-time scrolling line chart from nothing. No QtCharts. Just `QPainter`, a vector of data points, a paint event, and the patience to add one feature at a time. Grid lines first. Then axis labels. Then the data line. Then a filled gradient under it. Then Bezier smoothing. Then a value badge. Each step compiles and runs.

<img src="/assets/img/blog/system-monitor-book/chart-gradient.png" alt="Custom ChartWidget with Gradient Fill and Smoothed Line" style="max-width: 100%; height: auto; width: 700px;">

By the end of the chapter, you have three of them on screen, sampling at 1 Hz, scrolling smoothly:

<img src="/assets/img/blog/system-monitor-book/system-charts.png" alt="Three Custom Charts Tracking CPU, Memory, and Network" style="max-width: 100%; height: auto; width: 700px;">

**Iteration 6** adds a `ProcessTableWidget` that subclasses `QTableWidget` to show the top processes by memory, updating without flicker.

<img src="/assets/img/blog/system-monitor-book/process-table.png" alt="ProcessTableWidget Showing Top Processes by Memory" style="max-width: 100%; height: auto; width: 700px;">

**Iteration 7** brings everything together. Menus, tabs, a `Theme` class that flips the entire UI between dark and light through a single `QPalette` change. This is the chapter that turns a working prototype into something that looks and feels like an application you would actually ship.

Here is the same app in light mode, after the theme system goes in:

<img src="/assets/img/blog/system-monitor-book/system-monitor-light.png" alt="Completed System Monitor in Light Theme" style="max-width: 100%; height: auto; width: 700px;">

One application. Two themes. Zero changes to the widgets that draw the cards or the charts. That is what a clean theming layer buys you.

## Why a Three-Layer Architecture Matters

Every chapter pulls toward the same architectural shape. Three layers, each with one job:

1. **Data Collection.** Free functions in a `SystemInfo` namespace, with three platform-specific implementations selected at build time.
2. **Business Logic.** A `SystemMonitor` class that polls, caches, and emits signals. No UI code. No platform conditionals.
3. **Presentation.** `MainWindow` and the custom widgets. They listen for signals and update themselves. They never poll. They never call platform APIs.

The reason the book keeps coming back to this is that it actually transfers. You will use this same pattern on the next desktop project you build, even if it has nothing to do with system monitoring. Knowing where to put a thing is most of what makes a codebase pleasant to work in two years later.

## The Code Is Real, And There Is a Lot of It

The book shows complete code. No `...` elisions. No "rest of the implementation is left as an exercise." If a function is on the page, it is a function you can copy into your project and watch compile.

Every chapter follows the same rhythm. Show the code. Walk through what it does. Tell you to build and run. Describe what you should see. Then move on. If you have ever read a programming book that left you guessing whether your output was right, you know how much that rhythm matters.

The full source is also mirrored on GitHub at [github.com/rutura/SystemMonitor](https://github.com/rutura/SystemMonitor) so you can compare your code against the reference at any iteration boundary.

## A Look Inside the Book

Rather than tell you what the book reads like, here are real pages from it. Code, diagrams, screenshots-in-context. Every page below is from the actual PDF you would download.

The Project Overview chapter sets the bar by showing real, custom-painted charts running against live system data:

<img src="/assets/img/blog/system-monitor-book/page-charts-overview.png" alt="Book page showing real-time charts from Chapter 1" style="max-width: 100%; height: auto; width: 650px;">

It then explains exactly why building this one project will teach you more than any number of disconnected tutorials:

<img src="/assets/img/blog/system-monitor-book/page-why-more-than-tutorials.png" alt="Book page - Why This Project Will Teach You More Than Most Tutorials" style="max-width: 100%; height: auto; width: 650px;">

The Data Collection chapter is where the cross-platform work really begins. On Windows, you implement `getCpuUsage()` against the Performance Data Helper API:

<img src="/assets/img/blog/system-monitor-book/page-windows-pdh.png" alt="Book page showing Windows PDH implementation of getCpuUsage()" style="max-width: 100%; height: auto; width: 650px;">

Then the same function on macOS, this time talking to the Mach kernel through `host_statistics64`:

<img src="/assets/img/blog/system-monitor-book/page-macos-mach.png" alt="Book page showing macOS Mach kernel implementation" style="max-width: 100%; height: auto; width: 650px;">

And the Linux memory implementation, parsing real values straight out of `/proc/meminfo`:

<img src="/assets/img/blog/system-monitor-book/page-linux-memory.png" alt="Book page showing Linux memory implementation" style="max-width: 100%; height: auto; width: 650px;">

Network statistics on Windows lean on the IP Helper API, with the book walking you through every field you need to read:

<img src="/assets/img/blog/system-monitor-book/page-windows-network.png" alt="Book page showing Windows IP Helper network code" style="max-width: 100%; height: auto; width: 650px;">

Once the data layer is done, Chapter 4 introduces the `SystemMonitor` business-logic class with its full set of Qt signals and getters:

<img src="/assets/img/blog/system-monitor-book/page-systemmonitor-class.png" alt="Book page showing the SystemMonitor class declaration" style="max-width: 100%; height: auto; width: 650px;">

Then the InfoCard chapter shows you how to set up a fully custom widget, complete with a `QGraphicsDropShadowEffect` glow, theme-aware styling, and a clean layout structure:

<img src="/assets/img/blog/system-monitor-book/page-infocard-setupui.png" alt="Book page showing InfoCard setupUI() implementation" style="max-width: 100%; height: auto; width: 650px;">

The chart chapter is where things get really visual. Here is the page that wires three `ChartWidget` instances into `MainWindow` and connects them to the live data stream:

<img src="/assets/img/blog/system-monitor-book/page-chart-integration.png" alt="Book page showing chart widget integration in MainWindow" style="max-width: 100%; height: auto; width: 650px;">

And here is the page where the chart line gets Bezier-smoothed, with a screenshot of the result on the same page so you know exactly what you should see:

<img src="/assets/img/blog/system-monitor-book/page-bezier-chart.png" alt="Book page showing Bezier curve smoothing with result screenshot" style="max-width: 100%; height: auto; width: 650px;">

That is the rhythm of the whole book. Code, walkthrough, build, screenshot of the result. Page after page.

## Who This Book Is For

It is for you if:

- You know some C++ and you want to graduate from toy tutorials to real applications.
- You want to understand how desktop software actually talks to the operating system on three different platforms.
- You want to build custom widgets from scratch with `QPainter`, not just glue together stock controls.
- You are tired of tutorials that explain syntax and leave you stuck on architecture.
- You want one finished, polished project on your hard drive at the end, not seven half-built experiments.

It is probably not the right book if you have never written any C++ at all, or if you are looking for a Qt Quick / QML book. The focus here is Qt Widgets with C++17, on the desktop, on all three major platforms.

## Companion to the LearnQt Course Platform

The book is companion material to the [LearnQt Course Platform](https://www.learnqt.guide/), and in particular to the [Desktop Apps with Qt Widgets and C++ course](https://www.learnqt.guide/courses/qt-widgets-cpp/). If you prefer learning by reading at your own pace, the book stands on its own. If you prefer watching me build it on screen, the course is there. They are designed to fit together, not compete.

## Grab a Copy

You can pick up the book on Amazon here: [Professional Desktop Apps with Qt and C++](https://www.amazon.com/dp/B0GXQ62235).

If you have been looking for a Qt project that is meaty enough to actually teach you something but small enough to finish, this is it. Open Qt Creator, start with an empty MainWindow, and by the time you reach the last chapter you will have a real cross-platform desktop application that you built end to end, that you understand line by line, and that runs on every desktop OS your users care about.

Happy coding!
