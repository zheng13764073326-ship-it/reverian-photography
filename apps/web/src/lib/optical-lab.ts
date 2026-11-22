export function setupOpticalLab(root:HTMLElement) {
  const tabs=[...root.querySelectorAll<HTMLButtonElement>('[data-lab-tab]')];
  const panels=[...root.querySelectorAll<HTMLElement>('[data-lab-panel]')];
  const filters=[...root.querySelectorAll<HTMLButtonElement>('[data-prompt-filter]')];
  const prompts=[...root.querySelectorAll<HTMLElement>('[data-prompt-category]')];
  let weather:Promise<{ensure:()=>void}>|undefined;
  function activate(id:string,write=false) {
    tabs.forEach(tab=>{const selected=tab.dataset.labTab===id;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
    panels.forEach(panel=>{panel.hidden=panel.dataset.labPanel!==id;});
    if(write){const url=new URL(location.href);if(id==='guides')url.searchParams.delete('tab');else url.searchParams.set('tab',id);history.pushState(null,'',url);}
    if(id==='sunset'){
      weather??=import('./lab-weather').then(module=>module.setupLabWeather(root.querySelector<HTMLElement>('[data-lab-panel="sunset"]')!));
      void weather.then(controller=>controller.ensure()).catch(()=>{
        weather=undefined;root.querySelector<HTMLElement>('[data-weather-status]')!.textContent='观测模块暂未加载，请重新选择火烧云页签或刷新页面。';
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
    activate(tabs.some(button=>button.dataset.labTab===tab)?tab!:'guides');
    filter(filters.some(button=>button.dataset.promptFilter===use)?use!:'all');
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>activate(tab.dataset.labTab!,true));
    tab.addEventListener('keydown',event=>{
      const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:-1;
      if(next<0)return;event.preventDefault();tabs[next].focus();activate(tabs[next].dataset.labTab!,true);
    });
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
