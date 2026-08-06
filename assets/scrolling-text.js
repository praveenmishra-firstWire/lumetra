/* ==========================================================================
   Scrolling Promotion section — behavior
   The infinite loop itself is pure CSS (see scrolling-promotion.css) and
   works with no JS at all, using a fixed fallback duration. This script
   only calibrates that duration so the *visual speed* (px/second) stays
   constant regardless of how much content a merchant adds, and pauses the
   animation while the section is off-screen to save CPU/battery.
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    init();
  }

  function init() {
    document.querySelectorAll('[data-scrolling-promo]').forEach(setup);
  }

  function setup(root) {
    if (root.dataset.spInitialized) return;
    root.dataset.spInitialized = 'true';

    var track = root.querySelector('[data-scrolling-promo-track]');
    if (!track) return;

    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return; // CSS already disables the animation; nothing to calibrate.

    var speed = parseFloat(root.dataset.speed) || 60; // px per second
    var firstSet = track.querySelector('.scrolling-promo__set');

    function calibrate() {
      if (!firstSet) return;
      var setWidth = firstSet.getBoundingClientRect().width;
      if (!setWidth) return;
      var duration = setWidth / speed;
      root.style.setProperty('--sp-duration', duration + 's');
    }

    calibrate();

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(calibrate, 200);
    });

    if (typeof IntersectionObserver !== 'undefined') {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          track.classList.toggle('is-paused', !entry.isIntersecting);
        });
      }, { threshold: 0 });
      observer.observe(root);
    }
  }
})();
