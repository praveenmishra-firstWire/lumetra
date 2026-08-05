(function () {
  if (customElements.get('premium-testimonials')) return;

  class PremiumTestimonials extends HTMLElement {
    connectedCallback() {
      this.avatars = Array.from(this.querySelectorAll('.pt-avatar'));
      this.contents = Array.from(this.querySelectorAll('.pt-content'));
      this.track = this.querySelector('.pt-track');
      this.wrapper = this.querySelector('.pt-track-wrapper');
      this.prevBtn = this.querySelector('[data-pt-prev]');
      this.nextBtn = this.querySelector('[data-pt-next]');
      this.count = parseInt(this.dataset.count, 10) || this.avatars.length;
      this.infinite = this.count > 1;
      // With 3 cloned copies, the middle copy starts at physical index `count`.
      this.physicalIndex = this.infinite ? this.count : 0;
      this.autorotateTimer = null;

      this.avatars.forEach((avatar, physicalIdx) => {
        avatar.addEventListener('click', () => {
          if (avatar.classList.contains('is-selected')) return;
          this.goTo(physicalIdx);
          this.restartAutorotate();
        });
      });

      if (this.prevBtn) {
        this.prevBtn.addEventListener('click', () => {
          this.goTo(this.physicalIndex - 1);
          this.restartAutorotate();
        });
      }
      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', () => {
          this.goTo(this.physicalIndex + 1);
          this.restartAutorotate();
        });
      }

      if (this.track) {
        this.track.addEventListener('transitionend', (e) => {
          if (e.propertyName === 'transform') this.settleLoop();
        });
      }

      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => this.centerTrack(), 100);
      });

      this.setActive(this.physicalIndex);
      requestAnimationFrame(() => this.centerTrack());

      if (this.dataset.autorotate === 'true' && this.infinite && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.startAutorotate();
        this.addEventListener('mouseenter', () => this.stopAutorotate());
        this.addEventListener('mouseleave', () => this.startAutorotate());
        this.addEventListener('focusin', () => this.stopAutorotate());
        this.addEventListener('focusout', () => this.startAutorotate());
      }
    }

    goTo(physicalIdx) {
      this.setActive(physicalIdx);
    }

    setActive(physicalIdx) {
      this.physicalIndex = physicalIdx;
      const activeAvatar = this.avatars[physicalIdx];
      const logicalIdx = activeAvatar ? parseInt(activeAvatar.dataset.logicalIndex, 10) : 0;

      this.avatars.forEach((avatar, i) => {
        const distance = Math.abs(i - physicalIdx);
        avatar.classList.remove('is-selected', 'is-near');
        if (distance === 0) {
          avatar.classList.add('is-selected');
        } else if (distance === 1) {
          avatar.classList.add('is-near');
        }
      });

      this.contents.forEach((content) => {
        content.classList.toggle('is-active', parseInt(content.dataset.index, 10) === logicalIdx);
      });

      this.centerTrack();
    }

    // After the slide animation into a clone finishes, silently jump back
    // into the middle copy (same visual content, so the jump is invisible).
    // Uses setActive() (not a manual index/centerTrack patch) so the
    // is-selected / is-near classes always live on the avatars that are
    // actually being scrolled to — otherwise the focused avatar loses its
    // "in focus" styling the moment the loop wraps.
    settleLoop() {
      if (!this.infinite) return;
      let corrected = null;

      if (this.physicalIndex >= this.count * 2) {
        corrected = this.physicalIndex - this.count;
      } else if (this.physicalIndex < this.count) {
        corrected = this.physicalIndex + this.count;
      }

      if (corrected === null) return;

      this.track.classList.add('pt-no-transition');
      this.setActive(corrected);
      // Force reflow so the transition-less transform is applied immediately.
      void this.track.offsetHeight;
      requestAnimationFrame(() => {
        this.track.classList.remove('pt-no-transition');
      });
    }

    centerTrack() {
      if (!this.track || !this.wrapper) return;
      const selected = this.avatars[this.physicalIndex];
      if (!selected) return;

      const wrapperWidth = this.wrapper.offsetWidth;
      const itemCenter = selected.offsetLeft + selected.offsetWidth / 2;
      const offset = wrapperWidth / 2 - itemCenter;

      this.track.style.transform = 'translateX(' + offset + 'px)';
    }

    startAutorotate() {
      this.stopAutorotate();
      const speed = parseInt(this.dataset.autorotateSpeed, 10) || 5000;
      this.autorotateTimer = setInterval(() => this.goTo(this.physicalIndex + 1), speed);
    }

    stopAutorotate() {
      if (this.autorotateTimer) {
        clearInterval(this.autorotateTimer);
        this.autorotateTimer = null;
      }
    }

    restartAutorotate() {
      if (this.dataset.autorotate === 'true' && this.infinite) {
        this.startAutorotate();
      }
    }
  }

  customElements.define('premium-testimonials', PremiumTestimonials);
})();
