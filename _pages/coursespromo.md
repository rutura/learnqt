---
layout: promo
title: "Master Qt Development with Our Learning Paths"
description: "Structured learning paths to take you from beginner to expert in Qt and C++ development"
cover: /assets/courses/image/LearnQt.png
permalink: "/udemy-discounted-9/"
---

<div class="alert alert-primary text-center p-4 mb-5">
  <h4 class="alert-heading mb-2">🎉 LIMITED TIME OFFER!</h4>
  <p class="mb-0">All courses are currently discounted to just {{site.price}}! Use coupon code <code>{{site.coupon}}</code> at checkout.<br>
  <small>Valid until {{site.couponvalidity}}</small></p>
</div>

### Structured Learning Paths

Empower yourself with structured courses designed to take you from beginner to expert, step-by-step. Each path is carefully crafted to deliver clear, practical skills you can immediately apply.

---

{% for path in site.data.learning_paths.learning_paths %}
### {{ path.icon }} {{ path.title }}

**Perfect for**: {{ path.description }}

**Courses Included**:

{% for course in path.courses %}
* **[{{ course.title }}]({{ site[course.url_key] }}{{ site.coupon }})** {% if course.tag %}*{{ course.tag }}*{% endif %}: {{ course.subtitle }}
{% endfor %}

**Outcome**: {{ path.outcome }}

{% unless forloop.last %}---{% endunless %}

{% endfor %}

<style>
.learning-path-courses {
  background: #f8f9fa;
  border-left: 4px solid #0d6efd;
  padding: 1rem 1.5rem;
  margin: 1rem 0;
}

h3 {
  margin-top: 2rem;
}

hr {
  margin: 2rem 0;
}
</style>

<div class="mt-5 p-4 bg-light rounded shadow-sm mb-4 text-center">
  <h2 class="h3 mb-3">🎁 Get Started with Our Free Resources!</h2>
  <p class="mb-4">Download your FREE copy of "Qt6 QML For Beginners - Community Edition" and kickstart your Qt journey today!</p>
  <img src="/assets/books/image/qt6_qml_mock.jpg" alt="Qt6 QML For Beginners Book Cover" class="img-fluid mb-4" style="max-width: 300px;">
  
  <script async data-uid="67a33fe28d" src="https://learnqtguide.kit.com/67a33fe28d/index.js"></script>
</div>