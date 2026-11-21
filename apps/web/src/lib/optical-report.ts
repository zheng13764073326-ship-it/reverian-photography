import {analysePixels,wavePoints,wavePath,dimensionScores,radarPoints,histogramPoints} from './report-math';
import type {PictureAnalysis} from './report-math';
import type {ReportSnapshot} from './report-export';

export function createOpticalReport(root:HTMLElement){
 const get=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const card=get('[data-report]'),result=get('[data-result]'),details=get('[data-result-details]');
 const reviewPanel=get<HTMLDetailsElement>('[data-review-panel]');
 const wave=root.querySelector<SVGSVGElement>('[data-wave]')!;
 const preview=get<HTMLDialogElement>('[data-report-preview]'),previewImage=get<HTMLImageElement>('[data-report-preview-image]');
 const exportButton=get<HTMLButtonElement>('[data-export-report]'),retry=get<HTMLButtonElement>('[data-analysis-retry]');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mouse=matchMedia('(hover: hover) and (pointer: fine)');
 let generation=0,animationFrame=0,tiltFrame=0,entryTimer=0,observer:IntersectionObserver|undefined;
 let snapshot:(Omit<ReportSnapshot,'analysis'> & {analysis?:PictureAnalysis})|undefined,currentImage:HTMLImageElement|undefined,analysis:PictureAnalysis|undefined;
 let urls:string[]=[],active=-1,correct:boolean[]=[],completed=false,analysing=false,analysisRun=0;
 let items:HTMLElement[]=[],nodes:SVGGElement[]=[];
 const releaseUrls=()=>{urls.forEach(url=>URL.revokeObjectURL(url));urls=[];previewImage.hidden=true;previewImage.removeAttribute('src');};
 const resetTilt=()=>{cancelAnimationFrame(tiltFrame);tiltFrame=0;card.style.removeProperty('--rx');card.style.removeProperty('--ry');};
 function reset(){
  generation++;analysisRun++;analysing=false;completed=false;snapshot=undefined;analysis=undefined;currentImage=undefined;
  cancelAnimationFrame(animationFrame);clearTimeout(entryTimer);observer?.disconnect();observer=undefined;resetTilt();
  result.classList.remove('is-focusing');details.inert=false;card.inert=false;reviewPanel.open=false;if(preview.open)preview.close();releaseUrls();
  exportButton.disabled=true;exportButton.textContent='导出测光报告';retry.hidden=true;active=-1;
 }
 function activate(i:number){
  if(i===active)return;active=i;items.forEach((item,j)=>item.classList.toggle('is-active',j===i));nodes.forEach((node,j)=>node.classList.toggle('is-active',j===i));
 }
 function locate(i:number){
  reviewPanel.open=true;
  activate(i);const rect=items[i]?.getBoundingClientRect();if(rect)window.scrollTo({top:scrollY+rect.top+rect.height/2-innerHeight/2,behavior:reduced.matches?'instant':'smooth'});
  items[i]?.focus({preventScroll:true});
 }
 function connectReview(){
  observer?.disconnect();
  if(mouse.matches||!completed)return;
  const visible=new Set<HTMLElement>();
  observer=new IntersectionObserver(entries=>{
   entries.forEach(entry=>entry.isIntersecting?visible.add(entry.target as HTMLElement):visible.delete(entry.target as HTMLElement));
   let nearest:HTMLElement|undefined,distance=Infinity;
   for(const item of visible){const r=item.getBoundingClientRect(),d=Math.abs(r.top+r.height/2-innerHeight/2);if(d<distance){distance=d;nearest=item;}}
   if(nearest)activate(items.indexOf(nearest));
  },{rootMargin:'-49% 0px -49% 0px',threshold:0});
  items.forEach(item=>observer!.observe(item));
 }
 function drawWave(){
  const {mine,visitor}=wavePoints(correct);
  // Only generated numbers enter SVG markup. Captions use textContent below.
  const ticks=Array.from({length:91},(_,i)=>{const x=30+i*6,len=i%10===0?16:i%5===0?10:5;return '<path class="wave-caliper" d="M'+x+' 5v'+len+' M'+x+' 117v-'+len+'"/>';}).join('');
  wave.innerHTML=ticks+'<path class="wave-mine" d="'+wavePath(mine)+'"/><path class="wave-visitor" d="'+wavePath(visitor)+'"/>'+mine.map((p,i)=>'<g class="wave-node" role="button" tabindex="0" data-index="'+i+'" data-correct="'+correct[i]+'" aria-controls="tacit-answer-'+(i+1)+'" aria-label="第 '+(i+1)+' 题，点击查看答案"><rect class="wave-hit" x="'+(p.x-27)+'" y="1" width="54" height="147"/><circle class="wave-dot" cx="'+p.x+'" cy="'+p.y+'" r="4"/>'+(correct[i]?'':'<circle class="wave-dot visitor" cx="'+p.x+'" cy="'+visitor[i].y+'" r="4"/>')+'<text x="'+p.x+'" y="139">'+String(i+1).padStart(2,'0')+'</text></g>').join('');
  nodes=[...wave.querySelectorAll<SVGGElement>('.wave-node')];
  nodes.forEach((node,i)=>{
   node.addEventListener('click',()=>locate(i));
   node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();locate(i);}else if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();nodes[(i+(event.key==='ArrowRight'?1:9))%10].focus();}});
   node.addEventListener('focus',()=>activate(i));
   node.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'&&mouse.matches)activate(i);});
  });
 }
 function finishFocus(){
  cancelAnimationFrame(animationFrame);clearTimeout(entryTimer);if(completed||!snapshot)return;completed=true;
  get('[data-score]').textContent=String(snapshot.score);card.style.setProperty('--focus-score',String(snapshot.score*10));result.classList.remove('is-focusing');details.inert=false;card.inert=false;
  get('[data-optical-status]').textContent='AF-C LOCKED';
  if(!mouse.matches&&!reduced.matches&&typeof navigator.vibrate==='function')navigator.vibrate(12);
  connectReview();exportButton.disabled=!analysis;get('[data-result-title]').focus({preventScroll:true});
 }
 async function analyse(){
  if(!currentImage||analysing)return;
  analysing=true;analysis=undefined;exportButton.disabled=true;retry.hidden=true;
  const token=generation,run=++analysisRun,image=currentImage;
  get('[data-analysis-state]').textContent='正在解析画面';
  let timeout:ReturnType<typeof setTimeout>|undefined;
  try{
   await Promise.race([image.decode(),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(Error('图片读取超时')),12000);})]);
   if(token!==generation||run!==analysisRun)return;
   const canvas=document.createElement('canvas');canvas.width=96;canvas.height=Math.max(1,Math.round(96*image.naturalHeight/image.naturalWidth));
   // Limit sampling on exceptionally tall images too.
   if(canvas.height>128){canvas.width=Math.max(1,Math.round(128*image.naturalWidth/image.naturalHeight));canvas.height=128;}
   const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('无法读取画面');ctx.drawImage(image,0,0,canvas.width,canvas.height);
   analysis=analysePixels(ctx.getImageData(0,0,canvas.width,canvas.height).data);
   if(snapshot)snapshot.analysis=analysis;
   const spectrum=get('[data-spectrum]');spectrum.replaceChildren();
   analysis.palette.forEach((color,i)=>{
    const button=document.createElement('button');button.type='button';button.className='optical-swatch';button.style.backgroundColor=color;button.setAttribute('aria-label',`第 ${i+1} 色，${color}`);button.setAttribute('aria-pressed','false');
    const label=document.createElement('span');label.textContent=color;button.append(label);
    const select=()=>{get('[data-color-value]').textContent=color;spectrum.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));};
    button.addEventListener('click',select);button.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')select();});button.addEventListener('focus',select);spectrum.append(button);
   });
   const {brightness,cool,warm,neutral,histogram,coolHistogram,warmHistogram,relativeEV}=analysis;
   get('[data-luma]').textContent=`${brightness} / 100`;
   const chart=root.querySelector<SVGSVGElement>('[data-histogram]')!;
   const peak=Math.max(1,...coolHistogram,...warmHistogram);
   chart.setAttribute('aria-label','冷暖加权亮度分布，平均亮度 '+brightness+'/100');
   chart.innerHTML='<path class="histogram-baseline" d="M0 80H260"/>'+[[coolHistogram,'cool'],[warmHistogram,'warm']].map(([bins,kind])=>'<path class="histogram-area '+kind+'" d="'+wavePath(histogramPoints(bins as number[],260,80,peak))+'L260 80H0Z"/>').join('');
   chart.dataset.bins=JSON.stringify(histogram);
   chart.dataset.coolBins=JSON.stringify(coolHistogram);chart.dataset.warmBins=JSON.stringify(warmHistogram);
   const ev=root.querySelector('[data-ev-pointer]')!;ev.setAttribute('transform',`translate(0 ${14+(2-relativeEV)/4*158-4})`);get('.relative-exposure').dataset.ready='true';
   get('[data-thermal]').style.background='linear-gradient(90deg,#537784 0%,#d6d8d1 50%,#B86B35 100%)';
   get('[data-thermal]').dataset.ready='true';get('[data-thermal]').style.setProperty('--temperature',`${50+(warm-cool)/2}%`);
   get('[data-thermal-label]').replaceChildren(...[[cool,'COOL'],[neutral,'NEUTRAL'],[warm,'WARM']].map(([value,label])=>{const span=document.createElement('span');span.textContent=`${value}% ${label}`;return span;}));
   get('[data-analysis-state]').textContent='PIXEL OK';exportButton.disabled=!completed;
  }catch{
   if(token!==generation||run!==analysisRun)return;
   get('[data-analysis-state]').textContent='暂未能读取画面，请重试';retry.hidden=false;
  }finally{clearTimeout(timeout);if(token===generation&&run===analysisRun)analysing=false;}
 }
 function present(input:{correct:boolean[];score:number;title:string;message:string;id:string;name:string}){
  reset();correct=input.correct;items=[...root.querySelectorAll<HTMLElement>('[data-review] li')];
  items.forEach((item,i)=>{
   item.id=`tacit-answer-${i+1}`;item.tabIndex=-1;item.dataset.correct=String(correct[i]);
   item.addEventListener('pointerenter',event=>{if(mouse.matches&&event.pointerType==='mouse')activate(i);});item.addEventListener('focusin',()=>activate(i));
  });
  const now=new Date(),date=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('');
  const id=`RF-${date}-${input.id.replaceAll('-','').slice(0,12).toUpperCase()}`;
  const timestamp=new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  get('[data-report-subject]').textContent=input.name?'SUBJECT / '+input.name:'';get('[data-report-id]').textContent=id;get('[data-report-time]').textContent=timestamp;get('[data-report-time]').setAttribute('datetime',now.toISOString());
  const tier=input.score>=8?2:input.score>=4?1:0,images=[...root.querySelectorAll<HTMLImageElement>('[data-match]')];
  currentImage=images.find(image=>Number(image.dataset.match)===tier)||images[0];images.forEach(image=>image.hidden=image!==currentImage);
  get('[data-spectrum]').replaceChildren();root.querySelector('[data-histogram]')!.replaceChildren();get('[data-luma]').textContent='— / 100';get('[data-thermal]').style.removeProperty('background');delete get('[data-thermal]').dataset.ready;delete get('.relative-exposure').dataset.ready;get('[data-thermal-label]').textContent='';get('[data-color-value]').textContent='选择色条，读取 HEX';
  const image=currentImage,photoTitle=image?.dataset.photoTitle||'',place=[image?.dataset.city,image?.dataset.photoDate?.slice(0,10)].filter(Boolean).join(' · '),archive=`FRAME ${String(tier+1).padStart(2,'0')}A`;
  get('[data-match-title]').textContent=photoTitle;get('[data-match-place]').textContent=place;get('[data-photo-archive]').textContent=archive;
  snapshot={...input,id,timestamp,image,photoTitle,place,archive};if(image)image.loading='eager';
  drawWave();const scores=dimensionScores(correct),vertices=radarPoints(scores,120,116,90),radar=root.querySelector<SVGSVGElement>('[data-radar]')!;
  radar.dataset.scores=JSON.stringify(scores);radar.setAttribute('aria-label',scores.map((v,i)=>`${['光影','偏爱','直觉'][i]} ${Math.round(v*100)}%`).join('，'));
  radar.innerHTML=[22.5,45,67.5,90].map(r=>`<circle class="radar-grid" cx="120" cy="116" r="${r}"/>`).join('')+radarPoints([1,1,1],120,116,90).map(p=>`<path class="radar-grid" d="M120 116L${p.x} ${p.y}"/>`).join('')+`<polygon class="radar-area" points="${vertices.map(p=>`${p.x},${p.y}`).join(' ')}"/>`+vertices.map(p=>`<circle class="radar-dot" cx="${p.x}" cy="${p.y}" r="2"/>`).join('')+[[120,15],[40,218],[200,218]].map(([x,y],i)=>`<text x="${x}" y="${y}"><tspan class="radar-cn">${['光影','偏爱','直觉'][i]}</tspan> ${Math.round(scores[i]*100)}%</text>`).join('');
  get('[data-score]').textContent=reduced.matches?String(input.score):'0';
  if(reduced.matches)finishFocus();else{
   result.classList.add('is-focusing');details.inert=true;card.inert=true;get('[data-optical-status]').textContent='测光 · 解析共鸣';card.style.setProperty('--focus-score','0');
   const start=performance.now(),token=generation;
   const tick=(time:number)=>{if(token!==generation)return;const p=Math.max(0,Math.min(1,(time-start)/800)),value=(1-(1-p)**3)*input.score;get('[data-score]').textContent=String(Math.min(input.score,Math.floor(value)));card.style.setProperty('--focus-score',String(value*10));if(p<1)animationFrame=requestAnimationFrame(tick);};
   animationFrame=requestAnimationFrame(tick);entryTimer=window.setTimeout(finishFocus,1050);
  }
  void analyse();
 }
 retry.addEventListener('click',()=>{if(currentImage){const src=currentImage.currentSrc||currentImage.src;currentImage.src=src;}void analyse();});
 card.addEventListener('pointermove',event=>{
  if(!completed||!mouse.matches||reduced.matches||event.pointerType!=='mouse'||tiltFrame)return;
  const x=event.clientX,y=event.clientY;tiltFrame=requestAnimationFrame(()=>{tiltFrame=0;const r=card.getBoundingClientRect();card.style.setProperty('--rx',`${-(y-r.top-r.height/2)/r.height*1.2}deg`);card.style.setProperty('--ry',`${(x-r.left-r.width/2)/r.width*1.2}deg`);});
 });
 card.addEventListener('pointerleave',resetTilt);window.addEventListener('blur',resetTilt);mouse.addEventListener('change',()=>{resetTilt();connectReview();});
 reduced.addEventListener('change',()=>{resetTilt();if(reduced.matches)finishFocus();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)resetTilt();});
 get('[data-preview-close]').addEventListener('click',()=>preview.close());preview.addEventListener('click',event=>{if(event.target===preview)preview.close();});
 preview.addEventListener('close',()=>{if(!preview.open){releaseUrls();exportButton.focus({preventScroll:true});}});
 exportButton.addEventListener('click',async()=>{
  if(!snapshot||!analysis||!completed)return;
  const token=generation,current={...snapshot,analysis},mobile=!mouse.matches;exportButton.disabled=true;exportButton.textContent='正在生成…';get('[data-export-status]').textContent='';
  releaseUrls();if(mobile){get('[data-preview-hint]').textContent='正在生成高清图片…';get('[data-preview-download]').hidden=true;preview.showModal();}
  try{
   const {renderReport}=await import('./report-export');const blob=await renderReport(current,card);
   if(token!==generation)return;
   if(mobile&&!preview.open)return;
   const url=URL.createObjectURL(blob);urls.push(url);const filename=current.id+'.png';
   if(mobile){previewImage.src=url;previewImage.hidden=false;const download=get<HTMLAnchorElement>('[data-preview-download]');download.href=url;download.download=filename;download.hidden=false;get('[data-preview-hint]').textContent='长按保存图片，也可以使用下方下载按钮。';}
   else{const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();}
  }catch{
   if(token!==generation)return;
   get('[data-export-status]').textContent='报告暂未生成，请稍后重试。';if(mobile&&preview.open)get('[data-preview-hint]').textContent='报告暂未生成，请关闭后重试。';
  }finally{if(token===generation){exportButton.disabled=false;exportButton.textContent='导出测光报告';}}
 });
 window.addEventListener('pagehide',()=>{cancelAnimationFrame(animationFrame);clearTimeout(entryTimer);resetTilt();observer?.disconnect();releaseUrls();if(preview.open)preview.close();});
 window.addEventListener('pageshow',event=>{if(event.persisted){finishFocus();connectReview();}});
 return {present,reset};
}
