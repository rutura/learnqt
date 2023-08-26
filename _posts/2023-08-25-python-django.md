---
layout: post
title: The Python Django
description: Why use django for develope modern dynamic site ??
cover: /assets/img/learnqtguide-social-cover.webp
date: '2023-08-25'
categories: 
 - web development
 - tutorial
tag: 
 - python
 - django
 - flask
 - django admin
comments: true
sidebar: true
coursescard: false
bookcard: false
---

Django is a fullstack web app framework for help you build modern dynamic website.

Download python and create virtual environment

~~~python
python -m venv venv
~~~

after that activate ENV

```
venv\Scripts\activate
```

then add new project

~~~python
django-admin startproject learnqtpython
~~~

Okay... now we can run 

{% highlight python %}
py manage.py runserver
{% endhighlight %}

and open `localhost:8000`


sample code

~~~python
class CarAdmin(admin.ModelAdmin):

    def image(self, object):
        return format_html('<img src="{}" width="60" style="border-radius:10px;"/>'.format(object.car_photo1.url))


    list_display = ('id', 'image', 'car_title', 'color', 'year','is_featured')
    list_display_links = ('id','car_title',)
    search_fields = ('car_title' , 'color', 'year')
    list_filter = ('car_title',)
    list_editable = ('is_featured',)

admin.site.register(Car, CarAdmin)
~~~

manage.py  files look likes 

~~~python
#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'car.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()

~~~

