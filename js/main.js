// Testimonials are a native CSS scroll-snap carousel (see .swiper.brand in
// custom.css) — no Swiper init, so horizontal trackpad/touch/scrollbar scrolling
// works reliably and every card keeps the same static layout.
document.addEventListener('DOMContentLoaded', function () {

  // Mobile nav toggle
  var toggle = document.querySelector('[data-nav-toggle]');
  var menu = document.querySelector('.nav_right-wrapper');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      toggle.classList.toggle('is-active', open);
    });
  }
});
