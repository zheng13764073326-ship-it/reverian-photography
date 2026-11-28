export function setupCameraGuide(root:HTMLElement){
 const all=<T extends Element=HTMLElement>(selector:string)=>[...root.querySelectorAll<T>(selector)];
 all<HTMLImageElement>('[data-camera-image]').forEach(img=>{
  const wrapper=img.closest<HTMLElement>('[data-product-image]')!;
  const message=wrapper.querySelector<HTMLElement>('[data-product-error]')!;
  const retry=wrapper.querySelector<HTMLButtonElement>('[data-image-retry]')!;
  const failed=()=>{img.hidden=true;message.hidden=false;retry.disabled=false;retry.textContent='重新加载照片'};
  img.addEventListener('error',failed);
  img.addEventListener('load',()=>{img.hidden=false;message.hidden=true;retry.disabled=false;retry.textContent='重新加载照片'});
  retry.addEventListener('click',()=>{retry.disabled=true;retry.textContent='正在加载…';img.loading='eager';img.src=img.dataset.photoSrc+'&retry='+Date.now()});
  if(img.complete&&img.naturalWidth===0)failed();
 });
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function revealInStrip(item:HTMLElement,strip:HTMLElement){const left=item.getBoundingClientRect().left-strip.getBoundingClientRect().left;if(left<0)strip.scrollLeft+=left-8;else if(left+item.offsetWidth>strip.clientWidth)strip.scrollLeft+=left+item.offsetWidth-strip.clientWidth+8;}
 const sensorControls=all<HTMLElement>('[data-sensor]');
 function selectSensor(id:string){sensorControls.forEach(el=>{const selected=el.dataset.sensor===id;el.classList.toggle('is-active',selected);el.setAttribute('aria-pressed',String(selected));});all<HTMLElement>('[data-sensor-panel]').forEach(p=>p.hidden=p.dataset.sensorPanel!==id);}
 sensorControls.forEach(el=>{el.addEventListener('click',()=>selectSensor(el.dataset.sensor!));el.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&el.tagName.toLowerCase()==='rect')selectSensor(el.dataset.sensor!)});el.addEventListener('keydown',e=>{if(el.tagName.toLowerCase()==='rect'&&['Enter',' '].includes(e.key)){e.preventDefault();selectSensor(el.dataset.sensor!)}});});
 const genreTabs=all<HTMLButtonElement>('[data-genre]');
 function selectGenre(id:string){genreTabs.forEach(t=>{const active=t.dataset.genre===id;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1});all<HTMLElement>('[data-genre-panel]').forEach(p=>p.hidden=p.dataset.genrePanel!==id);}
 genreTabs.forEach((tab,i)=>{tab.addEventListener('click',()=>selectGenre(tab.dataset.genre!));tab.addEventListener('keydown',e=>{let n:number;if(e.key==='ArrowRight')n=(i+1)%genreTabs.length;else if(e.key==='ArrowLeft')n=(i-1+genreTabs.length)%genreTabs.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=genreTabs.length-1;else return;e.preventDefault();selectGenre(genreTabs[n].dataset.genre!);genreTabs[n].focus();});});
 let tier='1k-3k',condition='all';
 const panels=all<HTMLElement>('[data-budget-panel]'),conditions=all<HTMLButtonElement>('[data-condition]');
 const evf=root.querySelector<HTMLInputElement>('[data-evf]')!;
 const filters=root.querySelector<HTMLElement>('[data-camera-filters]')!;
 const countLabel=root.querySelector<HTMLElement>('[data-camera-count]')!;
 function filter(){
  const models=new Set<string>();
  for(const panel of panels){
   panel.hidden=panel.dataset.budgetPanel!==tier;
   if(panel.hidden)continue;
   for(const card of panel.querySelectorAll<HTMLElement>('[data-camera-card]')){
    card.hidden=(condition!=='all' && card.dataset.conditionValue!==condition) || (evf.checked && card.dataset.hasEvf!=='true');
    if(!card.hidden)models.add(card.dataset.cameraId!);
   }
   const empty=panel.querySelector<HTMLElement>('[data-empty]');
   if(empty)empty.hidden=models.size>0;
  }
  conditions.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.condition===condition)));
  countLabel.textContent=`${models.size} 款`;
 }
 function selectTier(id:string){
  if(!panels.some(p=>p.dataset.budgetPanel===id))return;
  tier=id;
  for(const link of all<HTMLAnchorElement>('[data-budget-link]')){
   if(link.dataset.budgetLink===id){
    link.setAttribute('aria-current','true');
    if(link.parentElement?.classList.contains('cg-budget-tabs'))revealInStrip(link,link.parentElement);
   }else link.removeAttribute('aria-current');
  }
  filters.hidden=id==='12k+';
  filter();
 }
 function fromHash(){let id=location.hash.slice(1);try{id=decodeURIComponent(id);}catch{return;}if(id.startsWith('budget-'))selectTier(id.slice(7));}
 all<HTMLAnchorElement>('[data-budget-link]').forEach(link=>link.addEventListener('click',event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();const id=link.dataset.budgetLink!;selectTier(id);if(location.hash!==link.hash)history.pushState(null,'',link.hash);const destination=link.closest('.cg-subnav')?root.querySelector('#budget'):root.querySelector('.cg-budget-tabs');destination?.scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});}));
 conditions.forEach(b=>b.addEventListener('click',()=>{condition=b.dataset.condition!;filter()}));evf.addEventListener('change',filter);
 window.addEventListener('hashchange',fromHash);window.addEventListener('popstate',fromHash);fromHash();filter();
 if(location.hash.startsWith('#budget-'))requestAnimationFrame(()=>root.querySelector('#budget')?.scrollIntoView({block:'start',behavior:'instant'}));
 const checks=all<HTMLInputElement>('[data-check-id]'),key='reverian_guide01_checklist_v1';
 const storageStatus=root.querySelector<HTMLElement>('[data-storage-status]')!;
 function updateChecks(){const count=checks.filter(c=>c.checked).length;root.querySelector<HTMLElement>('[data-check-count]')!.textContent=`已完成 ${count} / ${checks.length}`;const progress=root.querySelector<HTMLProgressElement>('[data-check-progress]')!;progress.max=checks.length;progress.value=count;}
 function save(){try{localStorage.setItem(key,JSON.stringify(checks.filter(c=>c.checked).map(c=>c.dataset.checkId)));}catch{storageStatus.textContent='当前浏览器无法保存进度，本次勾选仍然有效。';}updateChecks();}
 try{const saved:unknown=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))checks.forEach(c=>c.checked=saved.includes(c.dataset.checkId));}catch{storageStatus.textContent='未读取到保存的进度，可以从头开始检查。';}
 checks.forEach(c=>c.addEventListener('change',save));root.querySelector('[data-check-reset]')!.addEventListener('click',()=>{checks.forEach(c=>c.checked=false);save()});updateChecks();
 const header = document.querySelector<HTMLElement>('.site-header');
 const toc = root.querySelector<HTMLElement>('.cg-toc')!;
 const chapters = all<HTMLElement>('.cg-section');
 const links = all<HTMLAnchorElement>('[data-chapter-link]');
 const progress = root.querySelector<HTMLElement>('[data-reading-progress]')!;
 let activationLine = 0;
 let lastChapter = '';
 let queued = false;

 function updateChapter() {
  queued = false;
  const end = Math.max(1, root.offsetTop + root.offsetHeight - innerHeight);
  progress.style.transform = `scaleX(${Math.min(1, Math.max(0, scrollY / end))})`;

  let active = chapters[0];
  for (const chapter of chapters) {
   if (chapter.getBoundingClientRect().top > activationLine) break;
   active = chapter;
  }
  if (active.id === lastChapter) return;
  lastChapter = active.id;
  for (const link of links) {
   if (link.dataset.chapterLink === active.id) {
    link.setAttribute('aria-current', 'location');
    if (toc.scrollWidth > toc.clientWidth) revealInStrip(link, toc);
   } else {
    link.removeAttribute('aria-current');
   }
  }
 }

 function schedule() {
  if (!queued) {
   queued = true;
   requestAnimationFrame(updateChapter);
  }
 }

 function measureNavigation() {
  if (header) root.style.setProperty('--guide-header', `${header.getBoundingClientRect().height}px`);
  root.style.setProperty('--guide-toc-height', `${toc.getBoundingClientRect().height}px`);
  // Native fragment jumps include both the scrollport padding and the target margin.
  // Allow one CSS pixel for fractional landing positions at non-integer zoom levels.
  const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const margin = parseFloat(getComputedStyle(chapters[0]).scrollMarginTop) || 0;
  activationLine = padding + margin + 1;
  lastChapter = '';
  schedule();
 }

 measureNavigation();
 const observer = new ResizeObserver(measureNavigation);
 if (header) observer.observe(header);
 observer.observe(toc);
 window.addEventListener('resize', measureNavigation);
 window.addEventListener('scroll', schedule, {passive:true});
}
