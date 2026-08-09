// Testimonials carousel — mirrors the Webflow Swiper config
document.addEventListener('DOMContentLoaded', function () {
  if (window.Swiper) {
    new Swiper('.swiper.brand', {
      loop: true,
      slidesPerView: 1.5,
      spaceBetween: 20,
      allowTouchMove: true,
      centeredSlides: true,
      breakpoints: {
        480:  { slidesPerView: 1.5, spaceBetween: 20 },
        999:  { slidesPerView: 1.5, spaceBetween: 20 },
        1024: { slidesPerView: 2.5, spaceBetween: 64 },
      },
    });
  }

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
