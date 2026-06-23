---
layout: post
title: "Splitting Qt6 QML Advanced Into Two Books"
description: The Qt6 QML Advanced book got too big for one volume, so it is now two. Advanced wraps up by the end of June 2026, both titles will be on Amazon and Gumroad, and early-access buyers get both.
cover: /assets/img/blog/qt6-qml-architecture/github-explorer-full.png
date: '2026-06-23'
categories:
    - Qt 6
tags:
    - Qt 6
    - QML
    - C++
    - Books
comments: true
sidebar: true

coursescard: true
bookcard: true
---

Quick update on the [Qt6 QML Advanced](https://dgakwaya.gumroad.com/l/qt6_qml_advanced) book. It got too big for one book, so I'm splitting it into two.

## Why

Here's the whole story. The plan was always a single Advanced book. But somewhere along the way I decided I wanted to offer it in print on Amazon, the same way I do for the [beginner book](https://www.amazon.com/dp/B0CPFLPCRK).

That's where the problem showed up. By the time I made that call, I was already around four hundred pages in, and the book wasn't finished. Looking at what was left to write, it was clearly headed for somewhere near a thousand pages. A thousand-page paperback isn't really a book you want to print, hold.

So I split it, following the plan I'd already laid out. And the split lands at a natural seam, because the first half and the second half are doing two different things.

The first half is about getting fluent with QML and C++ together: custom types, real REST clients, custom models backed by live data, caching, threading, and a reusable library you build and publish yourself.

The second half is about shipping a product: custom visual components and charts, deep control over the QML engine, a plugin system, a full IoT dashboard on a Raspberry Pi, testing, profiling, and an actual release pipeline.

Two books, each a sensible size to print and read, each with one clear focus.

## The two books

**[Qt6 QML Advanced](https://dgakwaya.gumroad.com/l/qt6_qml_advanced)** keeps its name. Five chapters, around 650 pages:

- QML and C++ integration fundamentals
- A REST API client with custom types against the real GitHub API
- Custom models with `QAbstractListModel`, sorting, filtering, and JSON persistence
- REST-backed models with pagination, a threaded cache layer, and background JSON parsing
- A reusable foundation library, `QmlAdvCore`, published to its own GitHub repo

That last library isn't busywork. The second book consumes it, so you end up reusing your own code.

**Qt6 QML Pro** is the new second book, around 570 pages. It picks up where Advanced ends:

- Custom visual components and charts with `QQuickPaintedItem`
- A QML Playground with hot reload, dynamic loading, and a plugin architecture
- A production IoT dashboard on a Raspberry Pi 5, with MQTT and SQLite (with fakes so you can build it without the hardware)
- Testing, debugging, profiling, and a real leak hunt
- Building, signing, and distributing across Windows, Linux, and macOS, with CI

Pro assumes you've done Advanced or have equivalent experience. They're meant as one journey.

## Timeline

Advanced is nearly done. I'm aiming to have it finished by the end of June 2026. Pro comes after that, and chapters land as they're ready rather than all at once.

## Where to get them

From here on, both books are in two places:

- **Amazon** for the paperback, if you like a book on the desk.
- **Gumroad** for the digital PDF and EPUB, if you'd rather download it and search the whole thing.

Same content either way. Pick the format you like, or grab both.

Qt6 QML Advanced is already up on Gumroad here: [dgakwaya.gumroad.com/l/qt6_qml_advanced](https://dgakwaya.gumroad.com/l/qt6_qml_advanced). And if you haven't seen the beginner book yet, it's the natural lead-in to all of this, available in [paperback on Amazon](https://www.amazon.com/dp/B0CPFLPCRK) and [digital on Gumroad](https://dgakwaya.gumroad.com/l/qt6_qml_for_beginners).

## If you bought early access

If you bought [Qt6 QML Advanced](https://dgakwaya.gumroad.com/l/qt6_qml_advanced) during early access, you're not losing anything in the split. You get both books, Advanced and Pro.

The deal was lifetime access to new chapters, and the book turning into two books doesn't change that. The second half isn't a separate purchase for you. Nothing to do, nothing to buy again. When Pro chapters land, they land for you too.

If there is anything you need more clarification on please reach out to me and I will be happy to help.

More once Advanced is across the line.

Happy coding!
