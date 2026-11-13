type Recovery = { attempts: number; timer?: ReturnType<typeof setTimeout> };
const recoveries = new WeakMap<HTMLImageElement, Recovery>();

/** Cancel retries before a reusable lightbox image changes or is closed. */
export function resetImageRecovery(image: HTMLImageElement) {
  const state = recoveries.get(image);
  if (state?.timer) clearTimeout(state.timer);
  recoveries.delete(image);
  delete image.dataset.imageState;
}

function recover(image: HTMLImageElement) {
  if (!image.getAttribute('src') || !image.complete || image.naturalWidth) return;
  image.dataset.imageState = 'failed';
  const state = recoveries.get(image) ?? { attempts: 0 };
  recoveries.set(image, state);
  if (state.timer || state.attempts >= 2) return;
  const original = image.getAttribute('src');
  const fallback = image.dataset.fallbackSrc || original!;
  state.attempts++;
  state.timer = setTimeout(() => {
    state.timer = undefined;
    if (recoveries.get(image) !== state || image.getAttribute('src') !== original) return;
    // A smaller file reduces the cost of retrying on a weak connection.
    // Disable responsive candidates so they cannot override the fallback.
    image.closest('picture')?.querySelectorAll('source').forEach(source => source.removeAttribute('srcset'));
    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
    image.src = fallback;
  }, state.attempts === 1 ? 350 : 1200);
}

export function installImageRecovery() {
  document.addEventListener('error', event => {
    if (event.target instanceof HTMLImageElement) recover(event.target);
  }, true);
  document.addEventListener('load', event => {
    if (event.target instanceof HTMLImageElement) resetImageRecovery(event.target);
  }, true);
  // Include images that failed before the deferred script became ready.
  document.querySelectorAll('img').forEach(recover);
}
