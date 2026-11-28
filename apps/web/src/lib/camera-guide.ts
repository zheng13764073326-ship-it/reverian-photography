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
 function filter(){
  let count=0;
  panels.forEach(p=>{p.hidden=p.dataset.budgetPanel!==tier;if(p.hidden)return;const cards=[...p.querySelectorAll<HTMLElement>('[data-camera-card]')];cards.forEach(card=>{card.hidden=(condition!=='all'&&card.dataset.conditionValue!==condition)||(evf.checked&&card.dataset.hasEvf!=='true');if(!card.hidden)count++;});const empty=p.querySelector<HTMLElement>('[data-empty]');if(empty)empty.hidden=count>0;});
  conditions.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.condition===condition)));
  root.querySelector<HTMLElement>('[data-camera-count]')!.textContent=tier==='12k+'?'专业系统参考 · 按实际创作瓶颈选择':`${count} 个候选 · 镜头与配件另留预算`;
 }
 function selectTier(id:string){if(!panels.some(p=>p.dataset.budgetPanel===id))return;tier=id;all<HTMLAnchorElement>('[data-budget-link]').forEach(a=>{if(a.dataset.budgetLink===id){a.setAttribute('aria-current','true');if(a.parentElement?.classList.contains('cg-budget-tabs'))revealInStrip(a,a.parentElement);}else a.removeAttribute('aria-current')});const high=id==='12k+';root.querySelector<HTMLElement>('[data-camera-filters]')!.hidden=high;root.querySelector<HTMLElement>('[data-filter-note]')!.hidden=high;filter();}
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
 // Keep anchors below the existing navigation at every screen size.
 const header=document.querySelector<HTMLElement>('.site-header');
 const resize=()=>{if(header)root.style.setProperty('--guide-header',`${Math.round(header.getBoundingClientRect().height)}px`)};
 if(header)new ResizeObserver(resize).observe(header);resize();
 const chapters=all<HTMLElement>('.cg-section'),links=all<HTMLAnchorElement>('[data-chapter-link]');
 let queued=false,lastChapter='';
 function scroll(){queued=false;const top=window.scrollY,end=Math.max(1,root.offsetTop+root.offsetHeight-innerHeight);root.querySelector<HTMLElement>('[data-reading-progress]')!.style.transform=`scaleX(${Math.min(1,Math.max(0,top/end))})`;const offset=(header?.getBoundingClientRect().height||80)+(innerWidth<1024?100:40);let active=chapters[0].id;for(const c of chapters){if(c.getBoundingClientRect().top<=offset)active=c.id;}links.forEach(link=>{if(link.dataset.chapterLink===active){link.setAttribute('aria-current','location');if(active!==lastChapter&&innerWidth<1024)revealInStrip(link,root.querySelector<HTMLElement>('.cg-toc')!);}else link.removeAttribute('aria-current')});lastChapter=active;}
 const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(scroll)}};
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);scroll();
}
