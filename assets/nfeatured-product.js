/**
 * Featured product section
 * - <product-form> resolves the selected variant from option buttons/selects,
 *   updates price/availability/image, and adds to cart via the Cart AJAX API.
 * - Plain functions handle the media gallery (thumbnails, dots, zoom) and the
 *   mobile sticky add-to-cart bar, since they don't need encapsulated state.
 */

class ProductForm extends HTMLElement {
  connectedCallback() {
    this.sectionId = this.dataset.sectionId;
    this.form = this.querySelector('form');
    this.variantIdInput = this.querySelector('[data-variant-id-input]');
    this.addToCartButton = this.querySelector('[data-add-to-cart-button]');
    this.addToCartLabel = this.querySelector('[data-add-to-cart-label]');
    this.buyNowButton = this.querySelector('[data-buy-now-button]');
    this.availabilityMessage = this.querySelector('[data-availability-message]');
    this.errorMessage = this.querySelector('[data-form-error]');
    this.quantityInput = this.querySelector('[data-quantity-input]');

    const jsonScript = this.querySelector('[data-product-json]');
    this.variants = jsonScript ? JSON.parse(jsonScript.textContent) : [];

    this.optionGroups = Array.from(this.querySelectorAll('[data-option-index]'));
    this.selectedOptions = this._readSelectedOptions();

    this._bindOptionInputs();
    this._bindQuantityStepper();
    this._bindSubmit();

    this.defaultAddToCartLabel = this.addToCartLabel ? this.addToCartLabel.textContent.trim() : '';
  }

  _readSelectedOptions() {
    const options = [];
    this.optionGroups.forEach((group) => {
      const index = parseInt(group.dataset.optionIndex, 10);
      const select = group.querySelector('select[data-option-index]');
      if (select) {
        options[index] = select.value;
        return;
      }
      const selectedButton = group.querySelector('.fp-variant-btn.is-selected');
      if (selectedButton) options[index] = selectedButton.dataset.value;
    });
    return options;
  }

  _bindOptionInputs() {
    this.querySelectorAll('select[data-option-index]').forEach((select) => {
      select.addEventListener('change', () => {
        this.selectedOptions[parseInt(select.dataset.optionIndex, 10)] = select.value;
        this._onOptionChange();
      });
    });

    this.querySelectorAll('.fp-variant-btn').forEach((button) => {
      button.addEventListener('click', () => {
        if (button.disabled) return;
        const group = button.closest('[data-option-index]');
        group.querySelectorAll('.fp-variant-btn').forEach((b) => {
          b.classList.remove('is-selected');
          b.setAttribute('aria-checked', 'false');
        });
        button.classList.add('is-selected');
        button.setAttribute('aria-checked', 'true');
        this.selectedOptions[parseInt(button.dataset.optionIndex, 10)] = button.dataset.value;
        this._onOptionChange();
      });
    });
  }

  _findMatchingVariant() {
    return this.variants.find((variant) =>
      variant.options.every((value, index) => value === this.selectedOptions[index])
    );
  }

  _onOptionChange() {
    const variant = this._findMatchingVariant();
    this._updateForVariant(variant);
  }

  _updateForVariant(variant) {
    if (!variant) {
      this._setAvailability(false, 'Unavailable');
      return;
    }

    if (this.variantIdInput) this.variantIdInput.value = variant.id;

    this._updatePrice(variant);
    this._updateMedia(variant);
    this._updateQuantityLimit(variant);
    this._setAvailability(variant.available, variant.available ? '' : 'Sold out');
  }

  _updatePrice(variant) {
    const priceWrap = document.getElementById(`Price-${this.sectionId}`);
    if (!priceWrap) return;

    const currentEl = priceWrap.querySelector('[data-price]');
    const compareEl = priceWrap.querySelector('[data-compare-price]');
    const savingsEl = priceWrap.querySelector('[data-savings-badge]');

    if (currentEl) currentEl.textContent = formatMoney(variant.price);

    const hasCompare = variant.compare_at_price && variant.compare_at_price > variant.price;
    if (compareEl) {
      if (hasCompare) {
        compareEl.textContent = formatMoney(variant.compare_at_price);
        compareEl.hidden = false;
      } else {
        compareEl.hidden = true;
      }
    }
    if (savingsEl) {
      if (hasCompare) {
        savingsEl.textContent = `You save ${formatMoney(variant.compare_at_price - variant.price)}`;
        savingsEl.hidden = false;
      } else {
        savingsEl.hidden = true;
      }
    }

    const stickyPrice = document.querySelector(`#FeaturedProduct-${this.sectionId} .fp-sticky-bar__price`);
    if (stickyPrice) stickyPrice.textContent = formatMoney(variant.price);
  }

  _updateMedia(variant) {
    if (!variant.featured_media) return;
    const section = document.getElementById(`FeaturedProduct-${this.sectionId}`);
    if (!section) return;
    const mediaId = String(variant.featured_media.id);
    const slide = section.querySelector(`.fp-main-image__slide[data-media-id="${mediaId}"]`);
    if (slide) setActiveSlide(section, slide.dataset.index);
  }

  _updateQuantityLimit(variant) {
    if (!this.quantityInput) return;
    if (variant.inventory_management === 'shopify' && variant.inventory_policy === 'deny') {
      this.quantityInput.max = Math.max(variant.inventory_quantity, 0);
      if (Number(this.quantityInput.value) > Number(this.quantityInput.max)) {
        this.quantityInput.value = Math.max(Number(this.quantityInput.max), 1);
      }
    } else {
      this.quantityInput.removeAttribute('max');
    }
  }

  _setAvailability(available, message) {
    [this.addToCartButton, this.buyNowButton].forEach((button) => {
      if (!button) return;
      button.disabled = !available;
    });
    if (this.addToCartLabel) {
      this.addToCartLabel.textContent = available ? this.defaultAddToCartLabel : 'Sold out';
    }
    if (this.availabilityMessage) this.availabilityMessage.textContent = message || '';
  }

  _bindQuantityStepper() {
    const decrease = this.querySelector('[data-quantity-decrease]');
    const increase = this.querySelector('[data-quantity-increase]');
    if (!this.quantityInput) return;

    decrease?.addEventListener('click', () => {
      const min = Number(this.quantityInput.min) || 1;
      this.quantityInput.value = Math.max(min, Number(this.quantityInput.value) - 1);
    });
    increase?.addEventListener('click', () => {
      const max = this.quantityInput.max ? Number(this.quantityInput.max) : Infinity;
      this.quantityInput.value = Math.min(max, Number(this.quantityInput.value) + 1);
    });
  }

  _bindSubmit() {
    if (!this.form) return;
    this.form.addEventListener('submit', (event) => {
      const submitter = event.submitter;
      // Let "Buy it now" (name="checkout") submit normally so Shopify redirects to checkout.
      if (submitter && submitter.name === 'checkout') return;
      event.preventDefault();
      this._addToCart();
    });
  }

  async _addToCart() {
    if (!this.addToCartButton) return;
    this._hideError();
    this.addToCartButton.disabled = true;
    const originalLabel = this.addToCartLabel ? this.addToCartLabel.textContent : '';
    if (this.addToCartLabel) this.addToCartLabel.textContent = 'Adding…';

    try {
      const formData = new FormData(this.form);
      const response = await fetch(`${window.Shopify?.routes?.root || '/'}cart/add.js`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.description || 'Unable to add this item to your cart.');
      }

      if (this.addToCartLabel) this.addToCartLabel.textContent = 'Added';
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { item: data } }));
      this._bumpCartCount();

      setTimeout(() => {
        if (this.addToCartLabel) this.addToCartLabel.textContent = originalLabel;
      }, 1800);
    } catch (error) {
      this._showError(error.message);
      if (this.addToCartLabel) this.addToCartLabel.textContent = originalLabel;
    } finally {
      this.addToCartButton.disabled = false;
    }
  }

  _bumpCartCount() {
    const bubble = document.getElementById('cart-icon-bubble');
    if (bubble) bubble.dataset.needsUpdate = 'true';
  }

  _showError(message) {
    if (!this.errorMessage) return;
    this.errorMessage.textContent = message;
    this.errorMessage.hidden = false;
  }

  _hideError() {
    if (!this.errorMessage) return;
    this.errorMessage.hidden = true;
  }
}

function formatMoney(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function setActiveSlide(section, index) {
  section.querySelectorAll('.fp-main-image__slide').forEach((slide) => {
    const active = slide.dataset.index === String(index);
    slide.classList.toggle('is-active', active);
    slide.hidden = !active;
  });
  section.querySelectorAll('.fp-thumb').forEach((thumb) => {
    const active = thumb.dataset.index === String(index);
    thumb.classList.toggle('is-active', active);
    thumb.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  section.querySelectorAll('.fp-dot').forEach((dot) => {
    dot.classList.toggle('is-active', dot.dataset.index === String(index));
  });
}

function initGallery(section) {
  section.querySelectorAll('.fp-thumb, .fp-dot').forEach((control) => {
    control.addEventListener('click', () => setActiveSlide(section, control.dataset.index));
  });

  const zoomToggle = section.querySelector('[data-zoom-toggle]');
  const zoomModal = section.querySelector('[data-zoom-modal]');
  const zoomModalImg = section.querySelector('[data-zoom-modal-img]');
  const zoomClose = section.querySelector('[data-zoom-close]');

  if (zoomToggle && zoomModal && zoomModalImg) {
    zoomToggle.addEventListener('click', () => {
      const activeSlideImg = section.querySelector('.fp-main-image__slide.is-active img');
      if (activeSlideImg) zoomModalImg.src = activeSlideImg.src;
      zoomModal.hidden = false;
    });
    zoomClose?.addEventListener('click', () => {
      zoomModal.hidden = true;
    });
    zoomModal.addEventListener('click', (event) => {
      if (event.target === zoomModal) zoomModal.hidden = true;
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !zoomModal.hidden) zoomModal.hidden = true;
    });
  }

  const wishlistButton = section.querySelector('[data-wishlist-toggle]');
  wishlistButton?.addEventListener('click', () => {
    const pressed = wishlistButton.getAttribute('aria-pressed') === 'true';
    wishlistButton.setAttribute('aria-pressed', String(!pressed));
  });
}

function initStickyBar(section) {
  const stickyBar = section.querySelector('[data-sticky-bar]');
  const buttonsRow = section.querySelector('.fp-buttons');
  if (!stickyBar || !buttonsRow || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        stickyBar.classList.toggle('is-visible', !entry.isIntersecting);
      });
    },
    { rootMargin: '0px 0px -10% 0px' }
  );
  observer.observe(buttonsRow);
  stickyBar.hidden = false;

  const stickyAddButton = stickyBar.querySelector('[data-sticky-add-to-cart]');
  const realAddButton = section.querySelector('[data-add-to-cart-button]');
  stickyAddButton?.addEventListener('click', () => realAddButton?.click());
}

document.querySelectorAll('.featured-product').forEach((section) => {
  initGallery(section);
  initStickyBar(section);
});

if (!customElements.get('product-form')) {
  customElements.define('product-form', ProductForm);
}
