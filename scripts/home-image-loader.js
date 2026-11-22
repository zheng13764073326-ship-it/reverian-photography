// Inline on the homepage: scheduling must not wait for another script request.
(() => {
  const images = [...document.querySelectorAll('img[data-deferred-image]')];
  if (!images.length) return;
  const pending = new Set(images);
  let observer;
  function load(image) {
    if (!pending.has(image)) return;
    pending.delete(image);
    if (observer) observer.unobserve(image);
    const src = image.getAttribute('data-src');
    const srcset = image.getAttribute('data-srcset');
    // Set responsive candidates first so a narrow screen does not fetch the fallback too.
    if (srcset) image.setAttribute('srcset', srcset);
    if (src) image.setAttribute('src', src);
    image.removeAttribute('data-src');
    image.removeAttribute('data-srcset');
    image.removeAttribute('data-deferred-image');
  }
  if (!('IntersectionObserver' in window)) {
    images.forEach(load);
    return;
  }
  const hero = document.querySelector('.hero-photo');
  let heroSettled = !hero || hero.complete;
  function observe() {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) load(entry.target); });
    }, {rootMargin: heroSettled ? '200px' : '0px', threshold: 0});
    pending.forEach(image => observer.observe(image));
  }
  function release() {
    if (heroSettled) return;
    heroSettled = true;
    observe();
  }
  observe();
  if (hero && !heroSettled) {
    hero.addEventListener('load', release, {once: true});
    hero.addEventListener('error', release, {once: true});
  }
  document.addEventListener('focusin', event => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a');
    if (link) link.querySelectorAll('img[data-deferred-image]').forEach(load);
  });
  window.addEventListener('beforeprint', () => pending.forEach(load));
})();
