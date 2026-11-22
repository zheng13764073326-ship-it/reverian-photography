import introductions from '../data/lab/introductions.json';

export function setupOpticalLab(root:HTMLElement) {
  const links=[...document.querySelectorAll<HTMLAnchorElement>('[data-lab-link]')];
  const panels=[...root.querySelectorAll<HTMLElement>('[data-lab-panel]')];
  const heading=root.querySelector<HTMLElement>('[data-lab-title]')!;
  const subtitle=root.querySelector<HTMLElement>('[data-lab-subtitle]')!;
  const titleSuffix=document.title.slice(document.title.indexOf(' — '));
  const filters=[...root.querySelectorAll<HTMLButtonElement>('[data-prompt-filter]')];
  const prompts=[...root.querySelectorAll<HTMLElement>('[data-prompt-category]')];
  let weather:Promise<{ensure:()=>void}>|undefined;
  function activate(id:string,write=false) {
    const title=links.find(link=>link.dataset.labLink===id)!.textContent!.trim();
    const description=introductions[id as keyof typeof introductions] || introductions.guides;
    heading.textContent=title;
    subtitle.textContent=description;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content',description);
    document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute('content',description);
    document.title=title+titleSuffix;
    document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content',document.title);
    links.forEach(link=>{if(link.dataset.labLink===id)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    panels.forEach(panel=>{panel.hidden=panel.dataset.labPanel!==id;});
    if(write){const url=new URL(location.href);if(id==='guides')url.searchParams.delete('tab');else url.searchParams.set('tab',id);history.pushState(null,'',url);}
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
    root.querySelector<HTMLElement>('[data-prompt-count]')!.textContent=`${prompts.filter(card=>!card.hidden).length} 条提示词`;
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
  window.addEventListener('popstate',()=>{if(reader.open)reader.close();restore();});

  root.querySelectorAll<HTMLButtonElement>('[data-copy-prompt]').forEach(button=>{
    const card=button.closest('.lab-prompt-card')!,code=card.querySelector<HTMLElement>('code')!;
    const label=button.querySelector('span')!,dot=button.querySelector('i')!,status=card.querySelector<HTMLElement>('.lab-copy-status')!;
    let reset:ReturnType<typeof setTimeout>|undefined;
    button.addEventListener('click',async()=>{
      clearTimeout(reset);button.disabled=true;label.textContent='正在复制…';status.textContent='';delete button.dataset.copied;dot.hidden=true;
      try {
        if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
        await navigator.clipboard.writeText(code.textContent||'');
        button.dataset.copied='true';label.textContent='已复制 ✓';dot.hidden=false;status.textContent='提示词已复制。';
        reset=setTimeout(()=>{delete button.dataset.copied;label.textContent='复制提示词';dot.hidden=true;status.textContent='';},1500);
      } catch {
        label.textContent='复制提示词';status.textContent='未能复制，请长按或选中文字复制。';
        const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(code);selection?.removeAllRanges();selection?.addRange(range);
        card.querySelector<HTMLElement>('pre')!.focus({preventScroll:true});
      } finally {button.disabled=false;}
    });
  });
  restore();
}
