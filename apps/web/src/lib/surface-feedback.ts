/** Decorative feedback only: never intercept links, gestures or native actions. */
export function setupSurfaceFeedback(){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const hover=matchMedia('(hover: hover) and (pointer: fine)');
 let activeCover:HTMLElement|null=null,coverFrame=0;
 let coverPoint={x:.5,y:.5};
 function resetCover(){
  cancelAnimationFrame(coverFrame);coverFrame=0;
  activeCover?.removeAttribute('data-reflecting');activeCover=null;
 }
 function paintCover(){
  coverFrame=0;
  if(!activeCover||reduced.matches||!hover.matches)return;
  const {x,y}=coverPoint;
  activeCover.style.setProperty('--gloss-x',`${(x*100).toFixed(2)}%`);
  activeCover.style.setProperty('--gloss-y',`${(y*100).toFixed(2)}%`);
  activeCover.style.setProperty('--cover-rx',`${((.5-y)*2.2).toFixed(3)}deg`);
  activeCover.style.setProperty('--cover-ry',`${((x-.5)*3.2).toFixed(3)}deg`);
  activeCover.setAttribute('data-reflecting','');
 }
 for(const link of document.querySelectorAll<HTMLElement>('.album-card > a,.next-story')){
  const frame=link.querySelector<HTMLElement>('.image-frame'),figure=frame?.closest('figure');
  if(!frame||!figure||frame.hasAttribute('data-cover-reflection'))continue;
  frame.setAttribute('data-cover-reflection','');
  for(const name of ['cover-specular','cover-sheen']){
   const layer=document.createElement('span');layer.className=name;layer.setAttribute('aria-hidden','true');frame.append(layer);
  }
  const track=(event:PointerEvent)=>{
   if(event.pointerType!=='mouse'||reduced.matches||!hover.matches)return;
   // Measure the untransformed figure so tilting cannot move the input plane.
   const rect=figure.getBoundingClientRect();if(!rect.width||!rect.height)return;
   if(activeCover!==frame){resetCover();activeCover=frame;}
   coverPoint={x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))};
   if(!coverFrame)coverFrame=requestAnimationFrame(paintCover);
  };
  figure.addEventListener('pointerenter',track,{passive:true});
  figure.addEventListener('pointermove',track,{passive:true});
  figure.addEventListener('pointerleave',()=>{if(activeCover===frame)resetCover();},{passive:true});
 }
 hover.addEventListener('change',resetCover);

 // Contained light on button faces; photo previews and map pins keep their
 // own feedback and positioning. Delegation includes dynamically added options.
 const controls='button:not(.map-point):not(.frame-surface):not(.darkroom-drop),.about-btn,.quiz-action,.darkroom-button,.footer-links a,.social-list a,.pagination a,.album-pagination a,.drift-begin';
 const flashes=new Map<HTMLElement,{layer:HTMLElement;animation:Animation}>();
 let pointer:{id:number;x:number;y:number;target:HTMLElement}|null=null;
 let keyTarget:HTMLElement|null=null;
 function control(target:EventTarget|null){
  const element=target instanceof Element?target.closest<HTMLElement>(controls):null;
  return element&&!element.matches(':disabled,[aria-disabled="true"]')&&!element.closest('[inert],[hidden],[aria-disabled="true"]')?element:null;
 }
 function clearFlash(element:HTMLElement){
  const flash=flashes.get(element);if(!flash)return;
  flashes.delete(element);flash.animation.cancel();flash.layer.remove();
  element.removeAttribute('data-feedback-positioned');
 }
 function flash(element:HTMLElement,x?:number,y?:number){
  if(reduced.matches||!Element.prototype.animate)return;
  clearFlash(element);
  const surface=element.querySelector<HTMLElement>('.elastic-button-face')??element;
  const rect=surface.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const px=x===undefined?rect.width/2:Math.max(0,Math.min(rect.width,x-rect.left));
  const py=y===undefined?rect.height/2:Math.max(0,Math.min(rect.height,y-rect.top));
  const size=Math.max(rect.width,rect.height)*2.2;
  const layer=document.createElement('span'),light=document.createElement('span');
  layer.className='button-glint';layer.setAttribute('aria-hidden','true');layer.inert=true;
  light.className='button-glint-light';Object.assign(light.style,{width:`${size}px`,height:`${size}px`,left:`${px-size/2}px`,top:`${py-size/2}px`});
  if(getComputedStyle(element).position==='static')element.setAttribute('data-feedback-positioned','');
  layer.append(light);surface.append(layer);
  const animation=light.animate([{transform:'scale(.12)',opacity:.65},{transform:'scale(.7)',opacity:.4,offset:.38},{transform:'scale(1)',opacity:0}],{duration:520,easing:'cubic-bezier(.18,.7,.25,1)'});
  flashes.set(element,{layer,animation});
  void animation.finished.then(()=>{if(flashes.get(element)?.animation===animation)clearFlash(element);}).catch(()=>{});
 }
 function resetKey(){keyTarget?.removeAttribute('data-key-press');keyTarget=null;}
 function reset(){resetCover();resetKey();pointer=null;for(const element of [...flashes.keys()])clearFlash(element);}
 document.addEventListener('pointerdown',event=>{
  if(event.button!==0||!event.isPrimary)return;
  const element=control(event.target);if(!element)return;
  pointer={id:event.pointerId,x:event.clientX,y:event.clientY,target:element};
  flash(element,event.clientX,event.clientY);
 },{passive:true});
 document.addEventListener('pointermove',event=>{
  if(pointer&&pointer.id===event.pointerId&&Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>8){clearFlash(pointer.target);pointer=null;}
 },{passive:true});
 window.addEventListener('pointerup',()=>{pointer=null;},{passive:true});
 window.addEventListener('pointercancel',reset,{passive:true});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'||event.key==='Tab'){reset();return;}
  if(event.repeat||!['Enter',' '].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey)return;
  const element=control(event.target);if(!element||(event.key===' '&&element.matches('a')))return;
  resetKey();keyTarget=element;element.setAttribute('data-key-press','');flash(element);
 });
 document.addEventListener('keyup',event=>{if(event.key==='Enter'||event.key===' ')resetKey();});
 document.addEventListener('focusout',resetKey);
 document.addEventListener('scroll',reset,{passive:true,capture:true});
 window.addEventListener('blur',reset);window.addEventListener('pagehide',reset);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
 reduced.addEventListener('change',reset);
}
