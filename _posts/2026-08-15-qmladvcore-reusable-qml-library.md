---
layout: post
title: "The QML Nuggets Behind border.color, Layout.fillWidth, and NumberAnimation"
description: A look at how some of QML's most convenient syntax is actually built on the C++ side, what benefits each pattern gives you, and how to package them into a reusable library of your own.
cover: /assets/img/blog/qmladvcore-library/theme-object-property-demo.png
date: '2026-08-15'
categories:
    - Qt 6
tags:
    - Qt 6
    - QML
    - C++
    - QML_ELEMENT
    - CMake
comments: true
sidebar: true

coursescard: true
bookcard: true
---

Ever written `border.color`, `Layout.fillWidth`, or `NumberAnimation on x` without thinking twice about it? They feel like they're just part of the language, like QML somehow knows what you mean. It doesn't. Each one of these little nuggets is C++ machinery someone built on purpose, so that using it would feel effortless.

In this post we crack a few of them open and look at how they work under the hood, on the C++ side, and what you actually gain by learning to build your own. The intent of the post is to give you a high level view of how these patterns work. I won't dive deep into the C++ code itself, because that would take dozens of pages. Instead, I'll sell you on the patterns and why you should care, and if you are interested, you can find a full walkthrough of this in Chapter 5 of [Qt6 QML Advanced](https://dgakwaya.gumroad.com/l/qt6_qml_advanced), which is also available on [Amazon](https://www.learnqt.guide/discounts).

The project we build is called QmlAdvCore, and it is structured as a library of reusable QML types, with a demo app that consumes it and a test suite that exercises it directly. We start by setting up the project and it is made up of two sibling projects: `QmlAdvCore` and `QmlAdvCoreDemo`. The library is a CMake project that builds a shared library, and the demo is a CMake project that links against it. We also add a test suite to the library project, so we can guard against regressions as we build each new type. The honest truth is that I wanted an excuse to show you how to use QTest though :-)

<img src="/assets/img/blog/qmladvcore-library/create-project-dialog.png" alt="Qt Creator New Project dialog for QmlAdvCore" style="max-width: 100%; height: auto; width: 500px;">

With the project in place, we then move on to build one QML property pattern, one at a time!

## Object Properties

The first nugget is dot-notation like `Theme.colors.primary`. The idea here is that we have a `Theme` property, and inside that property is a `colors` property, and inside that is a `primary` property. The dot notation is just a way to access nested properties, but the magic is that each of those properties can be a live, bindable object.

Turns out there is no special syntax behind it. It is just a `Q_PROPERTY` returning a pointer to another `QObject`, chained as deep as you like. That is exactly how a `Theme` singleton ends up owning a `ColorPalette` and a `SpacingGroup`, each with their own live, bindable properties.

<img src="/assets/img/blog/qmladvcore-library/theme-object-property-demo.png" alt="Theme.colors and Theme.spacing driving a live demo" style="max-width: 100%; height: auto; width: 350px;">

In the image above, the purple rectangle and the spacing between the items on screen are not hardcoded values. The rectangle's fill is bound to `Theme.colors.primary`, the text inside it uses `Theme.colors.onPrimary` so it always stays readable against that background, and the gap between the items comes from `Theme.spacing.medium`. Nothing on screen is a magic number. Every visual detail is read live from the one `Theme` singleton, which is exactly why this pattern is worth having: change a color or a spacing value in one place, and the whole UI updates.

**Why it's worth knowing:** any time you want a family of related settings to read as one clean, namespaced object instead of a pile of flat, loosely related properties, this is the tool. It's the difference between `Theme.colors.primary` and five unrelated top-level properties you have to remember by name.

## List Properties

Next is the pattern behind a type like `FormGroup` accepting a list of `FormField` children:

```qml
FormGroup {
    fields: [
        FormField { label: "Username" },
        FormField { label: "Password" }
    ]
}
```

The tool is `QQmlListProperty<T>`, backed by four callbacks (append, count, item-at, clear) that QML calls behind the scenes whenever it processes a list literal.

<img src="/assets/img/blog/qmladvcore-library/formgroup-demo.png" alt="FormGroup rendering fields with a Repeater" style="max-width: 100%; height: auto; width: 350px;">

In the image above, none of what you see, the "Sign In" title, the "Fields in group: 3" count, or the three rows for Username, Password, and Display name, is written by hand in QML. A `FormGroup` was declared once with a `fields: [ ... ]` list of three `FormField` objects, and a `Repeater` on the QML side reads `loginForm.fieldCount` and `loginForm.fieldAt(index)` to draw one row per field, asterisk and all, for the ones marked required. Add a fourth `FormField` to the list and a fourth row appears automatically, with zero changes to the layout code.

**Why it's worth knowing:** this is what lets a custom type accept a whole collection of declarative children, the same way `ListView.model` or a `Repeater` does. Once you have it, any container you design can grow or shrink its content purely from QML, with the C++ side just reacting to appends and removals.

## Default Properties

List properties are nice, but they still make you write `fields: [ ... ]`. One line of class metadata drops the wrapper entirely, so `Card { Rectangle {} Rectangle {} }` just works. This is also where we step up from plain `QObject` to `QQuickItem`, since now the container is a real visual item responsible for laying out its own children.

<img src="/assets/img/blog/qmladvcore-library/card-demo-complete.png" alt="Card stacking four items automatically" style="max-width: 100%; height: auto; width: 300px;">

In the image above, the purple "Profile Header" bar, the two white input rows, and the purple "Save" button are four completely ordinary `Rectangle` items, declared as plain, unlabeled children of a `Card`. There is no `contentItems: [ ... ]` anywhere in that QML. `Card` reads its own `padding` and `spacing` properties, stacks each child top to bottom, and resizes itself to fit exactly the content it was given, which is why the surrounding surface hugs the four rows with no wasted space.

**Why it's worth knowing:** it's what makes a custom container feel like a first-class QML citizen instead of a workaround. Anyone using `Card` writes plain, nested QML, the exact same way they already write `Rectangle { Text {} }`, with nothing extra to remember.

## Grouped Properties

`border.color` and `font.bold` are grouped properties, and it turns out to be the same trick as object properties, just used with clearer intent. We apply it to `FormField`, turning a flat `required: true` boolean into a proper `validation` namespace:

```qml
FormField {
    validation.required: true
    validation.minLength: 3
    validation.maxLength: 20
}
```

<img src="/assets/img/blog/qmladvcore-library/grouped-demo-complete.png" alt="Validation rules rendered as live hints under each field" style="max-width: 100%; height: auto; width: 380px;">

In the image above, look at the small grey hint text under each input box: "min 3 chars, max 20 chars" under Username, "min 8 chars" under Password, "max 50 chars" under Display name. Each of those lines is read straight through the grouped property, `fieldAt(index).validation.minLength` and `.maxLength`, and only shown at all when the rule is actually set above zero. The same `validation.required` flag also drives the asterisk next to the required fields' labels. One sub-object, `FieldValidation`, is quietly powering every one of those visual details.

**Why it's worth knowing:** it keeps a type's public API tidy as it grows. Instead of `FormField` accumulating a dozen loosely related flat properties over time, related settings get grouped under one name, exactly the way the Qt team already does it with `font` and `anchors`.

## Attached Properties

This is the mechanism behind `Keys.onPressed` and `Layout.fillWidth`: a property that another type adds to yours from the outside. We build `Form`, so any `TextField` anywhere can gain live validation in four lines, with zero changes to `TextField` itself.

<img src="/assets/img/blog/qmladvcore-library/attached-demo-complete.png" alt="Sign-in form with live per-field validation via attached properties" style="max-width: 100%; height: auto; width: 400px;">

In the image above, the three fields, Email, Password, and Display Name, are plain, unmodified `TextField` items. `TextField` itself knows nothing about validation. Every bit of behavior you see, the field metadata, the red "Email is required" style error text that appears the moment you clear a required field and disappears the moment you type again, comes from a `FormAttached` object that `Form` silently parks on each `TextField` because of a few `Form.field`, `Form.required`, and `Form.onErrorChanged` lines written on it. The text field is doing none of the work; it is just wearing the attachment.

**Why it's worth knowing:** it lets you add behavior to types you don't own and can't modify, without subclassing or wrapping them. Any built-in or third-party item can suddenly participate in your system, just by having a few lines written on it.

## Property Value Sources

Ever wonder what `NumberAnimation on x { }` actually is? It is a property value source: an object that takes ownership of a target property and drives it over time. We build `Pulse`, a reusable heartbeat effect that animates any real-valued property on any item.

<img src="/assets/img/blog/qmladvcore-library/pulse-demo-complete.png" alt="Pulse animating opacity and scale with a pause and resume toggle" style="max-width: 100%; height: auto; width: 400px;">

In the image above, three boxes are all breathing on their own: one fading in and out slowly through `opacity`, one growing and shrinking through `scale`, and one fading quickly, with a button underneath that pauses and resumes it mid-animation. None of the three rectangles ever sets `opacity` or `scale` itself. Each one just declares `Pulse on opacity { ... }` or `Pulse on scale { ... }`, and from that point on `Pulse` owns the property and writes new values into it on every frame, using the exact same `from`, `to`, and `duration` you handed it in QML.

**Why it's worth knowing:** it's how you package a piece of behavior, not just a value, as something reusable across any property on any item. Write `Pulse` once, and it animates `opacity` today and `scale` tomorrow, with no extra code.

## Non-Visual Services

Not everything needs pixels. `ToastManager` and `UndoStack` are pure C++ singletons with no UI of their own, reachable by name from any QML file in the app. `UndoStack` manages history and fires signals; the app decides what undoing actually means. `ToastManager` owns the state; the QML overlay owns the look.

<img src="/assets/img/blog/qmladvcore-library/nonvisual-demo-complete.png" alt="ToastManager and UndoStack wired together in one demo" style="max-width: 100%; height: auto; width: 400px;">

In the image above, clicking "Add Red", "Add Blue", or "Add Green" does three things at once: it appends a coloured row to the list, calls `UndoStack.push(...)` to record the action, and calls `ToastManager.show(...)` to pop the little rounded banner you see at the bottom of the window. Click Undo and the last row disappears, the Undo button's own label updates to show the next command in line, and a fresh toast announces what was undone. Neither singleton has ever heard of the other, or of the list on screen. `UndoStack` only tracks history and fires signals; the QML wiring is what decides those signals mean "remove the last list row."

**Why it's worth knowing:** it's a clean way to give your whole app shared, cross-cutting state, like notifications or an undo history, without threading properties down through every layer of your UI or reaching for global variables.

## Packaging and Publishing

All of this only matters if other projects can use it. We turn the finished collection of types into a real, installable CMake package, with generator expressions, install rules, and a config template for `find_package`. Then we publish it to GitHub, so it can be pulled into any project with a single `FetchContent` declaration and a Git tag.

<img src="/assets/img/blog/qmladvcore-library/fetchcontent-consumer.png" alt="Consumer app pulling QmlAdvCore straight from GitHub via FetchContent" style="max-width: 100%; height: auto; width: 400px;">

In the image above, this window belongs to a completely separate project, `consumer_fetchcontent`, that has never seen `QmlAdvCore`'s source tree on disk. Its `CMakeLists.txt` only has a `FetchContent_Declare` pointing at a Git tag. Yet everything works: `Version.string` reports "1.0.0" straight from the library's own CMake-generated version header, the toast buttons call into the same `ToastManager` singleton, and the undo stack behaves exactly as it did in the original demo. That is the payoff of the packaging work: every pattern built earlier in this post now travels with the library, wherever it's pulled into.

**Why it's worth knowing:** a set of useful custom types locked inside one project only helps that one project. Packaging turns your work into something you, your team, or anyone else can pull into a brand-new app in minutes, the same way you'd pull in any other Qt module.

## Why It Matters

None of these patterns are exotic. They are the same building blocks the Qt team used to build `Rectangle`, `Layout`, and every animation type you already use daily. Once you've built each one yourself, "how does this component do that?" stops being a mystery and starts being a checklist: object property, list property, default property, grouped property, attached property, or value source. Pick the one that fits, and build it.

## Want the Full Walkthrough?

This post covers the shape of each pattern, but there's a lot more to each one: the actual C++ code, the tests that pin down the behavior, and the full packaging and publishing pipeline. All of it is in Chapter 5 of [Qt6 QML Advanced](https://dgakwaya.gumroad.com/l/qt6_qml_advanced), where we build every one of these types from an empty project to a published library, step by step.

If you'd like a discount on the book or any of the courses, check out [the discounts page](https://www.learnqt.guide/discounts).

Happy coding!
