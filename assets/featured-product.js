/**
 * Main Product Detail section
 * Wrapped in initMainProduct(section) and looped over every
 * [data-main-product] element, rather than a single
 * document.getElementById('MainProduct-{{ section.id }}') lookup, so this
 * works correctly as a static file (and safely handles more than one
 * instance on a page, e.g. if it's also used on a non-product template).
 *
 * Two values that were previously baked directly into the inline script
 * are now read from data attributes on the section element instead:
 * - shop.money_format  -> data-money-format
 * - section.settings.low_stock_threshold -> data-low-stock-threshold
 */
function initMainProduct(section) {
  if (!section || section.dataset.mpdInitialized) return;
  section.dataset.mpdInitialized = 'true';

  /* ------------------------------------------------------------------
     Variant data + selection logic. All variants for this product are
     embedded as JSON once at render time, so switching options never
     needs a network request — price, compare price, badge, image, and
     availability all update instantly from this local lookup.
     ------------------------------------------------------------------ */
  var variantsScript = section.querySelector('[data-mpd-variants]');
  var variants = [];
  try {
    variants = variantsScript ? JSON.parse(variantsScript.textContent) : [];
  } catch (e) {
    variants = [];
  }

  // The main variants blob above (product.variants | json) does not
  // reliably include inventory_quantity / inventory_management — Shopify
  // strips those from that particular serialization. This second blob is
  // built explicitly from direct Liquid field access instead, keyed by
  // variant id, so stock status can actually be looked up correctly when
  // the selected variant changes.
  var inventoryScript = section.querySelector('[data-mpd-inventory-data]');
  var inventoryData = {};
  try {
    inventoryData = inventoryScript ? JSON.parse(inventoryScript.textContent) : {};
  } catch (e) {
    inventoryData = {};
  }

  var form = section.querySelector('[data-main-product] .mpd__form, form.mpd__form');
  var variantInput = section.querySelector('[data-mpd-variant-input]');
  var priceEl = section.querySelector('[data-mpd-price]');
  var compareEl = section.querySelector('[data-mpd-compare]');
  var priceSaleBadge = section.querySelector('[data-mpd-price-sale-badge]');
  var topSaleBadge = section.querySelector('[data-mpd-sale-badge]');
  var addToCartBtn = section.querySelector('[data-mpd-add-to-cart]');
  var addToCartText = section.querySelector('[data-mpd-add-to-cart-text]');
  var buyNowBtn = section.querySelector('[data-mpd-buy-now]');
  var inventoryText = section.querySelector('[data-mpd-inventory-text]');
  var stockBarFill = section.querySelector('[data-mpd-stock-bar-fill]');
  var optionEls = Array.prototype.slice.call(section.querySelectorAll('[data-mpd-option]'));

  var shopMoneyFormat = section.dataset.moneyFormat || '${{amount}}';
  var lowStockThreshold = parseInt(section.dataset.lowStockThreshold, 10) || 5;

  function formatMoney(cents, format) {
    var formatString = format || shopMoneyFormat;
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var match = formatString.match(placeholderRegex);
    if (!match) return formatString;

    function withDelimiters(number, precision, thousands, decimal) {
      precision = (typeof precision === 'undefined') ? 2 : precision;
      thousands = (typeof thousands === 'undefined') ? ',' : thousands;
      decimal = (typeof decimal === 'undefined') ? '.' : decimal;
      if (isNaN(number) || number == null) return '0';
      number = (number / 100.0).toFixed(precision);
      var parts = number.split('.');
      var dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      var centsPart = parts[1] ? decimal + parts[1] : '';
      return dollars + centsPart;
    }

    var value = '';
    switch (match[1]) {
      case 'amount':
        value = withDelimiters(cents, 2); break;
      case 'amount_no_decimals':
        value = withDelimiters(cents, 0); break;
      case 'amount_with_comma_separator':
        value = withDelimiters(cents, 2, '.', ','); break;
      case 'amount_no_decimals_with_comma_separator':
        value = withDelimiters(cents, 0, '.', ','); break;
      case 'amount_with_space_separator':
        value = withDelimiters(cents, 2, ' ', ','); break;
      case 'amount_no_decimals_with_space_separator':
        value = withDelimiters(cents, 0, ' ', ','); break;
      default:
        value = withDelimiters(cents, 2);
    }

    return formatString.replace(placeholderRegex, value);
  }

  function getSelectedOptions() {
    return optionEls.map(function (optionEl) {
      var activeBtn = optionEl.querySelector('[data-mpd-option-btn].is-active');
      return activeBtn ? activeBtn.getAttribute('data-value') : null;
    });
  }

  function findVariant(selected) {
    return variants.filter(function (v) {
      return v.options.every(function (opt, idx) { return opt === selected[idx]; });
    })[0];
  }

  function isValueAvailable(optionIndex, value, currentSelections) {
    var candidate = currentSelections.slice();
    candidate[optionIndex] = value;
    return variants.some(function (v) {
      return v.options.every(function (opt, idx) { return opt === candidate[idx]; }) && v.available;
    });
  }

  function updateAvailabilityUI() {
    var selected = getSelectedOptions();
    optionEls.forEach(function (optionEl) {
      var idx = parseInt(optionEl.getAttribute('data-option-index'), 10);
      optionEl.querySelectorAll('[data-mpd-option-btn]').forEach(function (btn) {
        var value = btn.getAttribute('data-value');
        var available = isValueAvailable(idx, value, selected);
        btn.classList.toggle('is-unavailable', !available);
      });
    });
  }

  function updateForVariant(variant) {
    if (!variant) return;

    if (variantInput) variantInput.value = variant.id;

    if (priceEl) priceEl.textContent = formatMoney(variant.price);
    if (compareEl) {
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        compareEl.textContent = formatMoney(variant.compare_at_price);
        compareEl.hidden = false;
      } else {
        compareEl.hidden = true;
      }
    }

    var onSale = variant.compare_at_price && variant.compare_at_price > variant.price;
    if (priceSaleBadge) priceSaleBadge.hidden = !onSale;
    if (topSaleBadge) topSaleBadge.hidden = !onSale;

    if (addToCartBtn) {
      addToCartBtn.disabled = !variant.available;
      if (addToCartText) addToCartText.textContent = variant.available ? 'Add To Cart' : 'Sold Out';
    }
    if (buyNowBtn) buyNowBtn.disabled = !variant.available;

    if (inventoryText) {
      var invInfo = inventoryData[String(variant.id)];
      if (invInfo && invInfo.management === 'shopify') {
        var qty = invInfo.quantity || 0;
        if (qty > 0) {
          inventoryText.textContent = 'In stock (' + qty + ' unit' + (qty !== 1 ? 's' : '') + '), ready to be shipped';
        } else {
          inventoryText.textContent = 'Currently out of stock';
        }
        if (stockBarFill) {
          stockBarFill.className = 'mpd__stock-bar-fill ' + (
            qty <= 0 ? 'mpd__stock-bar--out' : (qty <= lowStockThreshold ? 'mpd__stock-bar--low' : 'mpd__stock-bar--in')
          );
        }
      } else {
        inventoryText.textContent = variant.available ? 'In stock' : 'Currently out of stock';
        if (stockBarFill) {
          stockBarFill.className = 'mpd__stock-bar-fill ' + (variant.available ? 'mpd__stock-bar--in' : 'mpd__stock-bar--out');
        }
      }
    }

    if (variant.featured_media && variant.featured_media.id) {
      showMediaById(variant.featured_media.id);
    }
  }

  optionEls.forEach(function (optionEl) {
    optionEl.querySelectorAll('[data-mpd-option-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.classList.contains('is-unavailable')) return;

        optionEl.querySelectorAll('[data-mpd-option-btn]').forEach(function (b) {
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');

        var valueLabel = optionEl.querySelector('[data-mpd-option-value]');
        if (valueLabel) valueLabel.textContent = btn.getAttribute('data-value');

        updateAvailabilityUI();
        var selected = getSelectedOptions();
        var variant = findVariant(selected);
        if (variant) updateForVariant(variant);
      });
    });
  });

  updateAvailabilityUI();

  /* ------------------------------------------------------------------
     Media gallery: thumbnail click + arrow scroll.
     ------------------------------------------------------------------ */
  function showMediaById(mediaId) {
    section.querySelectorAll('[data-mpd-main-image]').forEach(function (img) {
      img.classList.toggle('is-active', img.getAttribute('data-media-id') === String(mediaId));
    });
    section.querySelectorAll('[data-mpd-thumb]').forEach(function (thumb) {
      thumb.classList.toggle('is-active', thumb.getAttribute('data-media-id') === String(mediaId));
    });
  }

  section.querySelectorAll('[data-mpd-thumb]').forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      showMediaById(thumb.getAttribute('data-media-id'));
    });
  });

  var thumbsTrack = section.querySelector('[data-mpd-thumbs]');
  var thumbPrev = section.querySelector('[data-mpd-thumb-prev]');
  var thumbNext = section.querySelector('[data-mpd-thumb-next]');
  if (thumbsTrack && thumbPrev && thumbNext) {
    thumbPrev.addEventListener('click', function () {
      thumbsTrack.scrollBy({ left: -160, behavior: 'smooth' });
    });
    thumbNext.addEventListener('click', function () {
      thumbsTrack.scrollBy({ left: 160, behavior: 'smooth' });
    });
  }

  /* ------------------------------------------------------------------
     Share button — copies the current product URL to the clipboard.
     ------------------------------------------------------------------ */
  var shareBtn = section.querySelector('[data-mpd-share]');
  if (shareBtn) {
    shareBtn.addEventListener('click', function () {
      var tooltip = shareBtn.querySelector('[data-mpd-share-tooltip]');
      var url = window.location.href;
      var showTooltip = function () {
        if (!tooltip) return;
        tooltip.classList.add('is-visible');
        setTimeout(function () { tooltip.classList.remove('is-visible'); }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(showTooltip).catch(function () {});
      } else if (navigator.share) {
        navigator.share({ url: url, title: document.title }).catch(function () {});
      }
    });
  }

  /* ------------------------------------------------------------------
     Quantity stepper.
     ------------------------------------------------------------------ */
  var qtyInput = section.querySelector('[data-mpd-qty-input]');
  var qtyMinus = section.querySelector('[data-mpd-qty-minus]');
  var qtyPlus = section.querySelector('[data-mpd-qty-plus]');
  if (qtyInput && qtyMinus && qtyPlus) {
    qtyMinus.addEventListener('click', function () {
      var val = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1);
      qtyInput.value = val;
    });
    qtyPlus.addEventListener('click', function () {
      var val = (parseInt(qtyInput.value, 10) || 1) + 1;
      qtyInput.value = val;
    });
    qtyInput.addEventListener('change', function () {
      var val = parseInt(qtyInput.value, 10);
      if (!val || val < 1) qtyInput.value = 1;
    });
  }

  /* ------------------------------------------------------------------
     Add to Cart (AJAX) vs Buy It Now (native checkout redirect).
     The submit button clicked determines the path: "add" is intercepted
     and sent via fetch so it matches this site's AJAX cart pattern (and
     is automatically picked up by the header's cart-count listener);
     "checkout" is left to submit natively so Shopify's own direct-to-
     checkout redirect handles it — this still works even if JS fails.
     ------------------------------------------------------------------ */
  if (form) {
    form.addEventListener('submit', function (e) {
      var submitter = e.submitter;
      if (submitter && submitter.getAttribute('name') === 'checkout') {
        return; // let the native Buy It Now submission proceed
      }

      e.preventDefault();
      if (!addToCartBtn || addToCartBtn.disabled) return;

      var originalText = addToCartText ? addToCartText.textContent : '';
      if (addToCartText) addToCartText.textContent = 'Adding...';
      addToCartBtn.disabled = true;

      var formData = new FormData(form);

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.status) {
            // Shopify returns an error payload (with a `status` code) on
            // failure (e.g. quantity exceeds available stock) rather than
            // rejecting the fetch promise.
            throw new Error(data.description || 'Could not add to cart');
          }
          if (addToCartText) addToCartText.textContent = 'Added!';
          document.dispatchEvent(new CustomEvent('cart:updated'));
        })
        .catch(function (err) {
          console.error('Add to cart failed', err);
          if (addToCartText) addToCartText.textContent = 'Error';
        })
        .finally(function () {
          setTimeout(function () {
            var currentVariant = findVariant(getSelectedOptions());
            addToCartBtn.disabled = currentVariant ? !currentVariant.available : false;
            if (addToCartText) addToCartText.textContent = originalText;
          }, 1400);
        });
    });
  }
}

document.querySelectorAll('[data-main-product]').forEach(initMainProduct);

document.addEventListener('shopify:section:load', function (event) {
  var section = event.target.querySelector('[data-main-product]');
  if (section) initMainProduct(section);
});
