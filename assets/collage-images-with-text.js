/**
 * Collage images with text
 * - Reveals the image collage with a staggered scale/fade-in once it
 *   scrolls into view.
 * - Reveals the button with its own scroll-in animation, independent of
 *   the collage.
 * Loops over every instance of the section on the page (originally this
 * was two inline <script> blocks scoped via #shopify-section-{{ id }},
 * which only works for inline Liquid-templated scripts; querying by class
 * here makes it work the same way as a plain external file).
 */
document.querySelectorAll('.civt-section').forEach(function (root) {
  var collage = root.querySelector('[data-civt-collage]');
  if (collage) {
    // Only hide/animate once JS has actually run — images stay visible by
    // default otherwise.
    collage.classList.add('civt-collage--animate-ready');

    if (!('IntersectionObserver' in window)) {
      collage.classList.add('is-revealed');
    } else {
      var collageObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            collage.classList.add('is-revealed');
            collageObserver.unobserve(collage);
          }
        });
      }, { threshold: 0.25 });

      collageObserver.observe(collage);
    }
  }

  var content = root.querySelector('[data-civt-content]');
  if (content) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      content.classList.add('is-visible');
    } else if (!('IntersectionObserver' in window)) {
      content.classList.add('is-visible');
    } else {
      var contentObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            content.classList.add('is-visible');
            contentObserver.unobserve(content);
          }
        });
      }, { threshold: 0.25, rootMargin: '0px 0px -10% 0px' });

      contentObserver.observe(content);
    }
  }
});
