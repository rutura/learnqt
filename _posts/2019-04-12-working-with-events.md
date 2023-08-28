---
layout: post
title: "Working With Qt Events : A Comprehensive Guide"
description: All you need to know about working with events in Qt.
cover: /assets/img/blog/working_with_qt_events_blog.png
date: '2019-04-12'
categories:
    - Events
tags:
    - Qt
    - Events
comments: true
sidebar: true

coursescard: true
bookcard: true


---

Qt has two main mechanisms to allow developers to react to things that happen in your application. One of these, which is more common is Signals and Slots. The other one, is using events. The aim of this guide is to lay out a comprehensive coverage of different techniques to deliver and handle events in Qt applications. The guide is highly practical and provides enough ground for the reader to try out the techniques in the IDE right way. It is expected of the reader to already have a basic understanding on working with Qt.

## Content
1. What Are Events
2. Events and Signals/Slots
3. Using Events
4. Event Propagation
5. A Concrete Example
6. Events and Event Classes
7. Different Methods to Handle Events in Qt
8. Reimplementing QObject::event()
9. Event Filters on QObject
10. Installing Event Filter on QApplication
11. Subclassing QApplication and implementing notify()
12. Sending your own events
13. Summary

## What are Events
Events are objects in your Qt C++ application, and they are indeed represented by the QEvent class. For example there is an event for when someone clicks on a button : QMouseEvent, an event for when one of your widgets is resized QResizeEvent, an event for when your application is closed QCloseEvent and so on.

They are a low level mechanism allowing you to control the look and the behavior of your classes and objects, especially widgets. They are very useful for building event related features inside your objects, that you do not want to depend on other objects in the application. For example, if I want my button to turn green when the mouse is hovering on top of it, you can use events to do that, and that behavior is not going to depend on any other object used with our button.

Events can either be generated from within the application or as a result of some external activity. When an event occurs, Qt constructs an appropriate instance of a QEvent subclass . Qt delivers the event by calling the event() method of the target object ( mostly widgets) . The event() method doesn’t handle the event itself. It looks at the type of the event in question ( Event::Type), and calls the most appropriate event handler ( mousePressEvent, mouseMoveEvent, keyPressEvent,…) and returns true or false, based on whether the event was accepted or ignored. I know some of the things are not clear by now, but bare with me, we’re going to explain more as we move forward and by the end of the guide, most of this stuff is going to make sense.

## Events and Signals/Slots
The purpose of events is somewhat the same as for signals and slots. Signals /Slots allow you to respond when something happens after all. Hre is how it works. Something happens, a signal is emitted, and if interested in that signal, you connect it to your slot and respond however you want in the implementation of your slot.

Events are different in that they allow you to do much more low level things that deeply affect the behavior of your objects. And if you look deep, the signal and slot mechanism in Qt is itself powered by events. That’s right ! The clicked() signal of QPushButton for example, is emitted somewhere deep in the implementation of some mouse events for the QPushButton class.The most popular use for events I am personally familiar with is when building completely custom widgets , or deeply customizing existing ones.

## Using Events
There are different ways you can use events in you Qt applications. We’re going to start off by showing you how you can play around with events for the QWidget class. From there, we’re going to explore more ways you can use events in your Qt applications. Start off by creating a Widgets application in Qt Creator, I prefer to use QWidget as my parent class, but QMainWindow will also work just fine. You should start off with your widget header class looking something like below

~~~cpp
class Widget : public QWidget
{
    Q_OBJECT
public:
    explicit Widget(QWidget *parent = nullptr);
    ~Widget();
private:
    Ui::Widget *ui;
};
~~~


If you wanted to capture the close event for the widget, you would add an override of the closeEvent() method to your widget as shown below

{% highlight c++ %}
class Widget : public QWidget
{
    Q_OBJECT
public:
    explicit Widget(QWidget *parent = nullptr);
    ~Widget();
protected:
    void closeEvent(QCloseEvent * event);
private:
    Ui::Widget *ui;
};
{% endhighlight %}
and implement it in the implementation file as shown below

{% highlight c++ %}
void Widget::closeEvent(QCloseEvent *event)
{
     event->accept();
     qDebug() << "QCloseEvent : Widget closed";
}
{% endhighlight %}
And just like this, we have handled the close event ourselves in our Widget class. If you run the application, you’ll going to see your usual boring widget. But if you click on the X icon in the top bar to close the window, you’ll see that your widget closes but you’re going to see a debug message saing “QCloseEvent : Widget closed”, proving that our event handler is indeed being called when the widget is closed.

This is the normal flow you’re going to follow to implement your events,

- Subclass your Qt class of interest
- Override the event you are interested in

How to know the event you’ll override ? I hear you ask. Well you have to check the Qt documentation for your class of interest. For example we can find closeEvent, mousePressEvent, mouseReleaseEvent and many more in the QWidget class documentation.

Before we go off and start exploring many of the other events you can play with on the QWidget class, let’s talk about the event->accept() line we have in our event implementation. When you handle an event like we just did, you have the option to ACCEPT the event, or to IGNORE the event. When you accept the event, by calling the accept() method on your event parameter, you’re signaling to the Qt framework that you have dealt with the event and it won’t try to handle it in any other way.

When you ignore the event by calling ignore() on your event parameter, you’re telling the Qt framework that you’re rejecting the event, and it will try to find other ways to handle the event if possible. In our example we have accepted the event and all is working as expected : the widget is closing when we click on the X icon. You should also know that if you don’t explicitly specify that you accept the event like below

{% highlight c++ %}
void Widget::closeEvent(QCloseEvent *event)
{
     qDebug() << "QCloseEvent : Widget closed";
}
{% endhighlight %}
the event is going to be accepted by default. That’s a key piece of information to keep in mind. Before we try that, I want to challenge you to think about what is going to happen if we ignore the event in our event handler. You ignore the event by calling ignore() on your event.

~~~cpp
void Widget::closeEvent(QCloseEvent *event)
{
     event->ignore();
     qDebug() << "QCloseEvent : Widget closed";
}
~~~

Try this and run the application. The widget is going to show up and if you click on the X icon to close the widget, NOTHING is going to happen! You’re just going to see the debug output from the event handler but Qt is just going to ignore the event in this case. If you happen to need to disable the X(Close) icon on your widgets, this is one way you can achieve this.

### Event Propagation

The behavior we just saw for the closeEvent, where calling ignore() on the event parameter causes the widget closing operation to be canceled is special. In normal cases, Qt will try to propagate the event up the parent child relationship chain until it finds a handler willing to deal with the event. If that handler is not found, then the event is discarded or fully ignored. A good typical example is the keyPressEvent() handler, that responds to keyboard key presses. Quoting the documentation

<blockquote>This event handler, for event event, can be re implemented in a subclass to receive key press events for the widget.
A widget must call setFocusPolicy() to accept focus initially and have focus in order to receive a key press event.
If you re implement this handler, it is very important that you call the base class implementation if you do not act upon the key.
The default implementation closes popup widgets if the user presses the key sequence for QKeySequence::Cancel (typically the Escape key). Otherwise the event is ignored, so that the widget’s parent can interpret it.
Note that QKeyEvent starts with isAccepted() == true, so you do not need to call QKeyEvent::accept() – just do not call the base class implementation if you act upon the key.. (Qt Documentation)</blockquote>


To handle keyPressEvents you have to subclass your class of interest and override the keyPressEvent() method. This is starting to become second nature by now.

Another key piece of information specific to this event, is that the widget for which you are handling the event, must currently be holding the focus. You can give focus to a widget by clicking inside, for example widgets like QLineEdit and QTextEdit, but you can also do that programatically on a Widget by calling its setFocus() method. This is an example of a behavior tied to a specific event, and it reinforces the good practice of always checking what the official documentation has to say about a given event you might be interested in handling.

The quoted line in the doc also says that

<blockquote>The default implementation closes popup widgets if the user presses the key sequence for QKeySequence::Cancel (typically the Escape key). Otherwise the event is ignored, so that the widget’s parent can interpret it.﻿
. (Qt Documentation)</blockquote>


It makes it clear that the parent implementation of keyPressEvent is doing some stuff. Depending on what you are trying to achieve, you may or may not be interested in what the parent implementation has to offer. If you want to completely bypass what the parent implementation is doing, just do your thing in your overridden event handler and don’t call the parent implementation. By the way, you call the parent implementation by doing something like this

~~~cpp
QWidget::keyPressEvent(event);
~~~
By passing in your event parameter, if your parent class happens to be QWidget for example. This is what is meant by event propagation. Events can be , and in most cases are , propagated from parent to child until an object is found, that is interested in the event. Child classes propagate to parents by calling the same event method in their parent classes.

Another pillar of event propagation is knowing when and how to use the accept() and ignore() methods of the event you are passing around. If an object or widget detects that an event has been handled by somebody before, it doesn’t bother handling it. The methods are just conveniences on top of the setAccepted() method of the event object, which sets the accepted flag. In most cases, you won’t need to call accept() explicitly because the event is sent to you in your event handler with that flag set to true by default.

## A Concrete Example
We have seen quite a lot about events so far, so it’s a good time to fire off our Qt Creator IDE and play with these events a little more. Open the IDE up and create a new Widgets project. Add a new class and call it MyLineEdit . The class is going to inherit QLineEdit, because we want to capture keyPressEvents as we type text in the LineEdit. Modify the header of your class to look like below

~~~cpp
class MyLineEdit : public QLineEdit
{
    Q_OBJECT
public:
    explicit MyLineEdit(QWidget *parent = nullptr);
    void keyPressEvent(QKeyEvent *event);
};
~~~
and the implementation CPP file to look like below

~~~
MyLineEdit::MyLineEdit(QWidget *parent) : QLineEdit(parent)
{
}
 
void MyLineEdit::keyPressEvent(QKeyEvent *event)
{
    qDebug() << "MyLineEdit : keyPressEvent , key : " << event->text();
    QLineEdit::keyPressEvent(event);
}
~~~
You can go on and create an instance of this class in your widget class to see it, but we’re going to resist the temptation now. Instead, create a new class and name it ChildLineEdit, modify its header to look like below

~~~cpp
#include "mylineedit.h"
class ChildLineEdit : public MyLineEdit
{
    Q_OBJECT
public:
    explicit ChildLineEdit(QWidget *parent = nullptr);
     void keyPressEvent(QKeyEvent *event);
 
};
~~~
and its implementation CPP file to look like below

~~~cpp
ChildLineEdit::ChildLineEdit(QWidget *parent) : MyLineEdit(parent)
{
}
 
void ChildLineEdit::keyPressEvent(QKeyEvent *event)
{
    qDebug() << " ChildLineEdit,keyPressEvent , key : " << event->text();
    MyLineEdit::keyPressEvent(event);
}
~~~
This class is inheriting the MyLineEdit class we created earlier, so we need to include the “mylineedit.h” header file as seen in our header file above. Now you can jump into your widget class constructor and create an instance of ChildLineEdit as shown below

~~~cpp
Widget::Widget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::Widget)
{
    ui->setupUi(this);
    
    //Declare child Line Edit
    ChildLineEdit * childLineEdit = new ChildLineEdit(this);
    QVBoxLayout * layout = new QVBoxLayout(this);
    layout->addWidget(childLineEdit);
 
    setLayout(layout);
}
~~~
We are creating an instance of our ChildLineEdit and assigning the current widget as the parent. Next we’re putting it in the layout of the widget. If you run the application, it’s going to look something like below


Type something in the LineEdit and you’re going to see that both the event handlers in ChildLineEdit and MyLineEdit are called. Can you thing of a reason why ? This is event propagation in action. ChildWidget is handling keyPressEvent doing something in that event handler : we are just printing a debug statement in this case but you could have just as easily done anything you want in there. After our custom thing, we are calling the parent implementation of keyPressEvent.

~~~cpp
MyLineEdit::keyPressEvent(event);
~~~
by passing in our event as the parameter. This causes the event handler from MyLineEdit to be called and we see its output in the screenshot shown above. To play around a little bit, modify ChildLineEdit::keyPressEvent() as shown below

~~~cpp
void ChildLineEdit::keyPressEvent(QKeyEvent *event)
{
    qDebug() << " ChildLineEdit,keyPressEvent , key : " << event->text();
    qDebug() << "Event accepted : " << event->isAccepted();
   MyLineEdit::keyPressEvent(event);
}
~~~
On line number 4, we print out the accepted flag of the event to see if it’s accepted ( true ) or ignored( false) by default. Run the application, type something in the LineEdit, and you’re going to see that it’s true by default.


This means that the event parameter gets to you in the event handler as if somebody had already called the accept() method on it. So if you just want to do your thing in there and flag the event as accepted, you can omit the call to accept(). But it’s good practice to just put it in there for code readability reasons. In the parent( MyLineEdit) implementation , we can investigate the accepted flag the event gets there with but modifying the event handler as shown below

~~~cpp
void MyLineEdit::keyPressEvent(QKeyEvent *event)
{
    qDebug() << "MyLineEdit : keyPressEvent , key : " << event->text();
    if( event->isAccepted()){
        qDebug() << "Event has been already handled";
    }else{
        qDebug() << "Event hasn't been handled yet";
    }
     QLineEdit::keyPressEvent(event);
}
~~~
Run the application, the output should look something like

~~~cpp
ChildLineEdit,keyPressEvent , key :  "d"
Event accepted :  true
MyLineEdit : keyPressEvent , key :  "d"
Event has been already handled
~~~

As can be seen, the event is flagged as already handled. This causes parent handlers not to take any action on the given event. You can go back in ChildLineEdit and explicitly ignore the event as shown below

~~~cpp
void ChildLineEdit::keyPressEvent(QKeyEvent *event)
{
    qDebug() << " ChildLineEdit,keyPressEvent , key : " << event->text();
    qDebug() << "Event accepted : " << event->isAccepted();
    event->ignore();
   MyLineEdit::keyPressEvent(event);
}
~~~
Run the app, and the output will look like

~~~cpp
ChildLineEdit,keyPressEvent , key :  "d"
Event accepted :  true
MyLineEdit : keyPressEvent , key :  "d"
Event hasn't been handled yet
~~~

meaning that the event is flagged as ignored in the ChildLineEdit, which is reflected in the MyLineEdit. If you want to stop the event from propagating up the chain all together, you can omit the call to the parent implementation. If you comment out the call to MyLineEdit::keyPressEvent(event), you’ll see that only ChildLineEdit::keyPressEvent is going to be called.

~~~cpp
void ChildLineEdit::keyPressEvent(QKeyEvent *event)
{
    qDebug() << " ChildLineEdit,keyPressEvent , key : " << event->text();
    qDebug() << "Event accepted : " << event->isAccepted();
    event->ignore();
   //MyLineEdit::keyPressEvent(event);
}
~~~

But notice the problem here. When you type something in the line edit, you don’t see the text inside. This is because we have not called the MyLineEdit::keyPressEvent() , which in turn called QLineEdit::keyPressEvent(). It turns out QLineEdit::keyPressEvent() contains the implemetation code for making that text show up . This shows that calling the parent implementation in your event handlers can be crucial for your application to work the way you want it.

## Events and Event Classes
So far, we have touched on only a bunch of events for you to grab a few concepts first, but you should know that there is a whole world of them out there for you to play with. Events are all subclasses of the QEvent class and each child class adds new fields and methods to help fulfill the purpose it was made for. For example the QResizeEvent will contain the old size and the current size for the widget, the QMouseEvent will contain the location where the mouse was clicked on the screen and so forth. Below is a widget subclass with a few more events for you to play with. The header is as shown below

~~~cpp
class Widget : public QWidget
{
    Q_OBJECT
public:
    explicit Widget(QWidget *parent = nullptr);
    ~Widget();
protected:
    void closeEvent(QCloseEvent * event);
    void contextMenuEvent(QContextMenuEvent * event);
    void enterEvent(QEvent * event);
    void leaveEvent(QEvent * event);
    void mousePressEvent(QMouseEvent * event);
    void mouseReleaseEvent(QMouseEvent * event);
    void mouseDoubleClickEvent(QMouseEvent * event);
    void mouseMoveEvent( QMouseEvent * event );
    void keyPressEvent( QKeyEvent * event );
    void wheelEvent( QWheelEvent * event );
    void resizeEvent(QResizeEvent * event);
    void paintEvent(QPaintEvent * event);
private:
    Ui::Widget *ui;
};
~~~

and here is the implementation cpp file for it

~~~cpp
Widget::~Widget()
{
    delete ui;
}
 
void Widget::closeEvent(QCloseEvent *event)
{
//    event->accept();
//    event->ignore();
     qDebug() << "QCloseEvent : Widget closed";
}
 
void Widget::contextMenuEvent(QContextMenuEvent *event)
{
   qDebug() << "ContextMenu";
    event->accept();
    qDebug() << "QContextMenuEvent : Should pop up a context menu";
    qDebug() << "Event x :" << event->x() << " event y : " <<event->y();
   qDebug() << "Event reason : " << event->reason();
 
   event->ignore();
}
 
void Widget::enterEvent(QEvent *event)
{
    event->accept();
    qDebug() << "Mouse pointer entered widget space";
}
 
void Widget::leaveEvent(QEvent *event)
{
    event->accept();
    qDebug() << "Mouse pointer left widget space";
    releaseKeyboard();
}
 
void Widget::mousePressEvent(QMouseEvent *event)
{
    qDebug() << "Mouse pressed";
    qDebug() << "Button : " << event->button();
    grabKeyboard();
    event->accept();
}
 
void Widget::mouseReleaseEvent(QMouseEvent *event)
{
    qDebug() << "Mouse released";
    releaseKeyboard();
    event->accept();
}
 
void Widget::mouseDoubleClickEvent(QMouseEvent *event)
{
    qDebug() << "Mouse double clicked";
    event->accept();
}
 
void Widget::mouseMoveEvent(QMouseEvent *event)
{
    qDebug() << "Mouse moved to ("<<event->x() << "," << event->y() << ")";
    event->accept();
}
 
void Widget::keyPressEvent(QKeyEvent *event)
{
    qDebug() << "KeyPress event, pressed the key" << event->key();
    QString modifiers;
    if ( event->modifiers()&amp;Qt::ShiftModifier){
        modifiers += "Shift ";
    }
    if ( event->modifiers()&amp;Qt::ControlModifier){
        modifiers += "Control ";
    }
    if ( event->modifiers()&amp;Qt::AltModifier){
        modifiers += "Alt ";
    }
    qDebug() << "Modifiers : " << modifiers;
 
    //Detect Shift+A
    if ( event->modifiers() &amp; Qt::ShiftModifier){
        if(event->key() == 65){//
            qDebug() << "Shift A detected";
        }
        }
}
 
void Widget::wheelEvent(QWheelEvent *event)
{
 
    qDebug() << "Weel Event Delta : " << event->delta();
    qDebug() << " x : " << event->x() << ", y : " <<event->y();
    qDebug() << " Orientation : " << event->orientation();
 
}
 
void Widget::resizeEvent(QResizeEvent *event)
{
 
    qDebug() << "Widget resized , old size : " << event->oldSize();
    qDebug() << " new size : " << event->size();
}
 
void Widget::paintEvent(QPaintEvent *event)
{
    //Can be triggered for multiple reasons. Examples are when widget is resized or when an other maximized widget lies on top of this widget
    qDebug() << "Paint event. Rect is : " << event->rect();
 
}
~~~
The implementation file my contain things we haven’t talked about yet, but they are specific to given events and you can check the official documentation for more details on these. I just wanted to give you more examples using other events we haven’t talked about.

<mark>NOTE </mark> : Don’t just look at these events. Fire off the IDE and play with them.

## Different Methods to Handle Events in Qt

So far, we have only seen one way to handle events in Qt : subclassing your class of interest and overriding event methods. This is the most common way but also the least powerful way to do the job. In this section, you’re going to get the whole picture when it comes to handling events. Quoting the documentation,there are five different ways that events can be processed; reimplementing this virtual function is just one of them. All five approaches are listed below:

1. Reimplementing paintEvent(), mousePressEvent() and so on. This is the most common, easiest, and least powerful way.
2. Reimplementing QCoreApplication::notify. This is very powerful, providing complete control; but only one subclass can be active at a time.
3. Installing an event filter on QCoreApplication::instance(). Such an event filter is able to process all events for all widgets, so it’s just as powerful as reimplementing notify(); furthermore, it’s possible to have more than one application-global event filter. Global event filters even see mouse events for disabled widgets. Note that application event filters are only called for objects that live in the main thread.
4. Reimplementing QObject::event() (as QWidget does). If you do this you get Tab key presses, and you get to see the events before any widget-specific event filters.
5. Installing an event filter on the object. Such an event filter gets all the events, including Tab and Shift+Tab key press events, as long as they do not change the focus widget.

We have seen number 1 so far so we won’t talk any more about it.

## Reimplementing QObject::event()
You use this method by subclassing your class of interest but instead of implementing specific event handlers like keyPressEvent() …, you implement the QObject::event() override. This allows all events to pass through your override and you can decide which ones to handle and which ones to channel up the event propagation chain. To play with this, let’s create a QPushButton subclass and implement our own event() override as shown in the header below

~~~cpp
class MyButton : public QPushButton
{
    Q_OBJECT
public:
    explicit MyButton(QWidget *parent = nullptr);
signals:
protected:
    bool event(QEvent * event) override;
public slots:
};
~~~
The implementation cpp file looks like

~~~cpp
MyButton::MyButton(QWidget *parent) : QPushButton(parent)
{
}
 
bool MyButton::event(QEvent *event)
{
    if( (event->type() == QEvent::MouseButtonPress)
            || (event->type() == QEvent::MouseButtonDblClick)){
        qDebug() << "MyButton::Event : Pressed the MyButton instance. Consuming event";
        return true;
    }
    //Remember to call the event method of the base class for the events that you don't handle
    return QPushButton::event(event);
}
~~~
You may have noticed that the event() method returns bool . The logic here is very similar to what we’ve seen with the accept() and ignore() methods. When you return true, you are telling the Qt system that the event has been handled and a returned false means that the event has been ignored.

Because all events are passing through this method, you have to check which specific event you received. You do that by relying on the Event::Type enum . From the code above, you see that we are detecting mouse clicks and double clicks for our custom button. If it’s either of these events, we show a debug output statement and return true to signal that the event has been handled. Please note that you have to call the parent implementation of event() for all events that you don’t handle. Otherwise you’re going to end up with an unresponsive widget for other events.

This method is good if for some reason you want to channel all your events through one place. Also as stated in the documentation , you get Tab key presses, and you get to see the events before any widget-specific event filters.

To try this out, create an instance of the button in your widget class and connect a slot to it

~~~cpp
MyButton * myButton = new MyButton(this);
myButton->setText("MyButton");
connect(myButton,SIGNAL(clicked()),this,SLOT(myButtonClicked()));
~~~

Run the application and you’re going to see that as you click or double click on the button, the slot is not going to be called. Instead, the message from MyButton::event() is going to show up
~~~
MyButton::Event : Pressed the MyButton instance. Consuming event
~~~

Now why isn’t the slot connected to the button not being called? It is because the the signal connected to that slot : clicked() , isn’t being fired. The signal is fired somewhere in the event handles of QPushButton, and we have bypassed any event handling for QPushButton whatsoever when we detect that the user is just clicking (QEvent::MouseButtonPress) or double clicking (QEvent::MouseButtonDblClick) on our button. This also shows that the event() method is called before any specific event handler like mousePress or keyPress is called.

# Event Filters on QObject

Event filters are subclasses of the QObject class that you can attach to a given object to intercept events before they reach the target object. For example you can attach a filter to a button and the filter will get mouse press events before the button does. You install the filter by calling
QObject::installEventFilter()  on the object.
An event filter gets to process events before the target object does, allowing it to inspect and discard the events as required. An existing event filter can be removed using the QObject::removeEventFilter() function. You intercept events in the eventFilter() method that you have to override. As an example, let’s suppose that we want to filter out numbers when somebody is typing in a line edit. We could create a DigitFilter class as shown below

~~~cpp
class DigitFilter : public QObject
{
    Q_OBJECT
public:
    explicit DigitFilter(QObject *parent = nullptr,QString  msg = "");
protected:
bool eventFilter( QObject *dest, QEvent *event );
 
signals:
 
public slots:
private :
QString message;
};
~~~
The implementation could be something like

~~~cpp
DigitFilter::DigitFilter(QObject *parent,QString msg) : QObject(parent)
{
    message = msg;
}
 
bool DigitFilter::eventFilter(QObject *dest, QEvent *event)
{
    if( event->type() == QEvent::KeyPress )
    {
        qDebug() << "Event filter for " << message << " triggered";
        QKeyEvent *keyEvent = static_cast<QKeyEvent*>( event );
        static QString digits = QString("1234567890");
        if( digits.indexOf( keyEvent->text() ) != -1 )
            //Returning true here signals that the event has been handled and it's not sent to the destination.
            return true;
    }
    //This sends the event to be handled by the filter of the base class or the event handlers of the base class themselves
    return QObject::eventFilter(dest, event);
}
~~~
The event filter is also going to get all events for the object it is installed on. Once inside the eventFilter() method, we have to check for the event we are interested in. In this case, KeyPress events. After that, we have to check which key was pressed, to know whether it is a digit or not. If it is we return true to signal that we don’t want this event handled any further, in other words, the event filter has done all that needs be done for this event on the target object ( where it is installed), Nobody else up the chain of event propagation should worry about it. This causes for digits not to be shown or processed when you type them on the line edit where we’re going to install the filter. Assuming you have a bare bones widget project created and opened in Qt Creator, add the DigitFilter class to the project, and drag a line edit component to the widget form. In the wiget constructor, create a filter and install it on the line edit as shown below

~~~
DigitFilter* filter = new DigitFilter(this," line edit");
ui->lineEdit->installEventFilter(filter);
ui->lineEdit->setText("line edit");
~~~

This will cause for all events for the line edit to go through the eventFilter() method of the filter object. The filter will filter out digits and you won’t see then in the user interface when you run the application. Run the app and try this out! Event filters are great when you don’t want to mess with the target object and just want to influence it’s behavior though events.

## Installing Event Filter on QApplication

Besides installing filters on regular QObjects, you can also install them on the single QApplication instance in your application. Obviously , event filters on QApplication are called before any event filter installed on any other object in the application. Let’s try this out. Assuming you have a bare bones widget application created in the IDE, create a new filter class and call it MFilter

~~~cpp
class MFilter : public QObject
{
    Q_OBJECT
public:
    explicit MFilter(QString message,QObject *parent = nullptr);
protected:
    bool eventFilter( QObject *dest, QEvent *event );
signals:
public slots:
private:
    QString m_message;
};
~~~
It’s just a regular filter like we’ve seen before. Its implementation is as shown below

~~~cpp
MFilter::MFilter(QString message,QObject *parent) : QObject(parent),
    m_message(message)
{
}
 
bool MFilter::eventFilter(QObject *dest, QEvent *event)
{
    if( event->type() == QEvent::MouseButtonPress
            || event->type() == QEvent::MouseButtonDblClick){
        qDebug() << "Event hijacked " << m_message;
        return true; //Event handled here. No need to propagate
    }
    return QObject::eventFilter(dest,event);
}
~~~

I hope it’s clear that we’re filtering for mouse clicks and double clicks. Now you can full scale in craziness, and install this filter on the QApplication instance in your main function

~~~cpp
int main(int argc, char *argv[])
{
    QApplication a(argc, argv);
 
    Widget w;
 
    MFilter * filter = new MFilter("FromMain",&amp;w);
    a.installEventFilter(filter);
    w.show();
 
    return a.exec();
}
~~~
If you create buttons in your form and attach slots to respond when they are clicked like below

~~~cpp
Widget::Widget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::Widget)
{
    ui->setupUi(this);
 
    MFilter * filter = new MFilter("FromWidget",this);
    ui->button1->installEventFilter(filter);
 
}
 
Widget::~Widget()
{
    delete ui;
}
 
void Widget::on_button1_clicked()
{
    qDebug() << "Clicked on button1";
}
 
void Widget::on_button2_clicked()
{
    qDebug() << "Clicked on button2";
}
~~~
and run the application, you’re going to see that when you click on the buttons, the slots are not going to respond, instead you’re going to see the filter respond in the debug output message below

~~~cpp
Event hijacked  "FromMain"
~~~

## Subclassing QApplication and implementing notify()

QApplication::notify() is the method that is called by Qt to send the event to the receiver. Using a subclass of QApplication in your Qt app and overriding the virtual method notify() is by far the most powerful method to intercept events and handle them. The way you use it is strikingly similar to what we’ve seen with QObject::event() and QObject::eventFilter. You subclass QApplication

~~~cpp
class Application : public QApplication
{
    Q_OBJECT
public:
    explicit Application(int &amp;argc, char **argv);
protected:
     bool notify(QObject *receiver, QEvent *event);
signals:
public slots:
};
~~~

and override the notify() method as shown below

~~~cpp
Application::Application(int &amp;argc, char **argv) : QApplication(argc,argv)
{
}
 
bool Application::notify(QObject *receiver, QEvent *event)
{
    Q_UNUSED(receiver);
    if ( event->type() == QEvent::MouseButtonPress
         || event->type() == QEvent::MouseButtonDblClick){
        qDebug() << "Notify method of Application called";
        return true;
    }
   return QApplication::notify(receiver,event);
}
~~~
Again, where we’re just filtering out mouse clicks and double clicks. You use this subclass of QApplication where you would use a regular QApplication class.

~~~cpp
int main(int argc, char *argv[])
{
    Application a(argc, argv);
    Widget w;
    w.show();
    return a.exec();
}
~~~
To try this out, you could create buttons in your widget app , connect signals from buttons to slots and debug output something in the slots. If you run the app, the slots are not going to respond on button clicks because clicks and double clicks are filtered out in our Application::notify() override.

From what we’ve seen so far, you can hopefully grasp how flexible Qt is in terms of event handling. To me personnaly, it feels like a flowing river, giving you different exit points where you can pass through to do your own thing.


With all thee options however, the question arises of which method one should use in their application. My strategy in everything, is to start from low caliber weapons and only upgrade to heavier ones when necessary. What I usually do is just inherit the class of interest and specific event handlers. I also use filters a lot especially when I have one crafted out that I can use on many widgets or objects. But this is my personal experience. I’m sure that, as you use more and more of Qt GUI, you’re going to develop your own habits when it comes to using events.

## Sending your own events
The five methods to handle events we just looked at are what you will mostly choose from when responding to events in your Qt Apps. However, in the documentation, you will most of the time come across the postEvent() and sendEvent() methods, that are used to send your own events to target objects in your Qt application. So we’re going to explore them a bit for completeness.

The documentation for sendEvent is pretty clear, it just sends the event to the target immediately. postEvent() works slightly in a different way in that it adds the event to some defined queue, and all events in the queue are processed later at a time that is decided by Qt. Each has its benefits and its drawbacks. Please note that you will rarely need to call these methods directly as, for one, there aren’t many opportunities for you as a developer to generate events that you would want to send somewhere, events are mostly going to be generated by the user of your app ( clicks,…) or the window system. The second reason is that even if you need to generate events, you will usually do that through Qt defined methods like update() and repaint() . In case you’re curious , we’re going to try and send our own event.

Create a regular bare bones widget application. Add a new QPushButton subclass for which you’re going to override mousePressEvent, mouseMoveEvent and mouseReleaseEvent. The header is shown below

~~~cpp
class Button : public QPushButton
{
    Q_OBJECT
public:
    explicit Button(QWidget *parent = nullptr);
protected:
    void mouseMoveEvent(QMouseEvent * e);
    void mousePressEvent(QMouseEvent *e);
    void mouseReleaseEvent(QMouseEvent *e);
signals:
public slots:
};
~~~

and the implementation below

~~~cpp
Button::Button(QWidget *parent) : QPushButton(parent)
{
}
 
void Button::mouseMoveEvent(QMouseEvent *e)
{
    qDebug() << "Mouse move at " << e->pos() ;
    QPushButton::mouseMoveEvent(e);
}
 
void Button::mousePressEvent(QMouseEvent *e)
{
    qDebug() << "Mouse press at " << e->pos() ;
    QPushButton::mousePressEvent(e);
}
 
void Button::mouseReleaseEvent(QMouseEvent *e)
{
    qDebug() << "Mouse release at " << e->pos() ;
    QPushButton::mouseReleaseEvent(e);
}
~~~
Our intent is to create two buttons in our user interface, button1 and button2. In button1’s slot, we’re going to craft a MouseEvent and send it to button2. In other words, when you click on button1, it’s going to look like you’re clicking on button2.

For us to see these events, button2 should be an instance of our custom Button class. A portion of our widget class looks like below

~~~cpp
Widget::Widget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::Widget)
{
    ui->setupUi(this);
 
    button2 = new Button(this);
    button2->setText("I am the phoenix king");
}
 
Widget::~Widget()
{
    delete ui;
}
 
void Widget::on_button1_clicked()
{
    QMouseEvent * mEvt = new QMouseEvent(QEvent::MouseButtonRelease, QPointF(10,10), Qt::LeftButton, Qt::LeftButton,Qt::NoModifier);
    if(QApplication::sendEvent(button2, mEvt)){
        qDebug() << "Event accepted";
    }else{
        qDebug() <<"Event rejected";
    }
}
~~~

button1 is defined in the ui form but its connected slot can be seen above. Inside it we are crafting a mouse event and giving it all the relevant information like which mouse button and the location of the click, and we send it to the target using the static QApplication::sendEvent() method. Because this method returns a bool indicating whether the event was accepted ( true ) or ignored ( false) , we leverage that return value to debug output that information.

button2 is going to receive the event and its relevant event handlers are going to be triggered. If you run the app and click on button1, you’re going see that button2 is going to respond through its event handlers.

~~~cpp
Mouse release at  QPoint(10,10)
Event accepted
~~~

You can change the event to QEvent::MouseButtonPress or QEvent::MouseMove to trigger the other event handlers. Using postEvent() to queue events is just as easy.

~~~cpp
void Widget::on_button1_clicked()
{
    QMouseEvent * mEvt = new QMouseEvent(QEvent::MouseButtonRelease, QPointF(10,10), Qt::LeftButton, Qt::LeftButton,Qt::NoModifier);
    QApplication::postEvent(button3,mEvt);
}
~~~

Running the app produces the same effect as sendEvent.

## Summary
Working with the event system is a critical skill for any Qt C++ GUI developer. This guide walked you through what events are, how they compare to signals and slots, how to use events. We went ahead and to look at some of most interesting events you can handle in your widget class and what is meant by event propagation. In later sections we explored different ways the Qt Event System offers work with events doing the best possible to give you concrete examples to play with the concepts right away. The article wraps up showing you how you can use sendEvent() and postEvent() to send your own events to objects. If you have any question, suggestion or just want to kick off a chat about the Event System of Qt, don’t hesitate to ping me in the comments below. I hope this was informative to you guys and thanks for reading.