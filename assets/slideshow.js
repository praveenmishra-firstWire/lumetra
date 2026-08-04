/**
 * <slideshow-component>
 * A carousel-style hero slideshow with autoplay, arrows, dots, a progress
 * bar, a slide counter, and a scroll-to-next-section indicator.
 *
 * Accessibility notes:
 * - Autoplay is disabled entirely when the visitor prefers reduced motion.
 * - A play/pause button is shown whenever autoplay is on, per WCAG 2.2.2
 *   (moving content that lasts longer than 5s needs a way to pause it).
 * - Only the active slide's interactive elements are keyboard-reachable;
 *   inactive slides are aria-hidden and their links get tabindex="-1".
 * - Autoplay pauses on hover, focus, and while the merchant is editing a
 *   block in the theme editor.
 */

class SlideshowComponent extends HTMLElement {
  connectedCallback() {
    this.slides = Array.from(this.querySelectorAll('.slideshow__slide'));
    if (!this.slides.length) return;

    this.track = this.querySelector('.slideshow__track');
    this.prevBtn = this.querySelector('.slideshow__arrow--prev');
    this.nextBtn = this.querySelector('.slideshow__arrow--next');
    this.dotsWrap = this.querySelector('.slideshow__dots');
    this.progressBar = this.querySelector('.slideshow__progress-bar');
    this.playPauseBtn = this.querySelector('.slideshow__playpause');
    this.counterCurrent = this.querySelector('.slideshow__counter-current');
    this.iconPause = this.querySelector('.icon-pause');
    this.iconPlay = this.querySelector('.icon-play');
    this.scrollLink = this.querySelector('[data-scroll-next]');

    this.current = this.slides.findIndex((slide) => slide.classList.contains('is-active'));
    if (this.current < 0) this.current = 0;

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.autoplay = this.dataset.autoplay === 'true' && !this.reducedMotion && this.slides.length > 1;
    this.speed = parseInt(this.dataset.autoplaySpeed, 10) || 5000;
    this.playing = this.autoplay;
    this.userPaused = false;
    this.timer = null;

    this._buildDots();
    this._bindEvents();
    this._syncA11y();
    if (this.playing) this.play();

    if (this.scrollLink) {
      this.scrollLink.addEventListener('click', (event) => {
        event.preventDefault();
        const wrapper = this.closest('[id^="shopify-section-"]') || this;
        const next = wrapper.nextElementSibling;
        if (next) next.scrollIntoView({ behavior: this.reducedMotion ? 'auto' : 'smooth' });
      });
    }
  }

  disconnectedCallback() {
    clearTimeout(this.timer);
  }

  _buildDots() {
    if (!this.dotsWrap) return;
    this.slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'slideshow__dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => {
        this.goTo(i);
        this.restart();
      });
      this.dotsWrap.appendChild(dot);
    });
    this.dots = Array.from(this.dotsWrap.children);
  }

  _bindEvents() {
    this.prevBtn?.addEventListener('click', () => { this.prev(); this.restart(); });
    this.nextBtn?.addEventListener('click', () => { this.next(); this.restart(); });

    this.playPauseBtn?.addEventListener('click', () => {
      this.playing ? this.pause(true) : this.play();
    });

    this.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { this.prev(); this.restart(); }
      if (event.key === 'ArrowRight') { this.next(); this.restart(); }
    });

    this.addEventListener('mouseenter', () => this.pause(false));
    this.addEventListener('mouseleave', () => { if (this.autoplay && !this.userPaused) this.play(); });
    this.addEventListener('focusin', () => this.pause(false));
    this.addEventListener('focusout', () => { if (this.autoplay && !this.userPaused) this.play(); });

    // Pause and jump to the relevant slide while a merchant edits a block.
    document.addEventListener('shopify:block:select', (event) => {
      const index = this.slides.indexOf(event.target.closest('.slideshow__slide'));
      if (index > -1) {
        this.pause(false);
        this.goTo(index);
      }
    });
    document.addEventListener('shopify:block:deselect', () => {
      if (this.autoplay && !this.userPaused) this.play();
    });
  }

  goTo(index, animateProgress = true) {
    this.current = (index + this.slides.length) % this.slides.length;
    this.slides.forEach((slide, i) => slide.classList.toggle('is-active', i === this.current));
    this.dots?.forEach((dot, i) => dot.classList.toggle('is-active', i === this.current));
    if (this.counterCurrent) this.counterCurrent.textContent = String(this.current + 1).padStart(2, '0');
    this._syncA11y();
    if (animateProgress) this._resetProgress();
  }

  next() { this.goTo(this.current + 1); }
  prev() { this.goTo(this.current - 1); }

  // Hides inactive slides from screen readers and keeps their links out of
  // the tab order, so keyboard/AT users only ever land on visible content.
  _syncA11y() {
    this.slides.forEach((slide, i) => {
      const active = i === this.current;
      if (active) {
        slide.removeAttribute('aria-hidden');
      } else {
        slide.setAttribute('aria-hidden', 'true');
      }
      slide.querySelectorAll('a, button').forEach((el) => {
        if (active) {
          el.removeAttribute('tabindex');
        } else {
          el.tabIndex = -1;
        }
      });
    });
  }

  play() {
    this.playing = true;
    this.userPaused = false;
    if (this.playPauseBtn) {
      this.playPauseBtn.setAttribute('aria-label', 'Pause slideshow');
      this.playPauseBtn.setAttribute('aria-pressed', 'false');
      this.iconPause.hidden = false;
      this.iconPlay.hidden = true;
    }
    this._resetProgress();
  }

  pause(userInitiated) {
    this.playing = false;
    if (userInitiated) this.userPaused = true;
    clearTimeout(this.timer);
    this.progressBar?.classList.remove('is-animating');
    if (userInitiated && this.playPauseBtn) {
      this.playPauseBtn.setAttribute('aria-label', 'Play slideshow');
      this.playPauseBtn.setAttribute('aria-pressed', 'true');
      this.iconPause.hidden = true;
      this.iconPlay.hidden = false;
    }
  }

  restart() {
    if (this.autoplay && !this.userPaused) this._resetProgress();
  }

  _resetProgress() {
    clearTimeout(this.timer);
    if (!this.progressBar) {
      if (this.playing) this.timer = setTimeout(() => this.next(), this.speed);
      return;
    }
    this.progressBar.classList.remove('is-animating');
    this.progressBar.style.width = '0%';
    if (!this.playing) return;
    requestAnimationFrame(() => {
      this.progressBar.style.transitionDuration = `${this.speed}ms`;
      this.progressBar.classList.add('is-animating');
      this.progressBar.style.width = '100%';
    });
    this.timer = setTimeout(() => this.next(), this.speed);
  }
}

if (!customElements.get('slideshow-component')) {
  customElements.define('slideshow-component', SlideshowComponent);
}
