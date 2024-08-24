---
layout: post
title: "The Qt Graphics View Framework."
description: Build powerful interactive desktop apps with the Qt Graphics View framework.
cover: /assets/img/blog/graphics-view-framework/graphics_view_framework.png
date: '2024-08-24'
categories:
    - C++
tags:
    - QGraphicsView
    - QGraphicsScene
    - QGraphicsItem
    - C++
comments: true
sidebar: true

coursescard: true
bookcard: true


---

The Graphics View framework in Qt is a powerful and flexible system for managing and displaying custom 2D graphics. It provides a way to create interactive, custom graphics scenes that can be viewed and manipulated through one or more views. This framework is ideal for applications that require complex graphic manipulation, such as CAD programs, diagram editors and games. Below is one of the applications we build in my [Qt C++ GUI Intermediate](https://www.udemy.com/course/qt-c-gui-development-intermediate/?couponCode=STARTAUG2024) course.

![A complex app using the Graphics View framework](/assets/img/blog/graphics-view-framework/graphics_view_framework.png)

The Graphics View framework is made up of three main parts: 

1. The scene: 
   - Powered by the QGraphicsScene class, it acts as a container for QGraphicsItems, managing their positions, states, and interactions. It's where all the items in the scene live, and it handles tasks like collision detection, item selection, and propagation of events.
  
2. Items
    - Powered by the QGraphicsItem class, they represent objects in the scene. These can be simple shapes like rectangles or ellipses, or more complex custom shapes. QGraphicsItems can handle events like mouse clicks and can have advanced properties like transformations, custom painting, and bounding regions.
  
3. The View
    - Powered by the QGraphicsView class, this is a visual representation of the QGraphicsScene. It provides the interface through which the user interacts with the scene. QGraphicsView supports zooming, panning, and transformations, allowing for highly interactive and flexible UI designs.
  
Here’s a simple example that demonstrates the basic structure:

~~~cpp
#include <QApplication>
#include <QGraphicsScene>
#include <QGraphicsView>
#include <QGraphicsEllipseItem>

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);

    // Create a scene
    QGraphicsScene scene;

    // Add an item to the scene
    QGraphicsEllipseItem *ellipse = scene.addEllipse(0, 0, 100, 100);

    // Create a view to visualize the scene
    QGraphicsView view(&scene);

    // Display the view
    view.show();

    return app.exec();
}
~~~

In this example, we create a **QGraphicsScene** and add a **QGraphicsEllipseItem** to it. Then, we use a **QGraphicsView** to display the scene. The flexibility of this framework shines through as you can easily scale this to include complex shapes, text, or even custom QGraphicsItems.

The Graphics View framework is one of the few remaining areas where one needs to rely on the C++ side of things. QML has no close equivalent as far as I know. I have a strong personal connection to this framework because it's one of the big projects I worked on in my first professional contract as a Qt developer. If you need to build  highly interactive applications with thousands of items in play, there aren't a lot of technologies out there that can rival with the Qt Graphics View framework. If you want to dive right into this framework, I have an old course that takes you from the fundamentals up to a point where you can build a very complex painting application. [Check it out](https://www.udemy.com/course/qt-c-gui-development-intermediate/?couponCode=STARTAUG2024).

The Qt Widgets API is given less and less love these days, but the Qt Graphics View frameworks is one of the areas that constantly pulls me back to using Qt Widgets and admiring what a great design they display. Are you still using Qt Widgets in a professional setting? Do share your thoughts in the comments section below.