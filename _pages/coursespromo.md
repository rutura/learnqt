---
layout: promo
title: "Modern C++, Qt, QML and PySide6"
description: "Get Our Most Popular Time-Tested Course Bundles at Special Discount Prices"
cover: /assets/courses/image/LearnQt.png
permalink: "/udemy-discounted-9/"
---

<div class="alert text-white p-4 mb-5 shadow-sm" style="background-color: #15ba29;">
  <div class="text-center">
    <h4 class="alert-heading mb-3">🎉 LIMITED TIME SPECIAL OFFER!</h4>
    <p class="h5 mb-2">Get Complete Learning Paths for Just {{site.price}} per Course</p>
    <div class="badge bg-white px-3 py-2 mb-2" style="color: #15ba29;">Use Code: <strong>{{site.coupon}}</strong></div>
    <p class="mb-0"><small>Offer Valid Until {{site.couponvalidity}}</small></p>
  </div>
</div>

<div class="learning-paths">
{% for path in site.data.learning_paths.learning_paths %}
  <div class="learning-path-card mb-5 p-4 bg-white shadow-sm rounded">
    <h3 class="path-title mb-4">{{ path.title }}</h3>
    
    <div class="path-content">
      <div class="what-youll-learn mb-4">
        <h4 class="section-title h5" style="color: #15ba29;">Who Is It For:</h4>
        <p class="mb-3">{{ path.description }}</p>
      </div>

      <div class="learning-outcome mb-4">
        <h4 class="section-title h5" style="color: #15ba29;">By The End You'll Be Able To:</h4>
        <p>{{ path.outcome }}</p>
      </div>

      <div class="courses-included">
        <h4 class="section-title h5 mb-3" style="color: #15ba29;">Courses in This Path:</h4>
        <ul class="course-list list-unstyled">
        {% for course in path.courses %}
          <li class="mb-3">
            <div class="d-flex align-items-start">
              <span style="color: #15ba29;" class="me-2">✓</span>
              <div>
                <strong>{{ course.title }}</strong>
                {% if course.tag %}
                <span class="badge ms-2" style="background-color: #15ba29;">{{ course.tag }}</span>
                {% endif %}
                <br>
                <small class="text-muted">{{ course.subtitle }}</small>
              </div>
            </div>
          </li>
        {% endfor %}
        </ul>
      </div>

      <div class="text-center mt-4">
        <a href="/courses#{{ path.path_id }}" onclick="localStorage.setItem('scrollTo', '{{ path.path_id }}')" class="btn btn-lg px-4" style="background-color: #15ba29; color: white;">
          I Want These Courses
        </a>
      </div>
    </div>
  </div>
{% endfor %}
</div>

<div class="free-resource-card mt-5 p-4 bg-light rounded shadow-sm">
  <div class="row align-items-center">
    <div class="col-md-4 text-center mb-4 mb-md-0">
      <img src="/assets/books/image/qt6_qml_mock.jpg" alt="Qt6 QML For Beginners Book Cover" class="img-fluid rounded shadow-sm" style="max-width: 200px;">
    </div>
    <div class="col-md-8">
      <h2 class="h3 mb-3">Start Learning Qt QML Today.</h2>
      <p class="lead mb-4">Get Our Qt6 QML For Beginners Book For Free!</p>
      <div class="newsletter-form bg-white p-4 rounded shadow-sm">
        <script async data-uid="67a33fe28d" src="https://learnqtguide.kit.com/67a33fe28d/index.js"></script>
      </div>
    </div>
  </div>
</div>

<style>
.learning-path-card {
  border-left: 4px solid #15ba29;
}

.path-title {
  color: #333;
  font-size: 1.75rem;
}

.section-title {
  font-weight: 600;
}

.course-list li {
  padding-left: 1rem;
}

.free-resource-card {
  background: linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%);
}

.newsletter-form {
  border: 1px solid rgba(21, 186, 41, 0.1);
}
</style>