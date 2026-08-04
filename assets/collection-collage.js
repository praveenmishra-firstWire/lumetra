/**
 * Collection collage Showcase
 * Video autoplay resilience for the large tile's video (if used).
 * Some mobile browsers block autoplay even when muted+playsinline are set
 * if the attributes were applied after parse; force a play() call and
 * retry once on the first user interaction if it was blocked. Also pauses
 * the video while scrolled off-screen and resumes it when back in view.
 *
 * Originally scoped via document.getElementById('Collectioncollage-{{ sec_id }}'),
 * which only works inline. Since this now loads as a static file, it loops
 * over every [data-collection-collage] section instead — sections without a
 * video (image tile, or no large tile at all) are skipped automatically.
 */
document.querySelectorAll('[data-collection-collage]').forEach(function (section) {
  var video = section.querySelector('[data-cbs-video]');
  if (!video) return;

  var tryPlay = function () {
    var playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function () {
        var resumeOnInteraction = function () {
          video.play().catch(function () { });
          document.removeEventListener('touchstart', resumeOnInteraction);
          document.removeEventListener('click', resumeOnInteraction);
        };
        document.addEventListener('touchstart', resumeOnInteraction, { once: true, passive: true });
        document.addEventListener('click', resumeOnInteraction, { once: true });
      });
    }
  };

  if (video.hasAttribute('autoplay')) {
    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener('loadeddata', tryPlay, { once: true });
    }

    // Pause while scrolled off-screen and resume when back in view, so an
    // autoplaying video isn't burning battery/bandwidth for a tile the
    // visitor isn't currently looking at.
    if ('IntersectionObserver' in window) {
      var videoObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            video.play().catch(function () { });
          } else {
            video.pause();
          }
        });
      }, { threshold: 0.1 });
      videoObserver.observe(video);
    }
  }
});
