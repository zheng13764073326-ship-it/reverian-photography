import {setupAICreations} from './ai-creations';
import introductions from '../data/lab/introductions.json';

export function setupOpticalLab(root:HTMLElement) {
  const links=[...document.querySelectorAll<HTMLAnchorElement>('[data-lab-link]')];
  const panels=[...root.querySelectorAll<HTMLElement>('[data-lab-panel]')];
  const heading=root.querySelector<HTMLElement>('[data-lab-title]')!;
  const subtitle=root.querySelector<HTMLElement>('[data-lab-subtitle]')!;
  const titleSuffix=document.title.slice(document.title.indexOf(' — '));
  const filters=[...root.querySelectorAll<HTMLButtonElement>('[data-prompt-filter]')];
  const prompts=[...root.querySelectorAll<HTMLElement>('[data-prompt-category]')];
  const aiGallery=setupAICreations(root);
  let weather:Promise<{ensure:()=>void}>|undefined;
  let critique:Promise<unknown>|undefined;
  function activate(id:string,write=false) {
    const activeLink=links.find(link=>link.dataset.labLink===id)!;
    const title=activeLink.dataset.labLabel||activeLink.textContent!.trim();
    const description=introductions[id as keyof typeof introductions] || introductions.guides;
    root.dataset.activeTab=id;
    if(id!=='ai')aiGallery.close();
    heading.textContent=title;
    subtitle.textContent=description;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content',description);
    document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute('content',description);
    document.title=title+titleSuffix;
    document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content',document.title);
    links.forEach(link=>{if(link.dataset.labLink===id)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    panels.forEach(panel=>{panel.hidden=panel.dataset.labPanel!==id;});
    aiGallery.layout();
    if(write){const url=new URL(location.href);if(id==='guides')url.searchParams.delete('tab');else url.searchParams.set('tab',id);history.pushState(null,'',url);}
    if(id==='critique'){
      critique??=import('./lab-critique').then(module=>module.setupLabCritique(root.querySelector<HTMLElement>('[data-darkroom]')!));
      void critique.catch(()=>{critique=undefined;root.querySelector<HTMLElement>('[data-critique-status]')!.textContent='暗房模块暂未加载，请重新选择栏目或刷新。';});
    }
    if(id==='sunset'){
      weather??=import('./lab-weather').then(module=>module.setupLabWeather(root.querySelector<HTMLElement>('[data-lab-panel="sunset"]')!));
      void weather.then(controller=>controller.ensure()).catch(()=>{
        weather=undefined;root.querySelector<HTMLElement>('[data-weather-status]')!.textContent='观测模块暂未加载，请重新选择火烧云栏目或刷新页面。';
      });
    }
  }
  function filter(id:string,write=false) {
    filters.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.promptFilter===id)));
    prompts.forEach(card=>{card.hidden=id!=='all'&&card.dataset.promptCategory!==id;});
    root.querySelector<HTMLElement>('[data-prompt-count]')!.textContent=`${prompts.filter(card=>!card.hidden).length} 组创作`;
    aiGallery.layout();
    if(write){const url=new URL(location.href);if(id==='all')url.searchParams.delete('use');else url.searchParams.set('use',id);history.pushState(null,'',url);}
  }
  function restore() {
    const params=new URL(location.href).searchParams,tab=params.get('tab'),use=params.get('use');
    activate(links.some(link=>link.dataset.labLink===tab)?tab!:'guides');
    filter(filters.some(button=>button.dataset.promptFilter===use)?use!:'all');
  }
  // These are ordinary links on other pages; only the current lab view switches in place.
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const link=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[data-lab-link]'):null;
    if(!link||link.origin!==location.origin||link.pathname!==location.pathname)return;
    event.preventDefault();
    activate(link.dataset.labLink!,true);
    const heading=panels.find(panel=>!panel.hidden)?.querySelector<HTMLElement>('h2');
    if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
    window.scrollTo({top:0,behavior:'auto'});
  });
  filters.forEach(button=>button.addEventListener('click',()=>filter(button.dataset.promptFilter!,true)));

  const reader=root.querySelector<HTMLDialogElement>('#lab-reader')!;
  let returnFocus:HTMLElement|null=null,overflow='';
  root.querySelectorAll<HTMLButtonElement>('[data-guide]').forEach(button=>button.addEventListener('click',()=>{
    const template=root.querySelector<HTMLTemplateElement>(`[data-guide-template="${button.dataset.guide}"]`)!;
    root.querySelector('[data-reader-index]')!.textContent='GUIDE '+template.dataset.index;
    root.querySelector('[data-reader-tag]')!.textContent=template.dataset.tag!;
    root.querySelector('#lab-reader-title')!.textContent=template.dataset.title!;
    root.querySelector('[data-reader-body]')!.replaceChildren(template.content.cloneNode(true));
    returnFocus=button;overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    reader.showModal();root.querySelector('.lab-reader-scroll')!.scrollTop=0;
  }));
  root.querySelector('[data-reader-close]')!.addEventListener('click',()=>reader.close());
  let outsideDown=false;
  const outside=(event:MouseEvent)=>{const rect=reader.getBoundingClientRect();return event.target===reader&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom);};
  reader.addEventListener('pointerdown',event=>{outsideDown=outside(event);});
  reader.addEventListener('click',event=>{if(outsideDown&&outside(event))reader.close();outsideDown=false;});
  reader.addEventListener('close',()=>{document.body.style.overflow=overflow;if(returnFocus&&!returnFocus.closest('[hidden]'))returnFocus.focus({preventScroll:true});});
  window.addEventListener('popstate',()=>{if(reader.open)reader.close();aiGallery.close();restore();});

  restore();
}
