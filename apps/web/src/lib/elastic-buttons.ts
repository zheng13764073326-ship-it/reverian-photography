/** Spring motion lives on an inner face; the control's hit area never moves. */
export function setupElasticButtons(){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const hover=matchMedia('(hover: hover) and (pointer: fine)');
 const controllers:Array<{reset:(immediate?:boolean)=>void}>=[];
 for(const link of document.querySelectorAll<HTMLElement>('[data-elastic-button]')){
  const face=link.querySelector<HTMLElement>('.elastic-button-face');
  if(!face)continue;
  const round=link.classList.contains('back-to-top');
  const available=()=>!link.matches(':disabled,[aria-disabled="true"]')&&!link.closest('[inert],[hidden]');
  const value=[0,0,0,1],velocity=[0,0,0,0];
  let frame=0,last=0,inside=false,pressed=false,nx=0,ny=0;
  let pointer:{id:number;type:string;x:number;y:number}|null=null;
  let key:string|null=null;
  function target(){
   if(pressed)return [inside?nx:0,1,inside?nx*.4:0,round?.9:.94];
   return inside?[nx*(round?3.5:4.5),ny*3,nx*1.5-ny*.5,1.025]:[0,0,0,1];
  }
  function paint(){
   face!.style.transform=`translate3d(${value[0].toFixed(3)}px,${value[1].toFixed(3)}px,0) rotate(${value[2].toFixed(3)}deg) scale(${value[3].toFixed(4)})`;
   face!.style.setProperty('--elastic-content-x',`${(value[0]*.26).toFixed(3)}px`);
   face!.style.setProperty('--elastic-content-y',`${(value[1]*.3).toFixed(3)}px`);
   face!.style.setProperty('--elastic-icon-angle',`${(value[2]*1.15).toFixed(3)}deg`);
  }
  function tick(time:number){
   frame=0;
   if(!available()){reset(true);return;}
   const dt=Math.min((time-last)/1000||1/60,.032);last=time;
   const goal=target(),steps=Math.ceil(dt/(1/120)),step=dt/steps;
   // A fast, firm compression, then an underdamped return with real overshoot.
   const stiffness=pressed?650:220,damping=pressed?35:20;
   for(let n=0;n<steps;n++)for(let i=0;i<value.length;i++){
    velocity[i]+=((goal[i]-value[i])*stiffness-velocity[i]*damping)*step;
    value[i]+=velocity[i]*step;
   }
   const settled=value.every((v,i)=>Math.abs(v-goal[i])<.001&&Math.abs(velocity[i])<.01);
   if(settled){value.splice(0,4,...goal);velocity.fill(0);link.removeAttribute('data-elastic-moving');}
   paint();if(!settled)frame=requestAnimationFrame(tick);
  }
  function start(){
   if(reduced.matches||frame)return;
   last=performance.now();link.setAttribute('data-elastic-moving','');frame=requestAnimationFrame(tick);
  }
  function setPressed(next:boolean,rebound=true){
   if(next===pressed)return;
   pressed=next;link.toggleAttribute('data-elastic-pressed',next);
   if(!next&&rebound&&!reduced.matches){velocity[3]+=.75;velocity[2]+=(nx<0?-1:1)*8;}
   start();
  }
  function reset(immediate=false){
   inside=false;pointer=null;key=null;nx=0;ny=0;
   link.removeAttribute('data-elastic-hover');setPressed(false,false);
   if(immediate||reduced.matches){
    cancelAnimationFrame(frame);frame=0;value.splice(0,4,0,0,0,1);velocity.fill(0);
    face!.style.removeProperty('transform');
    for(const name of ['--elastic-content-x','--elastic-content-y','--elastic-icon-angle'])face!.style.removeProperty(name);
    link.removeAttribute('data-elastic-moving');
   }else start();
  }
  const track=(event:PointerEvent)=>{
   if(event.pointerType!=='mouse'||!hover.matches||reduced.matches||!available())return;
   const rect=link.getBoundingClientRect();if(!rect.width||!rect.height)return;
   nx=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));
   ny=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));
   if(!inside){inside=true;velocity[2]+=(nx<0?-1:1)*18;link.setAttribute('data-elastic-hover','');}
   start();
  };
  link.addEventListener('pointerenter',track,{passive:true});
  link.addEventListener('pointermove',track,{passive:true});
  link.addEventListener('pointerleave',()=>{
   inside=false;link.removeAttribute('data-elastic-hover');
   if(pointer?.type==='mouse')setPressed(false,false);
   start();
  },{passive:true});
  link.addEventListener('pointerdown',event=>{
   if(event.button!==0||!event.isPrimary||!available())return;
   pointer={id:event.pointerId,type:event.pointerType,x:event.clientX,y:event.clientY};setPressed(true);
  },{passive:true});
  window.addEventListener('pointermove',event=>{
   if(pointer?.id===event.pointerId&&pointer.type!=='mouse'&&Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>8)reset();
  },{passive:true});
  window.addEventListener('pointerup',event=>{if(pointer?.id===event.pointerId){pointer=null;setPressed(false);}},{passive:true});
  window.addEventListener('pointercancel',()=>reset(),{passive:true});
  link.addEventListener('keydown',event=>{
   // Space presses a native button; links keep Space's native scroll action.
   if((event.key!=='Enter'&&!(event.key===' '&&link.matches('button')))||event.repeat||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||!available())return;
   key=event.key;setPressed(true);
  });
  window.addEventListener('keyup',event=>{if(event.key===key){key=null;setPressed(false);}});
  link.addEventListener('focusout',()=>{if(key){key=null;setPressed(false);}});
  link.addEventListener('contextmenu',()=>reset());
  controllers.push({reset});
 }
 const resetAll=(immediate=false)=>controllers.forEach(controller=>controller.reset(immediate));
 document.addEventListener('scroll',()=>resetAll(),{passive:true,capture:true});
 window.addEventListener('resize',()=>resetAll(true),{passive:true});
 window.addEventListener('blur',()=>resetAll(true));
 window.addEventListener('pagehide',()=>resetAll(true));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)resetAll(true);});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'||event.key==='Tab')resetAll();});
 reduced.addEventListener('change',()=>resetAll(true));hover.addEventListener('change',()=>resetAll(true));
}
