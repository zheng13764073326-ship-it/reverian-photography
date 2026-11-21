/** Independent transform layers keep the entry focus and parallax from competing. */
export function setupHeroMotion(hero: HTMLElement) {
  const scene = hero.querySelector<HTMLElement>('.cover-scene');
  const title = hero.querySelector<HTMLElement>('.home-identity');
  if (!scene || !title) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const entryKey = 'reverian:hero-focus-seen';
  let width = 0, height = 0, top = 0, left = 0;
  let intersecting = false, active = false, pointerListening = false;
  let frame = 0, previousTime = 0, scroll = 0;
  let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
  let entryTimer = 0;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const scrollTarget = () => clamp(window.scrollY - top, 0, height);

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  }
  function paint() {
    // On a fast return to the top, damping must never expose the image's top edge.
    const backgroundY = Math.min(scroll * .25, scrollTarget());
    const marginX = Math.max(0, Math.min(10, width * .015 - 1));
    const marginY = Math.max(0, Math.min(10, height * .015 - 1));
    scene!.style.transform = `translate3d(${-mouseX * marginX}px,${backgroundY - mouseY * marginY}px,0)`;
    title!.style.transform = `translate3d(${mouseX * 4}px,${scroll * .5 + mouseY * 4}px,0)`;
    title!.style.opacity = String(clamp(1 - scroll / (height * .65), 0, 1));
  }
  function tick(time: number) {
    frame = 0;
    if (!active) return;
    // Equivalent to .06 mouse damping at 60 Hz, also consistent on 120 Hz displays.
    const elapsed = previousTime ? Math.min(time - previousTime, 64) : 1000 / 60;
    previousTime = time;
    const mouseLerp = 1 - Math.pow(1 - .06, elapsed / (1000 / 60));
    const scrollLerp = 1 - Math.pow(1 - .1, elapsed / (1000 / 60));
    const targetScroll = scrollTarget();
    scroll += (targetScroll - scroll) * scrollLerp;
    mouseX += (targetX - mouseX) * mouseLerp;
    mouseY += (targetY - mouseY) * mouseLerp;
    const moving = Math.abs(targetScroll - scroll) > .05 || Math.abs(targetX - mouseX) > .001 || Math.abs(targetY - mouseY) > .001;
    if (!moving) { scroll = targetScroll; mouseX = targetX; mouseY = targetY; }
    paint();
    if (moving) schedule();
    else previousTime = 0;
  }
  function schedule() {
    if (active && !frame) frame = requestAnimationFrame(tick);
  }
  function resetPointer() {
    targetX = targetY = 0;
    schedule();
  }
  function pointerMove(event: PointerEvent) {
    if (!active || event.pointerType !== 'mouse') return;
    targetX = clamp((event.clientX - left) / width * 2 - 1, -1, 1);
    targetY = clamp((event.clientY + window.scrollY - top) / height * 2 - 1, -1, 1);
    schedule();
  }
  function updatePointer() {
    const listen = fine.matches && !reduced.matches;
    if (listen === pointerListening) return;
    pointerListening = listen;
    if (listen) {
      hero.addEventListener('pointermove', pointerMove, {passive: true});
      hero.addEventListener('pointerleave', resetPointer, {passive: true});
    } else {
      hero.removeEventListener('pointermove', pointerMove);
      hero.removeEventListener('pointerleave', resetPointer);
      resetPointer();
    }
  }
  function updateActive() {
    const next = intersecting && !document.hidden && !reduced.matches;
    if (next !== active) {
      active = next;
      hero.dataset.heroMotion = active ? 'active' : 'paused';
      if (active) {
        scroll = scrollTarget();
        mouseX = mouseY = targetX = targetY = 0;
        schedule();
      } else stop();
    }
    if (reduced.matches) {
      scene!.style.removeProperty('transform');
      title!.style.removeProperty('transform');
      title!.style.removeProperty('opacity');
    }
  }
  function measure() {
    const rect = hero.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    top = rect.top + window.scrollY;
    left = rect.left;
    intersecting = rect.bottom > 0 && rect.top < innerHeight;
    updateActive();
    schedule();
  }

  function finishEntry() {
    clearTimeout(entryTimer);
    window.removeEventListener('reverian:hero-reveal', startEntry);
    hero.dataset.heroEntry = 'done';
  }
  function startEntry() {
    if (hero.dataset.heroEntry !== 'waiting') return;
    window.removeEventListener('reverian:hero-reveal', startEntry);
    if (reduced.matches || document.hidden || scrollTarget() > height * .5) { finishEntry(); return; }
    hero.dataset.heroEntry = 'entering';
    try { sessionStorage.setItem(entryKey, '1'); } catch { /* Private mode: once per document. */ }
    entryTimer = window.setTimeout(finishEntry, 1100);
  }
  measure();
  updatePointer();
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  let seen = false;
  try { seen = sessionStorage.getItem(entryKey) === '1'; } catch { /* Storage is optional. */ }
  if (!seen && !reduced.matches && !location.hash && navigation?.type !== 'back_forward') {
    hero.dataset.heroEntry = 'waiting';
    const intro = document.getElementById('aperture-intro');
    if (intro && intro.dataset.revealed !== 'true') window.addEventListener('reverian:hero-reveal', startEntry, {once: true});
    else startEntry();
  } else finishEntry();

  new IntersectionObserver(([entry]) => {
    intersecting = entry.isIntersecting;
    updateActive();
  }).observe(hero);
  new ResizeObserver(measure).observe(hero);
  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', measure, {passive: true});
  window.addEventListener('blur', resetPointer);
  document.addEventListener('visibilitychange', updateActive);
  fine.addEventListener('change', updatePointer);
  reduced.addEventListener('change', () => {
    finishEntry();
    updatePointer();
    updateActive();
  });
  window.addEventListener('pagehide', () => {
    finishEntry();
    active = false;
    hero.dataset.heroMotion = 'paused';
    stop();
  });
  window.addEventListener('pageshow', measure);
}
