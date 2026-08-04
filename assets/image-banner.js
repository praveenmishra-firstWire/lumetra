/**
 * Image banner section
 * - Dismiss button hides the content box (persists only for the page view;
 *   no cookie/localStorage, so it reliably reappears on reload).
 * - Entrance animation (fade/slide) triggers once via IntersectionObserver,
 *   skipped entirely under prefers-reduced-motion.
 */
document.querySelectorAll('.image-banner').forEach((banner) => {
  const dismissButton = banner.querySelector('[data-dismiss-banner]');
  const content = banner.querySelector('.image-banner__content');

  dismissButton?.addEventListener('click', () => {
    content?.classList.add('is-dismissed');
  });

  const animate = banner.dataset.animate;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (animate && animate !== 'none' && !reducedMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            banner.classList.add('is-visible');
            observer.unobserve(banner);
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(banner);
  } else {
    banner.classList.add('is-visible');
  }
});
