/**
 * Product grid section
 * - Add to cart: AJAX via /cart/add.js, one form-less flow per card.
 * - Quick view: fetches {product.url}.js on demand and populates a single
 *   shared modal, rather than pre-rendering a modal per card.
 * - Wishlist: persisted in localStorage only (no account sync — see the
 *   "Show wishlist icon" setting's info text, which says so explicitly).
 * - Swatches: swap the card's primary image to the matching variant's image.
 */

const WISHLIST_KEY = 'product-grid:wishlist';

function getWishlist() {
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');
  } catch (error) {
    return [];
  }
}

function setWishlist(ids) {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  } catch (error) {
    /* localStorage unavailable (private mode, etc.) — fail silently */
  }
}

function initWishlistButtons(root) {
  const wishlist = getWishlist();
  root.querySelectorAll('[data-wishlist-toggle]').forEach((button) => {
    const id = button.dataset.productId;
    const saved = wishlist.includes(id);
    button.setAttribute('aria-pressed', String(saved));

    button.addEventListener('click', () => {
      const current = getWishlist();
      const index = current.indexOf(id);
      const nowSaved = index === -1;
      if (nowSaved) {
        current.push(id);
      } else {
        current.splice(index, 1);
      }
      setWishlist(current);
      button.setAttribute('aria-pressed', String(nowSaved));
    });
  });
}

function initSwatches(root) {
  root.querySelectorAll('.product-grid__card').forEach((card) => {
    const swatches = card.querySelectorAll('[data-swatch]');
    const primaryImage = card.querySelector('.product-grid__image--primary');
    if (!swatches.length || !primaryImage) return;

    swatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        swatches.forEach((s) => s.classList.remove('is-active'));
        swatch.classList.add('is-active');
        const newSrc = swatch.dataset.image;
        if (newSrc) primaryImage.src = newSrc;
      });
    });
  });
}

function initQuantitySteppers(root) {
  root.querySelectorAll('.product-grid__quantity').forEach((stepper) => {
    const input = stepper.querySelector('[data-quantity-input]');
    const decrease = stepper.querySelector('[data-quantity-decrease]');
    const increase = stepper.querySelector('[data-quantity-increase]');
    if (!input) return;

    decrease?.addEventListener('click', () => {
      const min = Number(input.min) || 1;
      input.value = Math.max(min, Number(input.value) - 1);
    });
    increase?.addEventListener('click', () => {
      input.value = Number(input.value) + 1;
    });
  });
}

function initAddToCart(root) {
  root.querySelectorAll('[data-add-to-cart-button]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (button.disabled) return;
      const variantId = button.dataset.variantId;
      const card = button.closest('.product-grid__card');
      const quantityInput = card?.querySelector('[data-quantity-input]');
      const quantity = quantityInput ? Number(quantityInput.value) || 1 : 1;
      const label = button.querySelector('[data-add-to-cart-label]');
      const originalLabel = label ? label.textContent : '';

      if (label) label.textContent = 'Adding…';
      button.disabled = true;

      try {
        const response = await fetch(`${window.Shopify?.routes?.root || '/'}cart/add.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ id: variantId, quantity }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.description || 'Unable to add this item to your cart.');

        if (label) label.textContent = 'Added';
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: { item: data } }));
        setTimeout(() => {
          if (label) label.textContent = originalLabel;
        }, 1600);
      } catch (error) {
        if (label) label.textContent = 'Error';
        setTimeout(() => {
          if (label) label.textContent = originalLabel;
        }, 1600);
      } finally {
        button.disabled = false;
      }
    });
  });
}

function initQuickView(root) {
  const modal = root.querySelector('[data-quick-view-modal]') || document.querySelector('[data-quick-view-modal]');
  if (!modal) return;

  const image = modal.querySelector('[data-quick-view-image]');
  const title = modal.querySelector('[data-quick-view-title]');
  const price = modal.querySelector('[data-quick-view-price]');
  const comparePrice = modal.querySelector('[data-quick-view-compare-price]');
  const description = modal.querySelector('[data-quick-view-description]');
  const link = modal.querySelector('[data-quick-view-link]');

  function formatMoney(cents) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function closeModal() {
    modal.hidden = true;
  }

  modal.querySelectorAll('[data-quick-view-close]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });

  root.querySelectorAll('[data-quick-view-toggle]').forEach((button) => {
    button.addEventListener('click', async () => {
      const url = button.dataset.productUrl;
      if (!url) return;
      try {
        const response = await fetch(`${url}.js`);
        const product = await response.json();
        const variant = product.variants[0];

        if (image && product.featured_image) {
          image.src = product.featured_image;
          image.alt = product.title;
        }
        if (title) title.textContent = product.title;
        if (price) price.textContent = formatMoney(variant.price);
        if (comparePrice) {
          if (variant.compare_at_price && variant.compare_at_price > variant.price) {
            comparePrice.textContent = formatMoney(variant.compare_at_price);
            comparePrice.hidden = false;
          } else {
            comparePrice.hidden = true;
          }
        }
        if (description) description.innerHTML = product.description;
        if (link) link.href = url;

        modal.hidden = false;
      } catch (error) {
        window.location.href = url;
      }
    });
  });
}

function initScrollReveal(root) {
  const grid = root.querySelector('.product-grid[data-animate="fade"]');
  if (!grid || !('IntersectionObserver' in window)) {
    root.querySelectorAll('.product-grid').forEach((g) => g.classList.add('is-visible'));
    return;
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    grid.classList.add('is-visible');
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  observer.observe(grid);
}

document.querySelectorAll('.product-grid').forEach((grid) => {
  const root = grid.closest('[id^="ProductGrid-"]') || document;
  initWishlistButtons(root);
  initSwatches(root);
  initQuantitySteppers(root);
  initAddToCart(root);
  initQuickView(root);
});
initScrollReveal(document);
