(function () {
  'use strict';

  function initSlideshow(track) {
    if (!track) return;
    const sectionId  = track.dataset.sectionId;
    const slidesList = track.querySelector('#sc-slides-' + sectionId);
    if (!slidesList) return;

    const slides    = Array.from(slidesList.querySelectorAll('.sc-slide-item'));
    if (!slides.length) return;

    const transition = track.dataset.transition || 'slide';
    const autoplay   = track.dataset.autoplay === 'true';
    const speed      = parseInt(track.dataset.speed || '5', 10) * 1000;
    const pauseHover = track.dataset.pauseHover === 'true';

    const dots      = Array.from(track.querySelectorAll('.sc-dot'));
    const bars      = Array.from(track.querySelectorAll('.sc-bar'));
    const arrowPrev = track.querySelector('.sc-arrow-prev');
    const arrowNext = track.querySelector('.sc-arrow-next');

    let current = 0;
    let timer   = null;
    let paused  = false;

    if (bars.length) track.style.setProperty('--autoplay-duration', (speed / 1000) + 's');

    function goTo(idx) {
      const prev = current;
      current = ((idx % slides.length) + slides.length) % slides.length;

      slides.forEach((s, i) => s.classList.toggle('is-active', i === current));

      if (transition !== 'fade') {
        slidesList.style.transform = 'translateX(-' + (current * 100) + '%)';
      }

      dots.forEach((d, i) => d.classList.toggle('is-active', i === current));
      bars.forEach((b, i) => {
        b.classList.remove('is-active', 'is-complete');
        if (i < current) b.classList.add('is-complete');
        if (i === current) b.classList.add('is-active');
      });

      resetTimer();
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    function startTimer() {
      if (!autoplay || slides.length < 2) return;
      clearTimeout(timer);
      timer = setTimeout(() => { if (!paused) next(); }, speed);
    }
    function resetTimer() { clearTimeout(timer); if (!paused) startTimer(); }
    function stopTimer()  { clearTimeout(timer); }

    arrowPrev && arrowPrev.addEventListener('click', prev);
    arrowNext && arrowNext.addEventListener('click', next);
    dots.forEach(d => d.addEventListener('click', () => goTo(+d.dataset.index)));
    bars.forEach(b => b.addEventListener('click', () => goTo(+b.dataset.index)));

    if (pauseHover) {
      track.addEventListener('mouseenter',  () => { paused = true;  stopTimer();  });
      track.addEventListener('mouseleave',  () => { paused = false; startTimer(); });
      track.addEventListener('focusin',     () => { paused = true;  stopTimer();  });
      track.addEventListener('focusout',    () => { paused = false; startTimer(); });
    }

    let tx = 0;
    track.addEventListener('touchstart', e => { tx = e.changedTouches[0].screenX; }, { passive: true });
    track.addEventListener('touchend',   e => {
      const diff = tx - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    }, { passive: true });

    track.querySelectorAll('.sc-play-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const vid = btn.closest('.sc-slide-media, .sc-media-panel')?.querySelector('video');
        if (!vid) return;
        vid.paused ? (vid.play(), btn.style.display = 'none') : (vid.pause(), btn.style.display = '');
      });
    });

    track.querySelectorAll('.sc-sound-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const vid = btn.closest('.sc-slide-media, .sc-media-panel')?.querySelector('video');
        if (!vid) return;
        vid.muted = !vid.muted;
        btn.querySelector('.icon-muted').style.display = vid.muted ? '' : 'none';
        btn.querySelector('.icon-sound').style.display = vid.muted ? 'none' : '';
      });
    });

    track.querySelectorAll('.sc-yt-facade').forEach(facade => {
      facade.querySelector('.sc-play-btn')?.addEventListener('click', () => {
        const id     = facade.dataset.videoId;
        const iframe = document.createElement('iframe');
        iframe.src   = 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0';
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('allow', 'autoplay; encrypted-media');
        iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
        facade.innerHTML = '';
        facade.appendChild(iframe);
      });
    });

    goTo(0);

    track._slideshow = { next, prev, goTo,
      pause:  () => { paused = true;  stopTimer(); },
      resume: () => { paused = false; startTimer(); }
    };
  }

  function initAll() {
    document.querySelectorAll('[data-section-id]').forEach(el => {
      if (el.classList.contains('sc-slideshow-track-' + el.dataset.sectionId)) initSlideshow(el);
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', initAll)
    : initAll();

  document.addEventListener('shopify:section:load', e => {
    const el = e.target.querySelector('[data-section-id]');
    if (el) initSlideshow(el);
  });

})();
