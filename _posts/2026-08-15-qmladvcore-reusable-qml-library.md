---
layout: post
title: "Building QmlAdvCore: A Reusable QML Library From Scratch"
description: A look inside Chapter 5 of Qt6 QML Advanced, where we build every major QML property pattern from scratch and package the result into a real, publishable QML library.
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

Ever written `border.color`, `Layout.fillWidth`, or `NumberAnimation on x` without thinking twice about it? Those feel built into QML, but they are not magic. They are C++ machinery someone built on purpose, so that using it would feel effortless. Chapter 5 of [Qt6 QML Advanced](https://dgakwaya.gumroad.com/l/qt6_qml_advanced) is about building that machinery yourself, then packaging the result into a library you can actually reuse.

<img src="/assets/img/blog/qmladvcore-library/create-project-dialog.png" alt="Qt Creator New Project dialog for QmlAdvCore" style="max-width: 100%; height: auto; width: 500px;">

We start by setting up a proper project shape: a library called `QmlAdvCore`, a demo app that consumes it, and a test suite that exercises it directly, with no QML engine in sight. From there, we build out every major QML property pattern, one custom type at a time.

## Object Properties

The first trick is dot-notation like `Theme.colors.primary`. Turns out there is no special syntax for it. It is just a `Q_PROPERTY` returning a pointer to another `QObject`, chained as deep as you like. That is exactly how a `Theme` singleton ends up owning a `ColorPalette` and a `SpacingGroup`, each with their own live, bindable properties.

<img src="/assets/img/blog/qmladvcore-library/theme-object-property-demo.png" alt="Theme.colors and Theme.spacing driving a live demo" style="max-width: 100%; height: auto; width: 350px;">

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

## Default Properties

List properties are nice, but they still make you write `fields: [ ... ]`. One line of class metadata drops the wrapper entirely, so `Card { Rectangle {} Rectangle {} }` just works. This is also where the chapter steps up from plain `QObject` to `QQuickItem`, since now the container is a real visual item responsible for laying out its own children.

<img src="/assets/img/blog/qmladvcore-library/card-demo-complete.png" alt="Card stacking four items automatically" style="max-width: 100%; height: auto; width: 300px;">

## Grouped Properties

`border.color` and `font.bold` are grouped properties, and it is the same trick as object properties, just with clearer intent. We apply it to `FormField`, turning a flat `required: true` boolean into a proper `validation` namespace:

```qml
FormField {
    validation.required: true
    validation.minLength: 3
    validation.maxLength: 20
}
```

<img src="/assets/img/blog/qmladvcore-library/grouped-demo-complete.png" alt="Validation rules rendered as live hints under each field" style="max-width: 100%; height: auto; width: 380px;">

## Attached Properties

This is the mechanism behind `Keys.onPressed` and `Layout.fillWidth`: a property that another type adds to yours from the outside. We build `Form`, so any `TextField` anywhere can gain live validation in four lines, with zero changes to `TextField` itself.

<img src="/assets/img/blog/qmladvcore-library/attached-demo-complete.png" alt="Sign-in form with live per-field validation via attached properties" style="max-width: 100%; height: auto; width: 400px;">

## Property Value Sources

Ever wonder what `NumberAnimation on x { }` actually is? It is a property value source, an object that takes ownership of a target property and drives it over time. We build `Pulse`, a reusable heartbeat effect that animates any real-valued property on any item.

<img src="/assets/img/blog/qmladvcore-library/pulse-demo-complete.png" alt="Pulse animating opacity and scale with a pause and resume toggle" style="max-width: 100%; height: auto; width: 400px;">

## Non-Visual Services

Not everything needs pixels. `ToastManager` and `UndoStack` are pure C++ singletons with no UI of their own, reachable by name from any QML file in the app. `UndoStack` manages history and fires signals; the app decides what undoing actually means. `ToastManager` owns the state; the QML overlay owns the look.

<img src="/assets/img/blog/qmladvcore-library/nonvisual-demo-complete.png" alt="ToastManager and UndoStack wired together in one demo" style="max-width: 100%; height: auto; width: 400px;">

## Packaging and Publishing

All of this only matters if other projects can use it. The last two sections of the chapter turn `QmlAdvCore` into a real, installable CMake package, with generator expressions, install rules, and a config template for `find_package`. Then we publish it to GitHub, so it can be pulled into any project with a single `FetchContent` declaration and a Git tag.

<img src="/assets/img/blog/qmladvcore-library/fetchcontent-consumer.png" alt="Consumer app pulling QmlAdvCore straight from GitHub via FetchContent" style="max-width: 100%; height: auto; width: 400px;">

## Why It Matters

None of these patterns are exotic. They are the same building blocks the Qt team used to build `Rectangle`, `Layout`, and every animation type you already use daily. Once you have built each one yourself, "how does this component do that?" stops being a mystery and starts being a checklist: object property, list property, default property, grouped property, attached property, or value source. Pick the one that fits, and build it.

By the end of the chapter, `QmlAdvCore` is not a toy. It is a genuinely reusable library with tests, a theme system, and services, ready to be pulled into real projects.

If you want the full walkthrough with all the C++ and QML code, it is Chapter 5 of [Qt6 QML Advanced](https://dgakwaya.gumroad.com/l/qt6_qml_advanced).

Happy coding!
