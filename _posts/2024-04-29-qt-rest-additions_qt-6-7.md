---
layout: post
title: "REST clients in Qt6.7 and up: QNetworkAccessFactory and QRestAccessManager."
description: Use RESTfull APIs naturally in Qt applications.
cover: /assets/img/blog/rest-clients-qt-6-7-and-up.png
date: '2024-04-29'
categories:
    - C++
tags:
    - QNetworkAccessManager
    - QNetworkRequestFactory
    - QRestAccessManager
    - C++
comments: true
sidebar: true

coursescard: true
bookcard: true


---

A few weeks ago (somewhere in March 2024) a social media post popped up in my feed from the Qt Company, introducing changes that had to do with [RESTfull clients](https://www.qt.io/blog/restful-client-applications-in-qt-6.7-and-forward) in Qt. I went through the post pretty fast and while I thought the new changes were useful, I didn't think it was groundbreaking enough to guarranty an update to a few of the projects with REST capabilities we have lying around. **I was wrong!**

This week, as I was working on updates to my Qt 6 QML course updates, I decided to give the thing a try:

## The old way.

**QNetworkAccessManager** is built to have basic HTTP capabilities and is not specifically tailored to REST APIs. But many people use it to send requests that expect a JSON formatted response, and they parse the JSON to extract the data. If you need to use different HTTP headers, you have no choice but to reconfigure  your QNetworkAccessManager object somehow, and send new requests with the new headers. The main workflow would be something like below:

~~~cpp
class AppWrapper : public QObject
{
    Q_OBJECT
public:
private:
    std::unique_ptr<QNetworkAccessManager> mNetManager;
    QNetworkReply* mNetReply;
    QByteArray mDataBuffer;
};
~~~

We would have a **QNetworkAccessManager** and a few helper objects as members of some class, and use them in the implementation to send requests out to the server:

~~~cpp
void AppWrapper::fetchPosts()
{
    //Initialize our API data
    const QUrl API_ENDPOINT("https://jsonplaceholder.typicode.com/posts");

    QNetworkRequest request;
    request.setUrl(API_ENDPOINT);

    mNetReply = mNetManager->get(request);
    connect(mNetReply,&QIODevice::readyRead,this,&AppWrapper::dataReadyRead);
    connect(mNetReply,&QNetworkReply::finished,this,&AppWrapper::dataReadFinished);
}
~~~

Notice that **API_ENDPOINT** contains both the base url and the actual end point. Another disturbing detail is that we have to grab each chunk of data we get in the dataReadyRead slot and manually add it to the buffer member, another thing we have to maintain. The new additions in Qt 6.7 make this better in a few ways.

## The new way.

Two new classes have been introduced to help in this: **QNetworkRequestFactory** and **QRestAccessManager**. **QNetworkRequestFactory** is used to craft requests. **QRestAccessManager** sends those requests out. An example should show this better. Here is the previous code updated to use these two new classes:


~~~cpp
class AppWrapper : public QObject
{
    Q_OBJECT
public:
private:
    QNetworkAccessManager net_manager;
    std::unique_ptr<QNetworkRequestFactory> m_factory;
    std::unique_ptr<QRestAccessManager> m_rest_access_manager;
    QStringList mPosts;
};
~~~

First, notice that the buffer member is gone. One less thing to worry about! Let's look at the constructor implementation for our fictional class.


~~~cpp
AppWrapper::AppWrapper(QObject* parent) : QObject(parent),
    m_rest_access_manager(std::make_unique<QRestAccessManager>(&net_manager)),
    m_factory(std::make_unique<QNetworkRequestFactory>())
{
    m_factory->setBaseUrl(QUrl("https://jsonplaceholder.typicode.com"));
}
~~~

Notice that QRestAccessManager is just a layer on top of QNetworkAccessManager with some REST capabilities built in. As powerful as it is, it still needs to be taught how to actually send requests. That's why it takes a QNetworkAccessManager parameter in its constructor. We also set the base url in the body of the constructor. The most important method, that sends the requests is shown below:

~~~cpp
void AppWrapper::fetchPosts()
{
    //Set up a GET request
    m_rest_access_manager->get(m_factory->createRequest("/posts"),this, [this](QRestReply &reply) {
        if(reply.isSuccess()){
            //Turn the data into a json document
             auto doc = reply.readJson();

            //Turn document into json array: Have to read the value from an std::optional object returned from doc.
             QJsonArray array = doc.value().array();

            for ( int i = 0; i < array.size(); i++)
            {
                QJsonObject object = array.at(i).toObject();
                QVariantMap map = object.toVariantMap();
                QString title = map["title"].toString();
                mPosts.append(title);//Use the data.
            }
        }
    });
}
~~~

Now isn't this beautiful! In this snippet, we are sending a GET request, but QRestAccessManager can do PUSH, POST and PATCH requests. This is not specific to QRestAccessManager, but this also awakened my mind to the fact that one can pass a lambda that processes the final response and avoid jumping through hoops saving data chunks in a maintained buffer: The QRestReply parameter contains the final response from the server. Of course this is just a tip of the iceberg, and there is more that you can do in terms of headers and other HTTP methods.

 If you need more concrete examples on how to take full advantage of these additions, I strongly recommend going through the official [Qt Colorpalette Client](https://doc-snapshots.qt.io/qt6-6.7/qtdoc-demos-colorpaletteclient-example.html) example application. If that example feels too complicated, may be you need to freshen on your Qt, C++ and QML skills. I have a few courses that can help you with that. Be sure to [check them out](https://www.learnqt.guide/udemy-discounted-9/). Who knows, may be you can even get yourself a free copy of our Qt Creator booklet!

This post was meant to spice up your appetite for this. Do you feel like this is something you would take advantage of in your own projects? Share in the comments below.
