/**
 * Logo Slider
 * Clones the track's current children once, so the seamless marquee loop
 * has enough content to scroll through before restarting.
 *
 * Originally scoped via document.getElementById('logo-track-{{ section_id }}'),
 * which only works inline. Since this now loads as a static file, it loops
 * over every .logo-slider__track instead — that class was already stable
 * (not per-instance), so no other markup changes were needed for this.
 */
document.querySelectorAll('.logo-slider__track').forEach((track) => {
  if (track.dataset.initialized) return;
  track.dataset.initialized = true;

  const originals = [...track.children];
  originals.forEach((item) => {
    track.appendChild(item.cloneNode(true));
  });
});
