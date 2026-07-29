class HeroSlideshow {
  constructor(root) {
    this.root = root;
    this.slides = Array.from(root.querySelectorAll('.hero-slideshow__slide'));
    this.dots = Array.from(root.querySelectorAll('.hero-slideshow__dot'));
    this.prevBtn = root.querySelector('.hero-slideshow__arrow--prev');
    this.nextBtn = root.querySelector('.hero-slideshow__arrow--next');
    this.counterCurrent = root.querySelector('.hero-slideshow__counter-current');
    this.progressBar = root.querySelector('.hero-slideshow__progress-bar');

    this.autoplay = root.dataset.autoplay === 'true';
    this.autoplaySpeed = parseInt(root.dataset.autoplaySpeed, 10) || 6000;
    this.currentIndex = 0;
    this.timer = null;

    if (this.slides.length <= 1) return;

    this.bindEvents();
    this.updateCounter();
    if (this.autoplay) this.startAutoplay();

    // Pause autoplay when the section leaves the viewport
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            this.stopAutoplay();
          } else if (this.autoplay) {
            this.startAutoplay();
          }
        });
      },
      { threshold: 0.25 }
    );
    this.observer.observe(this.root);

    // Pause on hover/focus for accessibility and UX
    this.root.addEventListener('mouseenter', () => this.stopAutoplay());
    this.root.addEventListener('mouseleave', () => {
      if (this.autoplay) this.startAutoplay();
    });
    this.root.addEventListener('focusin', () => this.stopAutoplay());
  }

  bindEvents() {
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.goTo(this.currentIndex - 1));
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.goTo(this.currentIndex + 1));
    }
    this.dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        this.goTo(parseInt(dot.dataset.dotIndex, 10));
      });
    });

    // Basic swipe support
    let touchStartX = 0;
    this.root.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    this.root.addEventListener('touchend', (e) => {
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) > 50) {
        diff > 0 ? this.goTo(this.currentIndex - 1) : this.goTo(this.currentIndex + 1);
      }
    }, { passive: true });
  }

  goTo(index) {
    const total = this.slides.length;
    const nextIndex = (index + total) % total;

    this.slides[this.currentIndex].classList.remove('is-active');
    this.slides[nextIndex].classList.add('is-active');

    if (this.dots.length) {
      this.dots[this.currentIndex].classList.remove('is-active');
      this.dots[nextIndex].classList.add('is-active');
    }

    this.currentIndex = nextIndex;
    this.updateCounter();
    this.restartProgress();

    if (this.autoplay) this.startAutoplay();
  }

  updateCounter() {
    if (this.counterCurrent) {
      this.counterCurrent.textContent = String(this.currentIndex + 1).padStart(2, '0');
    }
  }

  restartProgress() {
    if (!this.progressBar) return;
    this.progressBar.classList.remove('is-animating');
    this.progressBar.style.width = '0%';
    // Force reflow so the transition restarts cleanly
    void this.progressBar.offsetWidth;
    if (this.autoplay) {
      this.progressBar.style.transitionDuration = `${this.autoplaySpeed}ms`;
      this.progressBar.classList.add('is-animating');
      requestAnimationFrame(() => {
        this.progressBar.style.width = '100%';
      });
    }
  }

  startAutoplay() {
    this.stopAutoplay();
    this.restartProgress();
    this.timer = setInterval(() => this.goTo(this.currentIndex + 1), this.autoplaySpeed);
  }

  stopAutoplay() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.progressBar) {
      this.progressBar.classList.remove('is-animating');
    }
  }
}

function initHeroSlideshows() {
  document.querySelectorAll('.hero-slideshow').forEach((el) => {
    if (!el.dataset.initialized) {
      new HeroSlideshow(el);
      el.dataset.initialized = 'true';
    }
  });
}

document.addEventListener('DOMContentLoaded', initHeroSlideshows);

// Re-init when a merchant adds/edits the section in the theme editor
document.addEventListener('shopify:section:load', (event) => {
  const slideshow = event.target.querySelector('.hero-slideshow');
  if (slideshow) {
    new HeroSlideshow(slideshow);
    slideshow.dataset.initialized = 'true';
  }
});


