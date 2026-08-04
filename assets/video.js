/**
 * Video
 * Sound on/off toggle for the Shopify-hosted video source.
 * Originally scoped via document.getElementById('banner-video-{{ section.id }}'),
 * which only works inline. Since this now loads as a static file, it loops
 * over every .banner-video section instead — sections without a sound
 * toggle button (either no video, or the setting is off) are skipped
 * automatically, since the button simply won't exist in their markup.
 */
document.querySelectorAll('.banner-video').forEach(function (wrapper) {
  var video = wrapper.querySelector('video');
  var toggle = wrapper.querySelector('[data-sound-toggle]');
  if (!video || !toggle) return;

  toggle.addEventListener('click', function () {
    video.muted = !video.muted;
    toggle.querySelector('.icon-sound-on').style.display = video.muted ? 'none' : 'block';
    toggle.querySelector('.icon-sound-off').style.display = video.muted ? 'block' : 'none';
  });
});
