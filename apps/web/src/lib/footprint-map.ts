import {clampCamera,initialMapCamera,mapFrame,placeOnMap,zoomCamera} from './footprints';
import type {MapCamera,MapPoint,MapScope} from './footprints';

class TravelFootprints extends HTMLElement {
 private cleanup?:()=>void;
 connectedCallback(){
  this.cleanup?.();
  const abort=new AbortController(),signal=abort.signal;
  const panels=[...this.querySelectorAll<HTMLElement>('[data-map-panel]')];
  const tabs=[...this.querySelectorAll<HTMLButtonElement>('[data-map-tab]')];
  const dismissers:(()=>void)[]=[];
  for(const panel of panels){
   const scope=panel.dataset.mapPanel as MapScope;
   const canvas=panel.querySelector<HTMLElement>('.map-canvas')!;
   const geometry=panel.querySelector<SVGGElement>('[data-map-geometry]')!;
   const points=[...panel.querySelectorAll<HTMLButtonElement>('[data-place]')];
   const previews=[...panel.querySelectorAll<HTMLElement>('[data-preview]')];
   const controls=[...panel.querySelectorAll<HTMLButtonElement>('[data-map-action]')];
   let camera=initialMapCamera(scope),pinned:string|undefined,shown:string|undefined,timer:ReturnType<typeof setTimeout>|undefined;
   let drag:{start:MapPoint;camera:MapCamera;distance:number}|undefined,moved=false,suppressClick=false;
   const pointers=new Map<number,MapPoint>();
   const local=(event:{clientX:number;clientY:number}):MapPoint=>{
    const r=canvas.getBoundingClientRect();return {x:(event.clientX-r.left)/r.width*mapFrame.width,y:(event.clientY-r.top)/r.height*mapFrame.height};
   };
   const show=(id?:string)=>{
    clearTimeout(timer);
    if(shown===id)return;
    const scrollTop=window.scrollY;shown=id;
    for(const point of points)point.setAttribute('aria-expanded',String(point.dataset.place===id));
    for(const preview of previews)preview.hidden=preview.dataset.preview!==id;
    // Below-map previews change document height. Keep browser scroll anchoring
    // from moving the dot away from the pointer as a preview opens.
    if(window.scrollY!==scrollTop)window.scrollTo({top:scrollTop,behavior:'instant'});
   };
   const dismiss=()=>{pinned=undefined;show();};dismissers.push(dismiss);
   const render=()=>{
    geometry.setAttribute('transform',`translate(${camera.x} ${camera.y}) scale(${camera.scale})`);
    canvas.dataset.scale=String(camera.scale);canvas.toggleAttribute('data-zoomed',camera.scale>1);canvas.toggleAttribute('data-labels',camera.scale>=16);
    for(const point of points){
     const p=placeOnMap({x:Number(point.dataset.x),y:Number(point.dataset.y)},camera);
     point.style.setProperty('--point-x',`${p.x/mapFrame.width*100}%`);point.style.setProperty('--point-y',`${p.y/mapFrame.height*100}%`);
     point.hidden=p.x<0||p.y<0||p.x>mapFrame.width||p.y>mapFrame.height;
     point.toggleAttribute('data-label-left',p.x>mapFrame.width*.8);
    }
    for(const control of controls)control.disabled=control.dataset.mapAction==='in'?camera.scale>=64:control.dataset.mapAction==='out'?camera.scale<=1:false;
   };
   const zoom=(factor:number,anchor?:MapPoint)=>{
    const selected=points.find(point=>!point.hidden&&point.dataset.place===pinned);
    anchor??=selected?placeOnMap({x:Number(selected.dataset.x),y:Number(selected.dataset.y)},camera):{x:500,y:350};
    camera=zoomCamera(camera,camera.scale*factor,anchor);render();
   };
   const overview=()=>{camera={scale:1,x:0,y:0};dismiss();render();};
   const leave=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!pinned&&!panel.matches(':focus-within'))show();},220);};
   const nearest=(event:MouseEvent|PointerEvent)=>points.filter(point=>!point.hidden).map(point=>{
    const r=point.getBoundingClientRect();return {point,distance:Math.hypot(event.clientX-r.left-r.width/2,event.clientY-r.top-r.height/2)};
   }).filter(hit=>hit.distance<=24).sort((a,b)=>a.distance-b.distance)[0]?.point;
   // Hit areas stay 44px at every zoom. Resolve overlapping targets by their
   // actual dot positions, including when pointer capture targets the canvas.
   canvas.addEventListener('click',event=>{
    if(event.detail===0)return;
    event.preventDefault();event.stopPropagation();
    if(suppressClick){suppressClick=false;return;}
    const point=nearest(event);if(!point){dismiss();return;}
    pinned=point.dataset.place;point.focus({preventScroll:true});show(pinned);
   },{capture:true,signal});
   for(const point of points){
    point.addEventListener('focus',()=>show(point.dataset.place),{signal});
    point.addEventListener('click',event=>{if(event.detail===0){pinned=point.dataset.place;show(pinned);}},{signal});
   }
   canvas.addEventListener('pointerleave',leave,{signal});
   for(const preview of previews){
    preview.addEventListener('pointerenter',()=>clearTimeout(timer),{signal});preview.addEventListener('pointerleave',leave,{signal});
    preview.querySelector('button')?.addEventListener('click',()=>{
     const point=points.find(point=>point.dataset.place===preview.dataset.preview);
     (point&&!point.hidden?point:canvas).focus({preventScroll:true});dismiss();
    },{signal});
   }
   for(const control of controls)control.addEventListener('click',()=>{
    if(control.dataset.mapAction==='overview')overview();else zoom(control.dataset.mapAction==='in'?2:.5);
   },{signal});
   canvas.addEventListener('wheel',event=>{
    if(!event.ctrlKey&&!event.metaKey)return;
    event.preventDefault();zoom(Math.exp(-event.deltaY*.005),local(event));
   },{passive:false,signal});
   const gesture=()=>{
    const [a,b]=[...pointers.values()];
    return {start:b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2}:a,distance:b?Math.hypot(a.x-b.x,a.y-b.y):0};
   };
   canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    pointers.set(event.pointerId,local(event));suppressClick=false;if(pointers.size===1)moved=false;
    if(camera.scale<=1)return;
    canvas.setPointerCapture(event.pointerId);
    drag={...gesture(),camera:{...camera}};
   },{signal});
   canvas.addEventListener('pointermove',event=>{
    if(pointers.has(event.pointerId))pointers.set(event.pointerId,local(event));
    if(drag&&pointers.size){
     const next=gesture(),dx=next.start.x-drag.start.x,dy=next.start.y-drag.start.y;
     const pixelsPerUnit=canvas.clientWidth/mapFrame.width;
     if(Math.hypot(dx,dy)*pixelsPerUnit>5||Math.abs(next.distance-drag.distance)*pixelsPerUnit>5)moved=true;
     if(!moved)return;
     const scaled=drag.distance&&next.distance?zoomCamera(drag.camera,drag.camera.scale*next.distance/drag.distance,drag.start):drag.camera;
     camera=clampCamera({...scaled,x:scaled.x+dx,y:scaled.y+dy});canvas.setAttribute('data-dragging','');dismiss();render();
    }else if(event.pointerType==='mouse'&&!pinned&&!pointers.size){
     const point=nearest(event);if(point)show(point.dataset.place);else if(shown)leave();
    }
   },{signal});
   const end=(event:PointerEvent)=>{
    if(!pointers.has(event.pointerId))return;
    pointers.delete(event.pointerId);if(moved)suppressClick=true;
    if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    drag=pointers.size&&camera.scale>1?{...gesture(),camera:{...camera}}:undefined;
    if(!drag)canvas.removeAttribute('data-dragging');
   };
   canvas.addEventListener('pointerup',end,{signal});canvas.addEventListener('pointercancel',end,{signal});
   panel.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
     const active=points.find(point=>!point.hidden&&point.getAttribute('aria-expanded')==='true');
     active?.focus({preventScroll:true});dismiss();event.preventDefault();return;
    }
    if(event.target!==canvas)return;
    if(event.key==='+'||event.key==='=')zoom(2);
    else if(event.key==='-')zoom(.5);
    else if(event.key==='0')overview();
    else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
     camera=clampCamera({...camera,x:camera.x+(event.key==='ArrowLeft'?80:event.key==='ArrowRight'?-80:0),y:camera.y+(event.key==='ArrowUp'?80:event.key==='ArrowDown'?-80:0)});dismiss();render();
    }else return;
    event.preventDefault();
   },{signal});
   panel.addEventListener('focusout',()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!pinned&&!panel.matches(':focus-within'))show();},0);},{signal});
   signal.addEventListener('abort',()=>clearTimeout(timer),{once:true});render();
  }
  const select=(tab:HTMLButtonElement)=>{
   dismissers.forEach(dismiss=>dismiss());
   for(const item of tabs){const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;}
   for(const panel of panels)panel.hidden=panel.dataset.mapPanel!==tab.dataset.mapTab;
  };
  for(const [index,tab] of tabs.entries()){
   tab.addEventListener('click',()=>select(tab),{signal});
   tab.addEventListener('keydown',event=>{
    const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:-1;
    if(next<0)return;event.preventDefault();select(tabs[next]);tabs[next].focus({preventScroll:true});
   },{signal});
  }
  document.addEventListener('click',event=>{if(!this.contains(event.target as Node))dismissers.forEach(dismiss=>dismiss());},{signal});
  this.cleanup=()=>abort.abort();
 }
 disconnectedCallback(){this.cleanup?.();}
}
if(!customElements.get('travel-footprints'))customElements.define('travel-footprints',TravelFootprints);
