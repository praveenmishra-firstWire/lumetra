/* ==========================================================================
   Rich Text section — behavior
   This section is static marketing content (heading/subheading/text/buttons),
   so there is no interactivity to wire up. The only JS-driven feature is an
   optional scroll-reveal animation, gated by the "Enable animation" section
   setting and by prefers-reduced-motion. Without JS (or with the setting
   off), everything is fully visible via CSS defaults — nothing depends on
   this script to render correctly.
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    init();
  }

  function init() {
    document.querySelectorAll('.rich-text[data-animate="true"]').forEach(setupReveal);
  }

  function setupReveal(root) {
    if (root.dataset.rtInitialized) return;
    root.dataset.rtInitialized = 'true';

    var blocks = Array.prototype.slice.call(root.querySelectorAll('.rich-text__block'));
    if (!blocks.length) return;

    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      blocks.forEach(function (block) { block.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    blocks.forEach(function (block, index) {
      block.style.transitionDelay = (index * 80) + 'ms';
      observer.observe(block);
    });
  }
})();
