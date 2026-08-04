(() => {

  const sections = document.querySelectorAll('.premium-overlay');

  if (!sections.length) return;

  const observer = new IntersectionObserver((entries) => {

    entries.forEach((entry) => {

      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }

    });

  }, {
    threshold: 0.25
  });

  sections.forEach((section) => observer.observe(section));

})();

(function () {

  function initPremiumOverlay(section) {

    if (!section) return;

    const image = section.querySelector('.premium-overlay__image');
    const content = section.querySelector('.premium-overlay__content');

    if (!image || !content) return;

    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      section.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver((entries) => {

      entries.forEach((entry) => {

        if (entry.isIntersecting) {
          section.classList.add('is-visible');
        } else {
          section.classList.remove('is-visible');
        }

      });

    }, {
      threshold: 0.25,
      rootMargin: "0px 0px -10% 0px"
    });

    observer.observe(section);

    // Optional subtle parallax on desktop
    if (window.innerWidth > 990) {

      window.addEventListener(
        "scroll",
        () => {

          const rect = section.getBoundingClientRect();

          if (rect.bottom > 0 && rect.top < window.innerHeight) {

            const progress = rect.top / window.innerHeight;

            image.style.transform =
              `scale(1.04) translateY(${progress * 20}px)`;

          }

        },
        { passive: true }
      );

    }

  }

  function initAllPremiumOverlays() {

    document
      .querySelectorAll(".premium-overlay")
      .forEach(initPremiumOverlay);

  }

  document.addEventListener("DOMContentLoaded", initAllPremiumOverlays);

  document.addEventListener("shopify:section:load", function (event) {

    const section = event.target.querySelector(".premium-overlay");

    if (section) {
      initPremiumOverlay(section);
    }

  });

})();
