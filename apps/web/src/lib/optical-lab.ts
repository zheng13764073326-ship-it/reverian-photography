import {setupAICreations} from './ai-creations';
import {AI_PROMPTS_PATH,PROMPT_SEARCH_THRESHOLD,matchesPromptSearch} from './ai-prompt-catalog';
import introductions from '../data/lab/introductions.json';

export function setupOpticalLab(root:HTMLElement) {
  const links=[...document.querySelectorAll<HTMLAnchorElement>('[data-lab-link]')];
  const panels=[...root.querySelectorAll<HTMLElement>('[data-lab-panel]')];
  const heading=root.querySelector<HTMLElement>('[data-lab-title]')!;
  const subtitle=root.querySelector<HTMLElement>('[data-lab-subtitle]')!;
  const titleSuffix=document.title.slice(document.title.indexOf(' — '));
  const filters=[...root.querySelectorAll<HTMLButtonElement>('[data-prompt-filter]')];
  const prompts=[...root.querySelectorAll<HTMLElement>('[data-prompt-category]')];
  const total=root.querySelector<HTMLElement>('[data-lab-count]')!;
  const searchToggle=root.querySelector<HTMLButtonElement>('[data-prompt-search-toggle]')!;
  const searchPanel=root.querySelector<HTMLElement>('[data-prompt-search-panel]')!;
  const search=root.querySelector<HTMLInputElement>('[data-prompt-search]')!;
  const empty=root.querySelector<HTMLElement>('[data-prompt-empty]')!;
  const aiGallery=setupAICreations(root);
  let activeTab='guides',category='all',query='';
  let weather:Promise<{ensure:()=>void}>|undefined;
  let critique:Promise<unknown>|undefined;
  total.textContent=`· 已收录 ${prompts.length} 组`;
  searchToggle.hidden=prompts.length<PROMPT_SEARCH_THRESHOLD;
  function writeLocation(replace=false){
    const url=new URL(location.href);
    url.pathname=activeTab==='ai'?AI_PROMPTS_PATH:'/lab/';
    if(activeTab==='ai'||activeTab==='guides')url.searchParams.delete('tab');else url.searchParams.set('tab',activeTab);
    if(activeTab==='ai'&&category!=='all')url.searchParams.set('use',category);else url.searchParams.delete('use');
    if(activeTab==='ai'&&query)url.searchParams.set('q',query);else url.searchParams.delete('q');
    if(url.href!==location.href)history[replace?'replaceState':'pushState'](null,'',url);
  }
  function activate(id:string,write=false) {
    activeTab=id;
    const activeLink=links.find(link=>link.dataset.labLink===id)!;
    const title=activeLink.dataset.labLabel||activeLink.textContent!.trim();
    const description=introductions[id as keyof typeof introductions] || introductions.guides;
    root.dataset.activeTab=id;total.hidden=id!=='ai';
    if(id!=='ai')aiGallery.close();
    heading.textContent=title;subtitle.textContent=description;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content',description);
    document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute('content',description);
    document.title=title+titleSuffix;
    document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content',document.title);
    const canonical=new URL(id==='ai'?AI_PROMPTS_PATH:'/lab/',location.origin).href;
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href',canonical);
    document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content',canonical);
    links.forEach(link=>{if(link.dataset.labLink===id)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    panels.forEach(panel=>{panel.hidden=panel.dataset.labPanel!==id;});
    aiGallery.layout();
    if(write){if(id!=='ai'){query='';search.value='';filter('all');}writeLocation();}
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
    category=id;
    filters.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.promptFilter===id)));
    prompts.forEach(card=>{card.hidden=(id!=='all'&&card.dataset.promptCategory!==id)||!matchesPromptSearch(card.dataset.promptSearchText||'',query);});
    const visible=prompts.filter(card=>!card.hidden).length;
    root.querySelector<HTMLElement>('[data-prompt-count]')!.textContent=`${visible} 组创作`;
    empty.hidden=visible>0;aiGallery.layout();
    if(write)writeLocation();
  }
  function setSearchOpen(open:boolean){searchPanel.hidden=!open;searchToggle.setAttribute('aria-expanded',String(open));}
  function restore() {
    const params=new URL(location.href).searchParams;
    const tab=location.pathname===AI_PROMPTS_PATH?'ai':params.get('tab'),use=params.get('use');
    activate(links.some(link=>link.dataset.labLink===tab)?tab!:'guides');
    query=params.get('q')?.slice(0,100).trim()||'';search.value=query;
    searchToggle.hidden=prompts.length<PROMPT_SEARCH_THRESHOLD&&!query;
    setSearchOpen(Boolean(query));
    filter(filters.some(button=>button.dataset.promptFilter===use)?use!:'all');
    // Keep shared query URLs working while presenting a clean, canonical AI path.
    if(activeTab==='ai')writeLocation(true);
  }
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const link=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[data-lab-link]'):null;
    if(!link||link.origin!==location.origin||!['/lab/',AI_PROMPTS_PATH].includes(link.pathname))return;
    event.preventDefault();activate(link.dataset.labLink!,true);
    const panelHeading=panels.find(panel=>!panel.hidden)?.querySelector<HTMLElement>('h2');
    if(panelHeading){panelHeading.tabIndex=-1;panelHeading.focus({preventScroll:true});}
    window.scrollTo({top:0,behavior:'auto'});
  });
  filters.forEach(button=>button.addEventListener('click',()=>filter(button.dataset.promptFilter!,true)));
  searchToggle.addEventListener('click',()=>{setSearchOpen(searchPanel.hidden);if(!searchPanel.hidden)search.focus();});
  search.addEventListener('input',()=>{if(search.matches(':disabled'))return;query=search.value.slice(0,100).trim();filter(category);writeLocation(true);});
  root.querySelector('[data-prompt-search-clear]')!.addEventListener('click',()=>{query='';search.value='';filter(category);writeLocation(true);search.focus();});
  root.querySelector('[data-prompt-reset]')!.addEventListener('click',()=>{query='';search.value='';filter('all',true);});

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
