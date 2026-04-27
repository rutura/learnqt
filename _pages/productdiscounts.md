---
layout: promo
title: "Save on Qt, C++ and QML Training from the Professionals"
description: "Expert courses and books for building cross-platform apps on Windows, macOS, Linux, Mobile and Embedded. All at a discount."
cover: /assets/courses/image/LearnQt.png
permalink: "/discounts"
---

{% if site.coupon and site.coupon != '' %}
<div class="coupon-bar">
  <span>Use code</span>
  <code class="coupon-code" id="coupon-code">{{ site.coupon }}</code>
  <button class="copy-btn" onclick="copyCoupon()">Copy</button>
  <span class="coupon-save">— save {{ site.offby }}% · valid until {{ site.couponvalidity }}</span>
</div>
{% endif %}

<!-- VIDEO COURSES -->
<section class="dl-section">
  <h2 class="dl-heading"><i class="fas fa-graduation-cap"></i> Video Courses</h2>
  <p class="dl-subheading">Video on demand · Lifetime access · 30-day money-back guarantee</p>

  <ul class="dl-list">
    {% for course in site.data.courses.courses %}
    {% assign c_full = course.pricing_override.lifetime.price %}
    {% assign base_link = course.pricing_override.lifetime.teachable_link %}
    {% if site.coupon and site.coupon != '' %}
      {% assign buy_link = base_link | append: "&coupon_code=" | append: site.coupon %}
      {% assign c_keep = 100 | minus: site.offby %}
      {% assign c_price = c_full | times: c_keep | divided_by: 100 %}
    {% else %}
      {% assign buy_link = base_link %}
      {% assign c_price = c_full %}
    {% endif %}
    <li class="dl-item">
      <div class="dl-item-main">
        <a class="dl-title" href="/courses/{{ course.id }}/">{{ course.title }}</a>
        <span class="dl-meta">{{ course.level }} &middot; {{ course.duration }} &middot; <i class="fas fa-star dl-star"></i> {{ course.satisfaction_rating }}</span>
      </div>
      <div class="dl-item-price">
        {% if site.coupon and site.coupon != '' %}
          <span class="dl-price">${{ c_price }}</span>
          <s class="dl-original">${{ c_full }}</s>
        {% else %}
          <span class="dl-price">${{ c_full }}</span>
        {% endif %}
        <a class="dl-btn" href="{{ buy_link }}" target="_blank">Buy →</a>
      </div>
    </li>
    {% endfor %}
  </ul>

  <p class="dl-note">Need access to all courses? <a href="/courses/#pricing">Library plans start at ${{ site.data.courses.pricing.monthly.price }}/mo</a> with a {{ site.data.courses.pricing.monthly.trial_days }}-day free trial.</p>
</section>

<!-- BOOKS -->
<section class="dl-section dl-section--alt">
  <h2 class="dl-heading"><i class="fas fa-book"></i> Books</h2>
  <p class="dl-subheading">Sold on Gumroad and Amazon · PDF, EPUB & Paperback · Instant download</p>

  <ul class="dl-list">
    {% for book in site.data.books.books %}
    {% if book.status == 'available' %}
    {% assign base_book_link = book.gumroad_link %}
    {% if site.coupon and site.coupon != '' %}
      {% assign book_link = base_book_link | append: "/" | append: site.coupon %}
    {% else %}
      {% assign book_link = base_book_link %}
    {% endif %}
    {% assign b_full = book.price | remove: "$" | times: 1 %}
    {% if site.coupon and site.coupon != '' and site.offby != '' %}
      {% assign b_keep = 100 | minus: site.offby %}
      {% assign b_price = b_full | times: b_keep | divided_by: 100 %}
    {% else %}
      {% assign b_price = b_full %}
    {% endif %}
    <li class="dl-item">
      <div class="dl-item-main">
        <span class="dl-title">{{ book.title }}</span>
        <span class="dl-meta">{{ book.level }} &middot; {{ book.pages }} pages{% if book.rating and book.rating != '' %} &middot; <i class="fas fa-star dl-star"></i> {{ book.rating }}/5{% endif %} &middot; {{ book.formats | join: ", " }}</span>
      </div>
      <div class="dl-item-price">
        {% if site.coupon and site.coupon != '' %}
          <span class="dl-price">${{ b_price }}</span>
          <s class="dl-original">${{ b_full }}</s>
        {% else %}
          <span class="dl-price">${{ b_full }}</span>
        {% endif %}

        <a class="dl-btn" href="{{ book_link }}" target="_blank">Digital →</a>
        {% if book.amazon_link and book.amazon_link != '' %}
          <a class="dl-btn dl-btn--secondary" href="{{ book.amazon_link }}" target="_blank">Paperback →</a>
        {% else %}
          <span class="dl-btn dl-btn--disabled">Paperback</span>
        {% endif %}
      </div>
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

/* ── Coupon bar ── */
.coupon-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  background: #f0fdf4;
  border: 1.5px solid #15ba29;
  border-radius: 12px;
  padding: 0.75rem 1.25rem;
  margin: 1.5rem 0 2rem;
  font-size: 0.95rem;
  box-shadow: 0 2px 12px rgba(21, 186, 41, 0.08);
}

.coupon-code {
  background: #15ba29;
  color: #fff;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 1px;
  font-family: 'Courier New', monospace;
}

.copy-btn {
  background: none;
  border: 1.5px solid #15ba29;
  color: #15ba29;
  padding: 0.2rem 0.65rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: #15ba29;
  color: #fff;
}

.coupon-save {
  color: #4a5568;
  font-size: 0.9rem;
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
  background: #15ba29;
  color: #fff;
  padding: 0.35rem 0.85rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.2s;
}

.dl-btn:hover {
  background: #0d8a1f;
  color: #fff;
}

.dl-btn--secondary {
  background: #fff;
  color: #1a202c;
  border: 1.5px solid #cbd5e0;
  border-radius: 8px;
}

.dl-btn--secondary:hover {
  background: #f7fafc;
  color: #1a202c;
  border-color: #a0aec0;
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

  .dl-btn--secondary,
  .dl-btn--disabled {
    padding: 0.3rem 0.65rem;
    font-size: 0.8rem;
  }

  .coupon-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .dl-section--alt {
    border-radius: 12px;
    padding: 1.5rem 1rem;
  }
}
</style>

<script>
function copyCoupon() {
  const code = document.getElementById('coupon-code').textContent.trim();
  navigator.clipboard.writeText(code).then(function () {
    const btn = document.querySelector('.copy-btn');
    btn.textContent = 'Copied!';
    setTimeout(function () { btn.textContent = 'Copy'; }, 2000);
  });
}
</script>
