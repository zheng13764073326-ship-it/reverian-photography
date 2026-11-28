// The eight nominal whole stops share one source for the HUD, blur and accessible value.
const apertureStops=[
  {aperture:'1.4',shutter:'1/4000',blur:14,depth:'极浅'},
  {aperture:'2.0',shutter:'1/2000',blur:10,depth:'很浅'},
  {aperture:'2.8',shutter:'1/1000',blur:7,depth:'浅'},
  {aperture:'4.0',shutter:'1/500',blur:4.5,depth:'较浅'},
  {aperture:'5.6',shutter:'1/250',blur:2.5,depth:'中等'},
  {aperture:'8.0',shutter:'1/125',blur:1.2,depth:'清晰'},
  {aperture:'11',shutter:'1/60',blur:.4,depth:'很深'},
  {aperture:'16',shutter:'1/30',blur:0,depth:'全景深'}
];
export function setupPhotographyGuides(root:HTMLElement){
  if(root.dataset.initialized)return;
  root.dataset.initialized='true';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const input=root.querySelector<HTMLInputElement>('[data-aperture-input]')!;
  const background=root.querySelector<HTMLElement>('[data-aperture-background]')!;
  const aperture=root.querySelector<HTMLElement>('[data-aperture-value]')!;
  const shutter=root.querySelector<HTMLElement>('[data-shutter-value]')!;
  const depth=root.querySelector<HTMLElement>('[data-depth-value]')!;
  const ticks=[...root.querySelectorAll<HTMLElement>('.pg-aperture-ticks span')];
  const link=root.querySelector<HTMLElement>('[data-demo-guide]')!;
  let frame=0;
  const render=()=>{
    frame=0;
    const index=Math.max(0,Math.min(7,Math.round(Number(input.value))));
    const stop=apertureStops[index];
    aperture.textContent=`f/${stop.aperture}`;
    shutter.textContent=`${stop.shutter}s`;
    depth.textContent=stop.depth;
    background.style.setProperty('--aperture-blur',`${stop.blur}px`);
    input.setAttribute('aria-valuetext',`f/${stop.aperture}，快门 ${stop.shutter} 秒，景深${stop.depth}`);
    ticks.forEach((tick,i)=>tick.classList.toggle('is-active',i===index));
  };
  input.addEventListener('input',()=>{
    if(!frame)frame=requestAnimationFrame(render);
    if(!link.classList.contains('is-discovered'))link.classList.add('is-discovered');
  });
  const timers=new Map<HTMLElement,number>();
  root.querySelectorAll<HTMLAnchorElement>('[data-guide-scroll]').forEach(link=>link.addEventListener('click',event=>{
    if(event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
    const target=document.getElementById(link.hash.slice(1));
    if(!target)return;
    event.preventDefault();
    target.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
    if(target.classList.contains('pg-card')){
      clearTimeout(timers.get(target));
      target.classList.remove('is-highlighted');
      void target.offsetWidth;
      target.classList.add('is-highlighted');
      timers.set(target,window.setTimeout(()=>{target.classList.remove('is-highlighted');timers.delete(target);},1200));
      target.focus({preventScroll:true});
    }
  }));
}
