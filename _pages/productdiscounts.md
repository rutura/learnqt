---
layout: promo
title: "Discounts on Qt Courses & Books"
description: "All products, all prices — apply one code at checkout to save."
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
  <p class="dl-subheading">Hosted on Teachable · Lifetime access · 30-day money-back guarantee</p>

  <ul class="dl-list">
    {% for course in site.data.courses.courses %}
    {% assign base_link = course.pricing_override.lifetime.teachable_link %}
    {% if site.coupon and site.coupon != '' %}
      {% assign buy_link = base_link | append: "&coupon_code=" | append: site.coupon %}
    {% else %}
      {% assign buy_link = base_link %}
    {% endif %}
    <li class="dl-item">
      <div class="dl-item-main">
        <a class="dl-title" href="/courses/{{ course.id }}/">{{ course.title }}</a>
        <span class="dl-meta">{{ course.level }} &middot; {{ course.duration }} &middot; <i class="fas fa-star dl-star"></i> {{ course.satisfaction_rating }}</span>
      </div>
      <div class="dl-item-price">
        <span class="dl-price">${{ site.data.courses.pricing.lifetime.price }}</span>
        <s class="dl-original">${{ site.data.courses.pricing.lifetime.original_price }}</s>
        <a class="dl-btn" href="{{ buy_link }}" target="_blank">Buy →</a>
      </div>
    </li>
    {% endfor %}
  </ul>

  <p class="dl-note">Need access to all courses? <a href="/courses">Library plans start at ${{ site.data.courses.pricing.monthly.price }}/mo</a> with a {{ site.data.courses.pricing.monthly.trial_days }}-day free trial.</p>
</section>

<!-- BOOKS -->
<section class="dl-section dl-section--alt">
  <h2 class="dl-heading"><i class="fas fa-book"></i> Books</h2>
  <p class="dl-subheading">Sold on Gumroad · PDF, EPUB & Paperback · Instant download</p>

  <ul class="dl-list">
    {% for book in site.data.books.books %}
    {% if book.status == 'available' %}
    {% assign base_book_link = book.gumroad_link %}
    {% if site.coupon and site.coupon != '' %}
      {% assign book_link = base_book_link | append: "?wanted=true&coupon=" | append: site.coupon %}
    {% else %}
      {% assign book_link = base_book_link %}
    {% endif %}
    <li class="dl-item">
      <div class="dl-item-main">
        <a class="dl-title" href="{{ book_link }}" target="_blank">{{ book.title }}</a>
        <span class="dl-meta">{{ book.level }} &middot; {{ book.pages }} pages &middot; <i class="fas fa-star dl-star"></i> {{ book.rating }}/5 &middot; {{ book.formats | join: ", " }}</span>
      </div>
      <div class="dl-item-price">
        <span class="dl-price">{{ book.price }}</span>
        <a class="dl-btn" href="{{ book_link }}" target="_blank">Buy →</a>
      </div>
    </li>
    {% endif %}
    {% endfor %}
  </ul>
</section>

<style>
.coupon-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  background: #f0fdf4;
  border: 1.5px solid #15ba29;
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  margin: 1.5rem 0 2rem;
  font-size: 0.95rem;
}

.coupon-code {
  background: #15ba29;
  color: #fff;
  padding: 0.25rem 0.75rem;
  border-radius: 5px;
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
  border-radius: 5px;
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

.dl-section {
  padding: 2rem 0;
  border-top: 1px solid #e2e8f0;
}

.dl-section--alt {
  background: #f8f9fa;
  margin-left: -15px;
  margin-right: -15px;
  padding-left: 15px;
  padding-right: 15px;
}

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

.dl-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.dl-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  flex-wrap: wrap;
}

.dl-item:hover {
  border-color: #15ba29;
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
  border-radius: 6px;
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
  }

  .dl-item-price {
    width: 100%;
    justify-content: space-between;
  }

  .coupon-bar {
    flex-direction: column;
    align-items: flex-start;
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
