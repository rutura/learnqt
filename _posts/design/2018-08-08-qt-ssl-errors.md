---
layout: page
title: "How to Get Rid of SSL Warnings in Qt Applications : QSslSocket: cannot resolve TLSv1_1_client_method Warnings"
teaser: "Get rid of SSL Warnings and errors in your Qt applications"
categories:
    - SSL
tags:
    - OPENSSL
    - SSL
header:
    image_fullwidth: header_qt.jpg
permalink : /networking/how-to-get-rid-of-ssl-warnings-in-qt-applications-qsslsocket-cannot-resolve-tlsv1_1_client_method-warnings
sidebar: right
comments: true
---

While working with the network aspects of your Qt applications, the majority of new people to Qt will face these cryptic warnings while to fetch data that is protected by TLS/SSL. In fact you are most probably here because you had that problem and you’re looking for a solution ;-). Most solutions online do try to address the problem and provide solutions, but to my knowledge none tried to lay out the root of the problem and provide clear steps to follow to solve the problem.It is the goal of this article to get this problem solved for you!

## The problem
When you try to get some data from a network resource protected by SSL, you get the warnings reproduced here for convenience :

```cpp
qt.network.ssl: QSslSocket: cannot resolve TLSv1_1_client_method
qt.network.ssl: QSslSocket: cannot resolve TLSv1_2_client_method
qt.network.ssl: QSslSocket: cannot resolve TLSv1_1_server_method
qt.network.ssl: QSslSocket: cannot resolve TLSv1_2_server_method
qt.network.ssl: QSslSocket: cannot resolve SSL_CONF_CTX_new
qt.network.ssl: QSslSocket: cannot resolve SSL_CONF_CTX_free
qt.network.ssl: QSslSocket: cannot resolve SSL_CONF_CTX_set_ssl_ctx
qt.network.ssl: QSslSocket: cannot resolve SSL_CONF_CTX_set_flags
qt.network.ssl: QSslSocket: cannot resolve SSL_CONF_CTX_finish
qt.network.ssl: QSslSocket: cannot resolve SSL_CONF_cmd
qt.network.ssl: QSslSocket: cannot resolve SSL_select_next_proto
qt.network.ssl: QSslSocket: cannot resolve SSL_CTX_set_next_proto_select_cb
qt.network.ssl: QSslSocket: cannot resolve SSL_get0_next_proto_negotiated
qt.network.ssl: QSslSocket: cannot resolve SSL_set_alpn_protos
qt.network.ssl: QSslSocket: cannot resolve SSL_CTX_set_alpn_select_cb
qt.network.ssl: QSslSocket: cannot resolve SSL_get0_alpn_selected
qt.network.ssl: QSslSocket: cannot call unresolved function SSL_get0_next_proto_negotiated
```

## Root of the problem
This problem surfaces because Qt offloads all the SSL/TLS work to the popular Openssl library. But due to licensing reasons I don’t want to get into, Qt doesn’t provide the needed dynamic libraries  your regular Qt application using SSL features needs to use at run time.I quote [the Qt documentation](http://doc.qt.io/qt-5/ssl.html)  here :

<blockquote>
Due to import and export restrictions in some parts of the world, we are unable to supply the OpenSSL Toolkit with Qt packages. Developers wishing to use SSL communication in their deployed applications should either ensure that their users have the appropriate libraries installed, or they should consult a suitably qualified legal professional to ensure that applications using code from the OpenSSL project are correctly certified for import and export in relevant regions of the world.
(Qt Documentation)</blockquote>

Another important piece of information to get [here](http://doc.qt.io/qt-5/ssl.html) is that :
<blockquote>
From Qt version 5.2 onwards, the officially supported version for OpenSSL is 1.0.0 or later. Versions >= 0.9.7 and < 1.0.0 might work, but are not guaranteed to work.
(Qt Dcumentation) </blockquote>

When we get to download our OpenSSL dynamic libraries, we’ll try to get anything higher than version 1.0.0 .

To have some context, these dynamic libraries are **libeay32.dll** and **ssleay32.dll** for windows platforms. In a perfect world, these dynamic libraries should come bundled in the Qt install bundle you download to install Qt on your host environment and you wouldn’t need to do any additional steps to get SSL to work in your Qt application. Now, I’m not a mind reader, but I bet there are a couple of questions running through your mind right now : What are the specific dynamic libraries I need to get this working ? Where do I get them from ? Where do I put them in my project ? Let’s address them one by one.

## What are the specific dynamic libraries I need to get this working ?
Because Qt is a cross platform, meaning Qt apps can run on varios Operating Systems like Windows, Linux, Mac, Android,IOS,…,and due to the fact that you may be using  different compilers for the target os, for example on Windows you may be using one of the MSVC compilers, or Mingw. Below is a list of possible combinations for different the Microsoft Windows OSs, both for x86 and x86_64 architectures. The full list covering all possible options can be found [here](http://doc.qt.io/qt-5/supported-platforms.html).

The point I want to make is, you need download different Openssl dynamic libraries for your target combination of OS(Architecture) and Compiler. For example, in my Qt Gui Course I am using Windows7(x86_64) + Mingw compiler so I should get the OpenSSL libraries for that combination.

## Where do I get them from ?
There are many websites that provide prebuilt OpenSSL binaries for different platforms. A good collection of them can be found [here](https://wiki.openssl.org/index.php/Binaries).



Please choose whatever you like for your target platform.

We go there and choose version 1.0.2a. You can choose any 1.0.x verion you want. I couldn’t get 1.1.x versions to work and it seems that the official builds of Qt 5.11, the latest version at the time of this writting, is linked against OpenSSL 1.0.x versions. So we stick to 1.0x in this tutorial. Another option is to build Qt yourself and link against 1.1.x versions as described here but we’re not going down that path in neither in the Qt C++ Gui Course or this tutorial.

Open the link to the [download](https://bintray.com/vszakats/generic/download_file?file_path=openssl-1.0.2a-win32-mingw.zip) and download the zip file . Please remember that I am  targeting a  MinGW-w64/GCC, 32/64-bit system to match what we use in my Qt GUI courses, you need to adapt all these steps for your target platform.

## Where do I put them in my project ?
Depending on whether you are running your application from Qt Creator or from a deployed executable file, you will need to put these OpenSSL DLLs in different places. If you are running your app from Qt Creator, which is the natural thing to do while in development phase of your application, you want to put these dlls in the /bin director of your Qt installation as shown in the figure below for my installation

Please take note the path to my Qt installation highlighted.When you have these dlls in there, do a clean/Run QMake / rebuild and run your application. If all is OK, your app will do its SSL magic without the errors/warnings we saw at at the start of this article.

When your application is distributed to other people in a given directory, you want to put those dlls in the  same folder as your executable file.

This should give you good ground to having a Qt environment for developing SSL enabled Qt applications. If you have any thoughts,questions or suggestions please shoot me in the comments below. For now I hope this has been informative to you and I would like to thank you for reading.