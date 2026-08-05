/**
 * Collection Feature List
 * - Touch devices have no hover state, so a brief 'is-touched' class is
 *   added on touchstart to preview the hover state before navigating.
 * - Staggers a scroll-in reveal for each list item.
 *
 * Originally scoped via document.getElementById('cf-{{ section.id }}'),
 * which only works inline. Since this now loads as a static file, it
 * loops over every .cf-section instance instead.
 */
document.querySelectorAll('.cf-section').forEach(function (root) {
  var items = root.querySelectorAll('.cf-item');

  items.forEach(function (item) {
    var link = item.querySelector('.cf-link');
    if (!link) return;

    item.addEventListener('touchstart', function () {
      items.forEach(function (i) { i.classList.remove('is-touched'); });
      item.classList.add('is-touched');
    }, { passive: true });

    item.addEventListener('touchend', function () {
      setTimeout(function () { item.classList.remove('is-touched'); }, 400);
    });
  });

  /* Stagger reveal on scroll into view */
  if (!('IntersectionObserver' in window)) return;

  var listItems = root.querySelectorAll('.cf-item');
  listItems.forEach(function (el, i) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity 0.55s ease ' + (i * 0.07) + 's, transform 0.55s ease ' + (i * 0.07) + 's';
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  listItems.forEach(function (el) { io.observe(el); });
});
