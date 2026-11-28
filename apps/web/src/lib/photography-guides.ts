export const apertureStops = [
  { aperture: '1.4', shutter: '1/4000', photoBlur: 14, depth: '极浅' },
  { aperture: '2.0', shutter: '1/2000', photoBlur: 10, depth: '很浅' },
  { aperture: '2.8', shutter: '1/1000', photoBlur: 7, depth: '浅' },
  { aperture: '4.0', shutter: '1/500', photoBlur: 4.5, depth: '较浅' },
  { aperture: '5.6', shutter: '1/250', photoBlur: 2.5, depth: '中等' },
  { aperture: '8.0', shutter: '1/125', photoBlur: 1.2, depth: '清晰' },
  { aperture: '11', shutter: '1/60', photoBlur: .4, depth: '很深' },
  { aperture: '16', shutter: '1/30', photoBlur: 0, depth: '全景深' },
] as const;
export const defaultStop = 2;
export const lastStop = apertureStops.length - 1;

export function bokehRadius(open: number, closed: number, index: number) {
  return open + (closed - open) * index / lastStop;
}

export function sceneStyle(index: number) {
  return {
    '--aperture-blur': `${apertureStops[index].photoBlur}px`,
    '--bokeh-blur': `${4.5 * (1 - index / lastStop)}px`,
    '--star-opacity': String(Math.max(0, index - 5) * .22),
  };
}

export function apertureDescription(index: number) {
  const {aperture, shutter, depth} = apertureStops[index];
  return `f/${aperture}，快门 ${shutter} 秒，景深${depth}`;
}

export function setupPhotographyGuides(root: HTMLElement) {
  if (root.dataset.initialized) return;
  root.dataset.initialized = 'true';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const input = root.querySelector<HTMLInputElement>('[data-aperture-input]')!;
  const background = root.querySelector<HTMLElement>('[data-aperture-background]')!;
  const lights = [...background.querySelectorAll<SVGCircleElement>('[data-bokeh-light]')].map(circle => ({
    circle,
    open: Number(circle.dataset.openRadius),
    closed: Number(circle.dataset.closedRadius),
  }));
  const aperture = root.querySelector<HTMLElement>('[data-aperture-value]')!;
  const shutter = root.querySelector<HTMLElement>('[data-shutter-value]')!;
  const depth = root.querySelector<HTMLElement>('[data-depth-value]')!;
  const ticks = root.querySelectorAll<HTMLButtonElement>('[data-aperture-stop]');
  const link = root.querySelector<HTMLElement>('[data-demo-guide]')!;
  let frame = 0;

  function render() {
    frame = 0;
    const index = Math.max(0, Math.min(lastStop, Math.round(input.valueAsNumber)));
    const stop = apertureStops[index];
    aperture.textContent = `f/${stop.aperture}`;
    shutter.textContent = `${stop.shutter}s`;
    depth.textContent = stop.depth;
    input.setAttribute('aria-valuetext', apertureDescription(index));
    for (const [name, value] of Object.entries(sceneStyle(index))) {
      background.style.setProperty(name, value);
    }
    for (const {circle, open, closed} of lights) {
      circle.setAttribute('r', String(bokehRadius(open, closed, index)));
    }
    ticks.forEach(tick => {
      tick.setAttribute('aria-pressed', String(Number(tick.dataset.apertureStop) === index));
    });
  }

  function selectStop() {
    if (!frame) frame = requestAnimationFrame(render);
    link.classList.add('is-discovered');
  }
  input.addEventListener('input', selectStop);
  ticks.forEach(tick => {
    const chooseTick = () => {
      input.value = tick.dataset.apertureStop!;
      selectStop();
    };
    tick.addEventListener('click', chooseTick);
    // A touch following a range drag can finish without a compatibility click.
    // Native scrolling cancels the pointer, and sliding off a tick should not select it.
    tick.addEventListener('pointerup', event => {
      if (event.pointerType === 'touch' && event.isPrimary &&
          tick.contains(document.elementFromPoint(event.clientX, event.clientY))) {
        chooseTick();
      }
    });
  });
  // Native form restoration can select a different stop on a history traversal.
  render();
  const timers=new Map<HTMLElement,number>();
  root.querySelectorAll<HTMLAnchorElement>('[data-guide-scroll]').forEach(link=>link.addEventListener('click',event=>{
    if(event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
    const target=document.getElementById(link.hash.slice(1));
    if(!target)return;
    event.preventDefault();
    target.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
    target.focus({preventScroll:true});
    if(target.classList.contains('pg-card')){
      clearTimeout(timers.get(target));
      target.classList.remove('is-highlighted');
      void target.offsetWidth;
      target.classList.add('is-highlighted');
      timers.set(target,window.setTimeout(()=>{target.classList.remove('is-highlighted');timers.delete(target);},1200));
    }
  }));
}
