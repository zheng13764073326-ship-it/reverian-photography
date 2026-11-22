import {selectFrames} from './collections';
import {resetImageRecovery} from './image-loading';

export function setupCollectionGallery(root: HTMLElement) {
  const frames = [...root.querySelectorAll<HTMLElement>('.collection-frame')].map(element => ({element, category: element.dataset.category!}));
  const filters = [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const count = root.querySelector<HTMLOutputElement>('.collection-count')!;
  const more = root.querySelector<HTMLButtonElement>('.collection-load');
  const end = root.querySelector<HTMLElement>('[data-roll-end]')!;
  const empty = root.querySelector<HTMLElement>('.collection-empty')!;
  const dialog = root.querySelector<HTMLDialogElement>('.collection-viewer')!;
  const stage = root.querySelector<HTMLElement>('.collection-viewer-stage')!;
  const title = root.querySelector<HTMLElement>('#collection-viewer-title')!;
  const detail = root.querySelector<HTMLElement>('[data-preview-detail]')!;
  const counter = root.querySelector<HTMLElement>('[data-preview-count]')!;
  const previous = root.querySelector<HTMLButtonElement>('[data-preview-prev]')!;
  const next = root.querySelector<HTMLButtonElement>('[data-preview-next]')!;
  let category = 'all', limit = more ? 12 : Infinity, current = 0;
  let visible = frames, returnFocus: HTMLElement | null = null, previousOverflow = '';

  function update() {
    const all = selectFrames(frames, category);
    visible = selectFrames(frames, category, limit);
    const shown = new Set(visible);
    frames.forEach(frame => {frame.element.hidden = !shown.has(frame);});
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
    count.textContent = `${String(visible.length).padStart(2, '0')}${visible.length < all.length ? ` / ${all.length}` : ''} FRAMES`;
    empty.hidden = all.length !== 0;
    end.textContent = `${visible.length < all.length ? 'CONTINUED' : 'END OF ROLL'} // ${String(all.length).padStart(2, '0')} FRAMES`;
    if (more) more.disabled = visible.length >= all.length;
  }

  function readLocation() {
    const value = new URL(location.href).searchParams.get('category');
    category = filters.some(button => button.dataset.filter === value) ? value! : 'all';
    limit = more ? 12 : Infinity;
    update();
  }
  filters.forEach(button => button.addEventListener('click', () => {
    if (category === button.dataset.filter) return;
    category = button.dataset.filter!;
    limit = more ? 12 : Infinity;
    const url = new URL(location.href);
    if (category === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', category);
    history.pushState(null, '', url);
    update();
  }));
  more?.addEventListener('click', () => {
    const oldLength = visible.length;
    limit += 12;
    update();
    visible[oldLength]?.element.querySelector<HTMLButtonElement>('button')?.focus();
  });
  window.addEventListener('popstate', () => {if (dialog.open) dialog.close(); readLocation();});
  readLocation();

  function clearPreview() {
    stage.querySelectorAll('img').forEach(resetImageRecovery);
    stage.replaceChildren();
  }
  function sizePreview() {
    if (!dialog.open || !visible[current]) return;
    const frame = visible[current].element;
    const ratio = Number(frame.dataset.width) / Number(frame.dataset.height);
    const availableWidth = Math.max(1, dialog.clientWidth - 48);
    const head = root.querySelector<HTMLElement>('.collection-viewer-head')!.offsetHeight;
    const foot = root.querySelector<HTMLElement>('.collection-viewer-foot')!.offsetHeight;
    const availableHeight = Math.max(60, dialog.clientHeight - head - foot - 48);
    const width = Math.min(availableWidth, availableHeight * ratio);
    stage.style.width = `${width}px`;
    stage.style.height = `${width / ratio}px`;
  }
  function present() {
    const frame = visible[current].element;
    clearPreview();
    const placeholder = frame.querySelector<HTMLElement>('.frame-placeholder')!.cloneNode(true);
    stage.append(placeholder);
    const source = frame.querySelector<HTMLImageElement>('.collection-image');
    if (source) {
      const image = source.cloneNode(true) as HTMLImageElement;
      image.removeAttribute('data-image-state');
      image.setAttribute('aria-hidden', 'true');
      stage.append(image);
    }
    title.textContent = frame.dataset.title!;
    detail.textContent = frame.dataset.detail || '';
    stage.setAttribute('aria-label', `${frame.dataset.title}${source ? '' : ' · 未曝光胶片预览'}`);
    counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(visible.length).padStart(2, '0')}`;
    previous.disabled = current === 0;
    next.disabled = current === visible.length - 1;
    sizePreview();
  }
  frames.forEach(frame => frame.element.querySelector<HTMLButtonElement>('button')!.addEventListener('click', event => {
    current = visible.indexOf(frame);
    if (current < 0) return;
    returnFocus = event.currentTarget as HTMLElement;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    present();
  }));
  root.querySelector('[data-preview-close]')!.addEventListener('click', () => dialog.close());
  previous.addEventListener('click', () => {if (current > 0) {current--; present();}});
  next.addEventListener('click', () => {if (current < visible.length - 1) {current++; present();}});
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      if (event.key === 'ArrowLeft') previous.click(); else next.click();
    }
  });
  // Only a gesture entirely outside the paper closes it; dragging off a control does not.
  let backdropDown = false;
  function isBackdrop(event: PointerEvent | MouseEvent) {
    const rect = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
  }
  dialog.addEventListener('pointerdown', event => {backdropDown = isBackdrop(event);});
  dialog.addEventListener('click', event => {if (backdropDown && isBackdrop(event)) dialog.close(); backdropDown = false;});
  dialog.addEventListener('close', () => {
    clearPreview();
    document.body.style.overflow = previousOverflow;
    if (returnFocus?.isConnected && !returnFocus.closest('[hidden]')) returnFocus.focus({preventScroll:true});
  });
  window.addEventListener('resize', sizePreview);
}
