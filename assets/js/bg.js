const initialiseStyleBackgroundIntersectionObserver = () => {
  const lazyBackgrounds = Array.from(document.querySelectorAll('[data-background-image]'));

  if (lazyBackgrounds.length === 0) {
    return;
  }

  let lazyBackgroundObserver;

  const loadBackgroundIfElementOnScreen = (entry) => {
    if (entry.isIntersecting) {
      entry.target.style.backgroundImage = `url('${entry.target.dataset.backgroundImage}')`;
      lazyBackgroundObserver.unobserve(entry.target);
    }
  };

  const observeElementVisibility = (lazyBackground) => {
    lazyBackgroundObserver.observe(lazyBackground);
  };

  const setBackground = (element) => {
    element.style.backgroundImage = `url('${entry.target.dataset.backgroundImage}')`;
  };

  if (typeof window.IntersectionObserver === 'function') {
    lazyBackgroundObserver = new IntersectionObserver((entries) => {
      entries.forEach(loadBackgroundIfElementOnScreen);
    });
    lazyBackgrounds.forEach(observeElementVisibility);
  } else {
    lazyBackgrounds.forEach(setBackground);
  }
};

if (typeof document.readyState === 'string' && document.readyState === 'complete') {
  initialiseStyleBackgroundIntersectionObserver();
} else {
  document.addEventListener('DOMContentLoaded', initialiseStyleBackgroundIntersectionObserver, true);
}