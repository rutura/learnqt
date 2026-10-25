---
layout: promo
title: "Qt, C++ and QML Courses and Books"
description: "Every LearnQt course and book in one list, sold on Squared Academy, the new home of LearnQt, for building cross-platform apps on Windows, macOS, Linux, Mobile and Embedded."
cover: /assets/courses/image/LearnQt.png
permalink: "/discounts"
---

<!-- VIDEO COURSES -->
<section class="dl-section">
  <h2 class="dl-heading"><i class="fas fa-graduation-cap"></i> Video Courses</h2>
  <p class="dl-subheading">Video on demand · Lifetime access · Current offers are applied on Squared Academy</p>

  <ul class="dl-list">
    {% for course in site.data.courses.courses %}
    <li class="dl-item">
      <details class="dl-details">
        <summary class="dl-summary">
          <div class="dl-item-main">
            <span class="dl-title">{{ course.title }} <i class="fas fa-chevron-down dl-chevron"></i></span>
            <span class="dl-meta">{{ course.level }} &middot; {{ course.duration }}</span>
          </div>
          <div class="dl-item-price">
            <span class="dl-price">${{ course.price }}</span>
            <a class="dl-btn dl-btn--course" href="{% include course-link.html course=course %}" target="_blank"><img src="/assets/blog/image/LearnQt.png" class="dl-btn-icon dl-btn-icon--outline"> Buy</a>
          </div>
        </summary>
        <div class="dl-description">
          <p>{{ course.description }}</p>
          <a class="dl-desc-link" href="{% include course-link.html course=course %}">Full course details →</a>
        </div>
      </details>
    </li>
    {% endfor %}
  </ul>

  <p class="dl-note">Want more than one course? <a href="{{ site.data.courses.pricing.monthly.link }}">Squared Academy membership starts at ${{ site.data.courses.pricing.monthly.price }}/mo</a> and covers every course published there.</p>
</section>

<!-- BOOKS -->
<section class="dl-section dl-section--alt">
  <h2 class="dl-heading"><i class="fas fa-book"></i> Books</h2>
  <p class="dl-subheading">PDF &amp; EPUB on Squared Academy · Paperback on Amazon</p>

  <ul class="dl-list">
    {% for book in site.data.books.books %}
    {% if book.status == 'available' or book.status == 'free' %}
    <li class="dl-item">
      <details class="dl-details">
        <summary class="dl-summary">
          <div class="dl-item-main">
            <span class="dl-title">{{ book.title }} <i class="fas fa-chevron-down dl-chevron"></i></span>
            <span class="dl-meta">{{ book.level }} &middot; {{ book.pages }} pages{% if book.rating and book.rating != '' %} &middot; <i class="fas fa-star dl-star"></i> {{ book.rating }}/5{% endif %} &middot; {{ book.formats | join: ", " }}</span>
          </div>
          <div class="dl-item-price">
            <span class="dl-price">{{ book.price }}</span>
            {% if book.status == 'free' %}
              <a class="dl-btn dl-btn--course" href="{{ book.link }}">Get it free</a>
            {% else %}
              <a class="dl-btn dl-btn--course" href="{{ book.link }}" target="_blank"><img src="/assets/blog/image/LearnQt.png" class="dl-btn-icon dl-btn-icon--outline"> PDF &amp; EPUB</a>
            {% endif %}
            {% if book.status == 'free' %}
            {% elsif book.amazon_link and book.amazon_link != '' %}
              <a class="dl-btn dl-btn--amazon" href="{{ book.amazon_link }}" target="_blank"><i class="fab fa-amazon"></i> Paperback</a>
            {% else %}
              <span class="dl-btn dl-btn--disabled"><i class="fab fa-amazon"></i> Paperback</span>
            {% endif %}
          </div>
        </summary>
        <div class="dl-description">
          <p>{{ book.description }}</p>
        </div>
      </details>
    </li>
    {% endif %}
    {% endfor %}
  </ul>
</section>

<div class="dl-newsletter-wave">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" preserveAspectRatio="none" style="height:60px;">
    <path fill="#1a202c" d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z"/>
  </svg>
</div>

{% include newsletter.html %}

<style>
/* ── Page breathing room ── */
.promo-header {
  padding-top: 120px !important;
  padding-bottom: 1rem !important;
}

/* ── Sections ── */
.dl-section {
  padding: 2.5rem 0;
}

.dl-section:first-of-type {
  padding-top: 0;
}

.dl-section--alt {
  background: linear-gradient(180deg, #f8faf8 0%, #ffffff 100%);
  border-radius: 20px;
  padding: 2rem 1.5rem;
  margin: 1rem 0;
}

/* ── Wave transition before newsletter ── */
.dl-newsletter-wave {
  display: block;
  line-height: 0;
  margin-bottom: -2px;
}

.dl-newsletter-wave svg {
  display: block;
  width: 100%;
}

/* ── Collapsible cards ── */
.dl-details {
  width: 100%;
}

.dl-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  list-style: none;
  cursor: pointer;
  width: 100%;
}

.dl-summary::-webkit-details-marker { display: none; }

.dl-chevron {
  font-size: 0.65rem;
  color: #a0aec0;
  margin-left: 0.3rem;
  transition: transform 0.2s;
}

details[open] .dl-chevron {
  transform: rotate(180deg);
}

.dl-description {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f0f4f0;
  color: #4a5568;
  font-size: 0.9rem;
  line-height: 1.6;
}

.dl-description p {
  margin: 0 0 0.5rem;
}

.dl-desc-link {
  font-size: 0.85rem;
  color: #15ba29;
  font-weight: 600;
  text-decoration: none;
}

.dl-desc-link:hover {
  text-decoration: underline;
}

/* ── Headings ── */
.dl-heading {
  font-size: 1.4rem;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 0.25rem;
}

.dl-heading i {
  color: #15ba29;
  margin-right: 0.4rem;
}

.dl-subheading {
  color: #718096;
  font-size: 0.9rem;
  margin-bottom: 1.25rem;
}

/* ── Cards ── */
.dl-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dl-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1.1rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
  flex-wrap: wrap;
  transition: box-shadow 0.2s, transform 0.2s;
}

.dl-item:hover {
  box-shadow: 0 4px 16px rgba(21, 186, 41, 0.12), 0 1px 4px rgba(0,0,0,0.06);
  transform: translateY(-1px);
}

.dl-item-main {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
  min-width: 0;
}

.dl-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1a202c;
  text-decoration: none;
}

.dl-title:hover {
  color: #15ba29;
}

.dl-meta {
  font-size: 0.82rem;
  color: #718096;
}

.dl-star {
  color: #f6ad55;
  font-size: 0.75rem;
}

.dl-item-price {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
}

.dl-price {
  font-size: 1.05rem;
  font-weight: 700;
  color: #15ba29;
}

.dl-original {
  font-size: 0.85rem;
  color: #a0aec0;
}

.dl-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.85rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.2s;
}

/* LearnQt green — video courses */
.dl-btn--course {
  background: #15ba29;
  color: #fff;
}

.dl-btn--course:hover {
  background: #0d8a1f;
  color: #fff;
  transform: translateY(-1px);
}

.dl-btn-icon {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  object-fit: contain;
  flex-shrink: 0;
}

.dl-btn-icon--outline {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 1px;
  border-radius: 4px;
}

/* Amazon — paperback */
.dl-btn--amazon {
  background: #fff;
  color: #1a202c;
  border: 1.5px solid #ff9900;
}

.dl-btn--amazon:hover {
  background: #fff8ee;
  color: #1a202c;
  border-color: #e68a00;
  transform: translateY(-1px);
}

.dl-btn--disabled {
  background: #f7fafc;
  color: #cbd5e0;
  border: 1.5px solid #edf2f7;
  border-radius: 8px;
  cursor: not-allowed;
}

.dl-note {
  font-size: 0.875rem;
  color: #718096;
  margin-top: 0.5rem;
}

.dl-note a {
  color: #15ba29;
  font-weight: 600;
}

@media (max-width: 600px) {
  .dl-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem 0.85rem;
  }

  .dl-item-main {
    gap: 0.15rem;
  }

  .dl-item-price {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: nowrap;
    gap: 0.5rem;
    width: 100%;
  }

  .dl-price {
    font-size: 1rem;
  }

  .dl-original {
    font-size: 0.8rem;
    margin-right: auto;
  }

  .dl-btn {
    padding: 0.3rem 0.65rem;
    font-size: 0.8rem;
  }

  .dl-btn--amazon,
  .dl-btn--disabled {
    padding: 0.3rem 0.65rem;
    font-size: 0.8rem;
  }

  .dl-section--alt {
    border-radius: 12px;
    padding: 1.5rem 1rem;
  }
}
</style>
