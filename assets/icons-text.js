/**
 * Icons with Text section
 * - Turns a grid into a swipeable/scrollable slider when its desktop or
 *   mobile layout setting is "slider" (CSS handles the actual switch via
 *   [data-layout-desktop]/[data-layout-mobile], this just adds nav + logic).
 * - Reveals icon blocks on scroll and enables a hover micro-animation,
 *   unless animations are disabled in section settings or the visitor
 *   prefers reduced motion.
 */

class IconsWithTextSlider {
  constructor(grid) {
    this.grid = grid;
    this.items = Array.from(grid.querySelectorAll('.icon-block'));

    if (!this.items.length) return;

    // Wrap the grid so arrows can be positioned relative to it.
    this.wrap = document.createElement('div');
    this.wrap.className = 'icons-with-text__slider-wrap';
    grid.parentNode.insertBefore(this.wrap, grid);
    this.wrap.appendChild(grid);

    this.prevBtn = this._makeArrow('prev', '\u2039');
    this.nextBtn = this._makeArrow('next', '\u203A');
    this.nav = document.createElement('div');
    this.nav.className = 'icons-with-text__nav';
    this.wrap.append(this.prevBtn, this.nextBtn, this.nav);

    this.prevBtn.addEventListener('click', () => this.step(-1));
    this.nextBtn.addEventListener('click', () => this.step(1));

    this.onScroll = this._throttle(() => this.updateActiveDot(), 100);
    this.grid.addEventListener('scroll', this.onScroll, { passive: true });

    this.refresh();
  }

  _makeArrow(direction, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `icons-with-text__arrow icons-with-text__arrow--${direction}`;
    button.setAttribute('aria-label', direction === 'prev' ? 'Previous' : 'Next');
    button.textContent = label;
    return button;
  }

  _throttle(fn, wait) {
    let last = 0;
    let timer = null;
    return (...args) => {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn(...args);
      } else {
        clearTimeout(timer);
        timer = setTimeout(() => {
          last = Date.now();
          fn(...args);
        }, wait);
      }
    };
  }

  isSliderMode() {
    return getComputedStyle(this.grid).display === 'flex';
  }

  visibleCount() {
    const cssVar = window.innerWidth <= 749 ? '--cols-mobile' : '--cols-desktop';
    const value = parseInt(getComputedStyle(this.grid).getPropertyValue(cssVar), 10);
    return Math.max(1, value || 1);
  }

  refresh() {
    const active = this.isSliderMode();
    this.prevBtn.style.display = active ? '' : 'none';
    this.nextBtn.style.display = active ? '' : 'none';
    this.nav.style.display = active ? '' : 'none';
    if (!active) return;

    const perView = this.visibleCount();
    const pageCount = Math.max(1, Math.ceil(this.items.length / perView));

    this.nav.innerHTML = '';
    this.dots = [];
    for (let i = 0; i < pageCount; i += 1) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'icons-with-text__dot';
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => this.goToPage(i));
      this.nav.appendChild(dot);
      this.dots.push(dot);
    }
    this.updateActiveDot();
  }

  _stepSize() {
    const itemWidth = this.items[0]?.getBoundingClientRect().width || 0;
    const gap = parseFloat(getComputedStyle(this.grid).columnGap) || 0;
    return itemWidth + gap;
  }

  step(direction) {
    this.grid.scrollBy({ left: direction * this._stepSize(), behavior: 'smooth' });
  }

  goToPage(pageIndex) {
    const perView = this.visibleCount();
    this.grid.scrollTo({ left: pageIndex * perView * this._stepSize(), behavior: 'smooth' });
  }

  updateActiveDot() {
    if (!this.dots || !this.dots.length) return;
    const perView = this.visibleCount();
    const step = this._stepSize() || 1;
    const page = Math.round(this.grid.scrollLeft / (perView * step));
    this.dots.forEach((dot, i) => dot.classList.toggle('is-active', i === page));
  }

  destroy() {
    this.grid.removeEventListener('scroll', this.onScroll);
  }
}

function initIconsWithText(container) {
  const sections = container.querySelectorAll('.icons-with-text');

  sections.forEach((section) => {
    const grid = section.querySelector('.icons-with-text__grid');
    if (!grid || grid.dataset.iwtInitialized) return;
    grid.dataset.iwtInitialized = 'true';

    const animate = !section.classList.contains('icons-with-text--no-animate');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const blocks = Array.from(grid.querySelectorAll('.icon-block'));
    blocks.forEach((block, i) => block.style.setProperty('--i', i));

    const slider = new IconsWithTextSlider(grid);

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => slider.refresh(), 150);
    });

    if (animate && !prefersReducedMotion && 'IntersectionObserver' in window) {
      const reveal = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              reveal.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.2 }
      );
      blocks.forEach((block) => reveal.observe(block));
    } else {
      blocks.forEach((block) => block.classList.add('is-visible'));
    }
  });
}

document.addEventListener('DOMContentLoaded', () => initIconsWithText(document));

// Re-initialize when a merchant adds/reloads this section in the theme editor.
document.addEventListener('shopify:section:load', (event) => {
  initIconsWithText(event.target);
});
