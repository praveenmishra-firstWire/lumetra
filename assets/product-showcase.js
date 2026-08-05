/**
 * Product Showcase (Grid / Carousel)
 * Wrapped in initProductShowcase(section) and looped over every
 * [data-product-showcase] element, rather than a single
 * document.getElementById('ProductShowcase-{{ section.id }}') lookup, so
 * this works as a static file (and handles more than one instance on a
 * page correctly).
 *
 * Four values that were previously baked directly into the inline script
 * are now read from data attributes on the section element instead:
 * - section.settings.columns_mobile  -> data-columns-mobile
 * - section.settings.columns_tablet  -> data-columns-tablet
 * - section.settings.columns_desktop -> data-columns-desktop
 * - section.settings.card_spacing    -> data-card-gap
 */
function initProductShowcase(section) {
  if (!section || section.dataset.pgsInitialized) return;
  section.dataset.pgsInitialized = 'true';

  var layout = section.getAttribute('data-layout');
  var trackWrap = section.querySelector('[data-pgs-track-wrap]');
  var track = section.querySelector('[data-pgs-track]');
  var cards = track ? Array.prototype.slice.call(track.children) : [];

  /* ------------------------------------------------------------------
     Carousel: page-based paging (translateX by whole container widths),
     so it works cleanly regardless of how many cards are visible per
     breakpoint. Touch swipe + optional autoplay + optional infinite loop.
     ------------------------------------------------------------------ */
  if (layout === 'carousel' && track && cards.length) {
    var prevBtn = section.querySelector('[data-pgs-prev]');
    var nextBtn = section.querySelector('[data-pgs-next]');
    var dotsWrap = section.querySelector('[data-pgs-dots]');
    var enableLoop = section.getAttribute('data-loop') === 'true';
    var autoplayEnabled = section.getAttribute('data-autoplay') === 'true';
    var autoplaySpeed = parseFloat(section.getAttribute('data-autoplay-speed')) || 4;

    var currentPage = 0;
    var totalPages = 1;
    var perView = 1;
    var autoplayTimer = null;
    var MOBILE_BREAKPOINT = 749;
    var mobilePerView = Math.max(1, parseInt(section.dataset.columnsMobile, 10) || 2);
    var cardGapPx = parseInt(section.dataset.cardGap, 10) || 0;
    var columnsTablet = parseInt(section.dataset.columnsTablet, 10) || 3;
    var columnsDesktop = parseInt(section.dataset.columnsDesktop, 10) || 5;

    function getPerView() {
      var w = window.innerWidth;
      if (w <= MOBILE_BREAKPOINT) return mobilePerView;
      if (w <= 989) return columnsTablet;
      return columnsDesktop;
    }

    /* On mobile, set each card's width in exact pixels computed from the
       real, measured container width instead of relying on a CSS calc()
       expression that multiplies a custom property by a length — that
       pattern is inconsistently supported across real mobile browser
       engines and is what caused cards to render wider than intended,
       leaving a sliver of the next card peeking in. Pixel math here is
       guaranteed correct on every device. Tablet/desktop keep using the
       original CSS (untouched) by having their inline styles cleared. */
    function applyMobileCardSizing() {
      if (window.innerWidth > MOBILE_BREAKPOINT) {
        cards.forEach(function (card) {
          card.style.flexBasis = '';
          card.style.width = '';
          card.style.maxWidth = '';
        });
        return;
      }

      // Native scroll-snap drives mobile paging now, not a CSS transform —
      // clear any transform left over from a previous (tablet/desktop)
      // width so it can't stack on top of the browser's own scrolling.
      track.style.transform = '';
      track.style.transition = '';

      var containerWidth = trackWrap.clientWidth;
      var cardWidth = (containerWidth - cardGapPx * (mobilePerView - 1)) / mobilePerView;
      cardWidth = Math.floor(cardWidth);

      cards.forEach(function (card) {
        card.style.flexBasis = cardWidth + 'px';
        card.style.width = cardWidth + 'px';
        card.style.maxWidth = cardWidth + 'px';
      });
    }

    function recalc() {
      applyMobileCardSizing();
      perView = Math.max(1, getPerView());
      totalPages = Math.max(1, Math.ceil(cards.length / perView));
      if (currentPage > totalPages - 1) currentPage = totalPages - 1;
      buildDots();
      goToPage(currentPage, false);
    }

    function buildDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      for (var i = 0; i < totalPages; i++) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'pgs__dot' + (i === currentPage ? ' is-active' : '');
        dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        (function (idx) {
          dot.addEventListener('click', function () {
            stopAutoplay();
            goToPage(idx);
            startAutoplay();
          });
        })(i);
        dotsWrap.appendChild(dot);
      }
    }

    function updateDots() {
      if (!dotsWrap) return;
      var dots = dotsWrap.querySelectorAll('.pgs__dot');
      dots.forEach(function (dot, idx) {
        dot.classList.toggle('is-active', idx === currentPage);
      });
    }

    function updateNavButtons() {
      if (!prevBtn || !nextBtn) return;
      if (enableLoop) {
        prevBtn.disabled = false;
        nextBtn.disabled = false;
      } else {
        prevBtn.disabled = currentPage === 0;
        nextBtn.disabled = currentPage >= totalPages - 1;
      }
    }

    function goToPage(page, animate) {
      if (enableLoop) {
        page = ((page % totalPages) + totalPages) % totalPages;
      } else {
        page = Math.max(0, Math.min(page, totalPages - 1));
      }
      currentPage = page;

      if (window.innerWidth <= MOBILE_BREAKPOINT) {
        // Native scroll-snap: the browser guarantees the resting scroll
        // position always lands exactly on a card boundary, so a card can
        // never be left partially visible — this doesn't depend on any
        // JS-computed pixel value being exactly right.
        var targetLeft = Math.round(currentPage * trackWrap.clientWidth);
        if (trackWrap.scrollTo) {
          trackWrap.scrollTo({ left: targetLeft, behavior: animate === false ? 'auto' : 'smooth' });
        } else {
          trackWrap.scrollLeft = targetLeft;
        }
      } else {
        track.style.transition = animate === false ? 'none' : '';
        track.style.transform = 'translateX(-' + (currentPage * 100) + '%)';
      }

      updateNavButtons();
      updateDots();
    }

    function nextPage() {
      goToPage(currentPage + 1);
    }

    function prevPage() {
      goToPage(currentPage - 1);
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { stopAutoplay(); prevPage(); startAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { stopAutoplay(); nextPage(); startAutoplay(); });

    /* Touch swipe (tablet/desktop only — mobile uses native scroll-snap
       swiping via the browser, so this custom handler steps aside there
       to avoid fighting the native scroll with a duplicate page change). */
    var touchStartX = 0;
    var touchDeltaX = 0;
    trackWrap.addEventListener('touchstart', function (e) {
      if (window.innerWidth <= MOBILE_BREAKPOINT) return;
      touchStartX = e.touches[0].clientX;
      touchDeltaX = 0;
      stopAutoplay();
    }, { passive: true });

    trackWrap.addEventListener('touchmove', function (e) {
      if (window.innerWidth <= MOBILE_BREAKPOINT) return;
      touchDeltaX = e.touches[0].clientX - touchStartX;
    }, { passive: true });

    trackWrap.addEventListener('touchend', function () {
      if (window.innerWidth <= MOBILE_BREAKPOINT) return;
      if (Math.abs(touchDeltaX) > 40) {
        if (touchDeltaX < 0) nextPage(); else prevPage();
      }
      startAutoplay();
    });

    /* Keep dots/nav buttons in sync when the user manually swipes on
       mobile (native scroll), since that moves the track without going
       through goToPage(). */
    var scrollSyncTimeout;
    trackWrap.addEventListener('scroll', function () {
      if (window.innerWidth > MOBILE_BREAKPOINT) return;
      clearTimeout(scrollSyncTimeout);
      scrollSyncTimeout = setTimeout(function () {
        var width = trackWrap.clientWidth;
        if (!width) return;
        var newPage = Math.round(trackWrap.scrollLeft / width);
        newPage = Math.max(0, Math.min(newPage, totalPages - 1));
        if (newPage !== currentPage) {
          currentPage = newPage;
          updateNavButtons();
          updateDots();
        }
      }, 120);
    }, { passive: true });

    /* Autoplay */
    function startAutoplay() {
      if (!autoplayEnabled) return;
      stopAutoplay();
      autoplayTimer = setInterval(function () {
        if (!enableLoop && currentPage >= totalPages - 1) {
          goToPage(0);
        } else {
          nextPage();
        }
      }, autoplaySpeed * 1000);
    }

    function stopAutoplay() {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }

    trackWrap.addEventListener('mouseenter', stopAutoplay);
    trackWrap.addEventListener('mouseleave', startAutoplay);

    var resizeTimeout;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(recalc, 150);
    });

    recalc();
    startAutoplay();
  }

  /* ------------------------------------------------------------------
     Color swatches: clicking a swatch updates the active state, the
     displayed price/compare price, the card's quick-add variant id, and
     (when the variant has its own image) the primary product image.
     ------------------------------------------------------------------ */
  section.querySelectorAll('[data-pgs-card]').forEach(function (card) {
    var swatches = card.querySelectorAll('[data-pgs-swatch]');
    if (!swatches.length) return;

    var colorNameEl = card.querySelector('[data-pgs-color-name]');
    var priceEl = card.querySelector('[data-pgs-price]');
    var compareEl = card.querySelector('[data-pgs-compare]');
    var variantInput = card.querySelector('[data-pgs-variant-input]');
    var primaryImage = card.querySelector('[data-pgs-primary-image]');
    var quickAddBtn = card.querySelector('.pgs__quick-add-btn');

    swatches.forEach(function (swatch) {
      swatch.addEventListener('click', function () {
        swatches.forEach(function (s) {
          s.classList.remove('is-active');
          s.setAttribute('aria-pressed', 'false');
        });
        swatch.classList.add('is-active');
        swatch.setAttribute('aria-pressed', 'true');

        var colorName = swatch.getAttribute('data-color-name');
        var variantId = swatch.getAttribute('data-variant-id');
        var price = swatch.getAttribute('data-price');
        var compare = swatch.getAttribute('data-compare');
        var image = swatch.getAttribute('data-image');
        var available = swatch.getAttribute('data-available') === 'true';

        if (colorNameEl) colorNameEl.textContent = colorName;
        if (priceEl && price) priceEl.textContent = price;
        if (compareEl) {
          if (compare) {
            compareEl.textContent = compare;
            compareEl.hidden = false;
          } else {
            compareEl.textContent = '';
            compareEl.hidden = true;
          }
        }
        if (variantInput && variantId) variantInput.value = variantId;
        if (image && primaryImage && primaryImage.tagName === 'IMG') {
          // srcset (if present) always wins over src in the browser's image
          // selection — so it must be cleared, or the swapped src is silently
          // ignored and the original image keeps showing.
          primaryImage.removeAttribute('srcset');
          primaryImage.removeAttribute('sizes');
          primaryImage.src = image;
        }
        if (quickAddBtn) quickAddBtn.disabled = !available;
      });
    });
  });

  /* ------------------------------------------------------------------
     Wishlist (localStorage based; shared key so it persists alongside
     other storefront sections using the same wishlist convention)
     ------------------------------------------------------------------ */
  var WISHLIST_KEY = 'cps_wishlist_ids';

  function getWishlist() {
    try {
      return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function setWishlist(ids) {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
    } catch (e) { /* storage unavailable */ }
  }

  function updateWishlistUI() {
    var ids = getWishlist();
    section.querySelectorAll('[data-wishlist-toggle]').forEach(function (btn) {
      var pid = btn.getAttribute('data-product-id');
      btn.classList.toggle('is-active', ids.indexOf(pid) !== -1);
    });
  }

  section.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-wishlist-toggle]');
    if (!btn) return;
    e.preventDefault();
    var pid = btn.getAttribute('data-product-id');
    var ids = getWishlist();
    var idx = ids.indexOf(pid);
    if (idx === -1) { ids.push(pid); } else { ids.splice(idx, 1); }
    setWishlist(ids);
    updateWishlistUI();
  });

  updateWishlistUI();

  /* ------------------------------------------------------------------
     Quick Add to Cart
     ------------------------------------------------------------------ */
  section.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-quick-add-form]');
    if (!form) return;
    e.preventDefault();

    var submitBtn = form.querySelector('button[type="submit"]');
    submitBtn && submitBtn.setAttribute('disabled', 'disabled');

    var formData = new FormData(form);
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData
    })
      .then(function (res) { return res.json(); })
      .then(function () {
        document.dispatchEvent(new CustomEvent('cart:updated'));
      })
      .catch(function (err) {
        console.error('Quick add failed', err);
      })
      .finally(function () {
        setTimeout(function () {
          submitBtn && submitBtn.removeAttribute('disabled');
        }, 800);
      });
  });

  /* ------------------------------------------------------------------
     Quick View modal
     ------------------------------------------------------------------ */
  var overlay = section.querySelector('[data-pgs-modal-overlay]');
  if (overlay) {
    var modalImage = overlay.querySelector('[data-pgs-modal-image]');
    var modalVendor = overlay.querySelector('[data-pgs-modal-vendor]');
    var modalTitle = overlay.querySelector('[data-pgs-modal-title]');
    var modalPrice = overlay.querySelector('[data-pgs-modal-price]');
    var modalCompare = overlay.querySelector('[data-pgs-modal-compare]');
    var modalDescription = overlay.querySelector('[data-pgs-modal-description]');
    var modalVariantInput = overlay.querySelector('[data-pgs-modal-variant-input]');
    var modalAddBtn = overlay.querySelector('[data-pgs-modal-add-btn]');
    var modalLink = overlay.querySelector('[data-pgs-modal-link]');
    var closeBtn = overlay.querySelector('[data-pgs-modal-close]');

    function openModal(btn) {
      modalImage.src = btn.getAttribute('data-qv-image') || '';
      modalVendor.textContent = btn.getAttribute('data-qv-vendor') || '';
      modalTitle.textContent = btn.getAttribute('data-qv-title') || '';
      modalPrice.textContent = btn.getAttribute('data-qv-price') || '';
      var compare = btn.getAttribute('data-qv-compare');
      if (compare) {
        modalCompare.textContent = compare;
        modalCompare.hidden = false;
      } else {
        modalCompare.hidden = true;
      }
      modalDescription.textContent = btn.getAttribute('data-qv-description') || '';
      modalVariantInput.value = btn.getAttribute('data-qv-variant-id') || '';
      modalLink.href = btn.getAttribute('data-qv-url') || '#';
      var available = btn.getAttribute('data-qv-available') === 'true';
      modalAddBtn.disabled = !available;
      modalAddBtn.textContent = available ? 'Add to Cart' : 'Sold Out';

      overlay.hidden = false;
      requestAnimationFrame(function () {
        overlay.classList.add('is-open');
      });
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () {
        overlay.hidden = true;
      }, 250);
    }

    section.querySelectorAll('[data-pgs-quickview]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openModal(btn);
      });
    });

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !overlay.hidden) closeModal();
    });

    var modalForm = overlay.querySelector('[data-pgs-modal-add-form]');
    modalForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var formData = new FormData(modalForm);
      modalAddBtn.disabled = true;
      var originalText = modalAddBtn.textContent;
      modalAddBtn.textContent = 'Adding...';
      fetch('/cart/add.js', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData
      })
        .then(function (res) { return res.json(); })
        .then(function () {
          modalAddBtn.textContent = 'Added!';
          document.dispatchEvent(new CustomEvent('cart:updated'));
        })
        .catch(function () {
          modalAddBtn.textContent = 'Error';
        })
        .finally(function () {
          setTimeout(function () {
            modalAddBtn.disabled = false;
            modalAddBtn.textContent = originalText;
          }, 1200);
        });
    });
  }
}

document.querySelectorAll('[data-product-showcase]').forEach(initProductShowcase);

document.addEventListener('shopify:section:load', function (event) {
  var section = event.target.querySelector('[data-product-showcase]');
  if (section) initProductShowcase(section);
});
