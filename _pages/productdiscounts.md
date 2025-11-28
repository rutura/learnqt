---
layout: promo
title: "Special Discounts on Qt Courses & Books"
description: "Limited Time Offer - Save {{site.offby}}% on Professional Qt Development Training"
cover: /assets/courses/image/LearnQt.png
permalink: "/discounts"
---

<!-- Coupon Banner -->
<div class="discount-banner">
  <div class="container">
    <div class="banner-content">
      <h1 class="banner-title">🎉 Save {{site.offby}}% on All Courses & Books</h1>
      <p class="banner-subtitle">Limited time offer - Use coupon code at checkout</p>
      <div class="coupon-display">
        <span class="coupon-label">Coupon Code:</span>
        <code class="coupon-code">{{site.coupon}}</code>
        <button class="copy-button" onclick="copyCoupon()">Copy</button>
      </div>
      <p class="validity-text">Valid until {{site.couponvalidity}}</p>
    </div>
  </div>
</div>

<!-- Courses Section -->
<section class="products-section">
  <div class="container">
    <h2 class="section-heading">Qt Courses <span class="discount-badge">{{site.offby}}% OFF</span></h2>
    
    <div class="products-list">
      {% for course in site.data.courses.courses %}
      <div class="product-item">
        <div class="product-image">
          <img src="{{course.image}}" alt="{{course.title}}" loading="lazy">
        </div>
        <div class="product-info">
          <h3 class="product-title">{{course.title}}</h3>
          <p class="product-description">{{course.description}}</p>
          <div class="product-meta">
            <span class="meta-item"><i class="fas fa-clock"></i> {{course.duration}}</span>
            <span class="meta-item"><i class="fas fa-code"></i> {{course.projects}}</span>
            <span class="meta-item"><i class="fas fa-star"></i> {{course.satisfaction_rating}}</span>
          </div>
          <a href="https://www.learnqt.guide/courses/" class="learn-more-btn">Learn More →</a>
        </div>
      </div>
      {% endfor %}
    </div>
  </div>
</section>

<!-- Books Section -->
<section class="products-section books-bg">
  <div class="container">
    <h2 class="section-heading">Qt Books <span class="discount-badge">{{site.offby}}% OFF</span></h2>
    
    <div class="products-list">
      {% for book in site.data.books.books %}
      <div class="product-item">
        <div class="product-image book-image">
          <img src="{{book.cover}}" alt="{{book.title}}" loading="lazy">
          {% if book.status == 'available' %}
          <span class="status-badge available">Available Now</span>
          {% elsif book.status == 'coming_up' %}
          <span class="status-badge coming-soon">Coming {{book.expected_date}}</span>
          {% endif %}
        </div>
        <div class="product-info">
          <h3 class="product-title">{{book.title}}</h3>
          <p class="product-description">{{book.description}}</p>
          <div class="product-meta">
            <span class="meta-item"><i class="fas fa-file-alt"></i> {{book.pages}} Pages</span>
            {% if book.rating %}
            <span class="meta-item"><i class="fas fa-star"></i> {{book.rating}}/5</span>
            {% endif %}
            <span class="meta-item"><i class="fas fa-book"></i> {{book.formats | join: ", "}}</span>
          </div>
          <a href="https://www.learnqt.guide/books/" class="learn-more-btn">Learn More →</a>
        </div>
      </div>
      {% endfor %}
    </div>
  </div>
</section>

<!-- Newsletter Section -->
{% include newsletter.html %}

<style>
/* Banner Styles */
.discount-banner {
  background: linear-gradient(135deg, #15ba29 0%, #0d8a1f 100%);
  padding: 3rem 0;
  margin-bottom: 3rem;
}

.banner-content {
  text-align: center;
  color: white;
}

.banner-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
}

.banner-subtitle {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.95;
}

.coupon-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.coupon-label {
  font-size: 1.1rem;
  font-weight: 600;
}

.coupon-code {
  background: white;
  color: #15ba29;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: 2px;
  font-family: 'Courier New', monospace;
}

.copy-button {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.copy-button:hover {
  background: white;
  color: #15ba29;
}

.validity-text {
  font-size: 1rem;
  opacity: 0.9;
}

/* Products Section */
.products-section {
  padding: 2rem 0;
}

.books-bg {
  background: #f8f9fa;
}

.section-heading {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 2rem;
  color: #2d3748;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.discount-badge {
  background: #15ba29;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 1rem;
  font-weight: 700;
}

.products-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.product-item {
  display: flex;
  gap: 2rem;
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.product-item:hover {
  box-shadow: 0 5px 20px rgba(21, 186, 41, 0.2);
  transform: translateY(-3px);
}

.product-image {
  flex-shrink: 0;
  width: 200px;
  height: 150px;
  position: relative;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.product-image.book-image {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f7fafc;
  height: auto;
  padding: 1rem;
}

.product-image.book-image img {
  width: 100%;
  height: auto;
  object-fit: contain;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.status-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 0.4rem 0.8rem;
  border-radius: 15px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.status-badge.available {
  background: #15ba29;
  color: white;
}

.status-badge.coming-soon {
  background: #ed8936;
  color: white;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.product-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 0.75rem;
}

.product-description {
  color: #4a5568;
  line-height: 1.6;
  margin-bottom: 1rem;
  flex-grow: 1;
}

.product-meta {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 0.9rem;
  color: #718096;
}

.meta-item i {
  color: #15ba29;
  margin-right: 0.4rem;
}

.learn-more-btn {
  display: inline-block;
  background: #15ba29;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  align-self: flex-start;
  transition: all 0.3s ease;
}

.learn-more-btn:hover {
  background: #0d8a1f;
  transform: translateX(5px);
  color: white;
}



/* Responsive */
@media (max-width: 768px) {
  .banner-title {
    font-size: 1.8rem;
  }
  
  .coupon-code {
    font-size: 1.4rem;
    padding: 0.5rem 1rem;
  }
  
  .product-item {
    flex-direction: column;
  }
  
  .product-image {
    width: 100%;
    height: 200px;
  }
  
  .section-heading {
    font-size: 1.5rem;
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

<script>
function copyCoupon() {
  const couponCode = document.querySelector('.coupon-code').textContent;
  navigator.clipboard.writeText(couponCode).then(function() {
    const btn = document.querySelector('.copy-button');
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.background = 'white';
    btn.style.color = '#15ba29';
    
    setTimeout(function() {
      btn.textContent = originalText;
      btn.style.background = 'rgba(255, 255, 255, 0.2)';
      btn.style.color = 'white';
    }, 2000);
  });
}
</script>