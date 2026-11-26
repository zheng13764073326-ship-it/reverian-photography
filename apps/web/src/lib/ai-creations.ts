export function setupAICreations(root:HTMLElement) {
  const grid=root.querySelector<HTMLElement>('#lab-prompt-grid')!;
  const cards=[...grid.querySelectorAll<HTMLElement>('.lab-prompt-card')];
  const desktop=matchMedia('(min-width:801px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
  let layoutFrame=0;
  function layout(){
    cancelAnimationFrame(layoutFrame);
    layoutFrame=requestAnimationFrame(()=>{
      grid.toggleAttribute('data-masonry',desktop.matches);
      cards.forEach(card=>{
        if(desktop.matches&&!card.hidden){
          const height=card.querySelector<HTMLElement>('.lab-creation-card-body')!.getBoundingClientRect().height;
          if(height)card.style.gridRowEnd=`span ${Math.ceil(height/8)}`;
        }else card.style.removeProperty('grid-row-end');
      });
    });
  }
  const observer=new ResizeObserver(layout);
  cards.forEach(card=>observer.observe(card.querySelector('.lab-creation-card-body')!));
  desktop.addEventListener('change',layout);
  void document.fonts.ready.then(layout);

  cards.forEach(card=>{
    const links=[...card.querySelectorAll<HTMLAnchorElement>('[data-creation-image]')];
    const switches=[...card.querySelectorAll<HTMLButtonElement>('[data-creation-view]')];
    const stage=card.querySelector<HTMLElement>('.lab-art-stage')!,status=card.querySelector<HTMLElement>('.lab-art-status')!;
    let request=0,notice:ReturnType<typeof setTimeout>|undefined;
    switches.forEach(button=>button.addEventListener('click',async()=>{
      const token=++request,kind=button.dataset.creationView!;
      const target=links.find(link=>link.dataset.creationImage===kind)!,image=target.querySelector('img')!;
      clearTimeout(notice);status.hidden=true;stage.setAttribute('aria-busy','true');
      notice=setTimeout(()=>{if(token===request){status.textContent='图片载入中…';status.hidden=false;}},450);
      try{
        await image.decode();
        if(token!==request)return;
        links.forEach(link=>{const active=link===target;link.dataset.active=String(active);link.inert=!active;link.tabIndex=active?0:-1;if(active)link.removeAttribute('aria-hidden');else link.setAttribute('aria-hidden','true');});
        switches.forEach(control=>control.setAttribute('aria-pressed',String(control===button)));
        status.hidden=true;
      }catch{
        if(token!==request)return;
        status.textContent='图片暂未载入，请再点一次重试。';status.hidden=false;
      }finally{if(token===request){clearTimeout(notice);stage.removeAttribute('aria-busy');}}
    }));
  });

  const dialog=root.querySelector<HTMLDialogElement>('#lab-prompt-drawer')!;
  const body=dialog.querySelector<HTMLElement>('[data-prompt-body]')!;
  const title=dialog.querySelector<HTMLElement>('#lab-prompt-title')!;
  const copy=dialog.querySelector<HTMLButtonElement>('[data-copy-prompt]')!;
  const status=dialog.querySelector<HTMLElement>('.lab-prompt-status')!;
  let opener:HTMLElement|null=null,overflow='',prompt='',session=0;
  let closeTimer:ReturnType<typeof setTimeout>|undefined,copyTimer:ReturnType<typeof setTimeout>|undefined;
  function close(immediate=false){
    if(!dialog.open)return;
    clearTimeout(closeTimer);
    if(immediate||reduced.matches)dialog.close();
    else{dialog.classList.add('is-closing');closeTimer=setTimeout(()=>dialog.close(),220);}
  }
  root.querySelectorAll<HTMLButtonElement>('[data-open-prompt]').forEach(button=>button.addEventListener('click',()=>{
    if(dialog.open)return;
    const template=root.querySelector<HTMLTemplateElement>(`[data-prompt-template="${button.dataset.openPrompt}"]`)!;
    clearTimeout(closeTimer);clearTimeout(copyTimer);session++;
    opener=button;prompt=template.dataset.prompt!;title.textContent=template.dataset.title!;
    body.replaceChildren(template.content.cloneNode(true));
    delete copy.dataset.copied;copy.disabled=false;copy.textContent='一键复制提示词';status.textContent='';dialog.classList.remove('is-closing');
    overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    dialog.showModal();body.scrollTop=0;copy.focus({preventScroll:true});
  }));
  dialog.querySelector('[data-prompt-close]')!.addEventListener('click',()=>close());
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  let outsideDown=false;
  const outside=(event:MouseEvent)=>{const rect=dialog.getBoundingClientRect();return event.target===dialog&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom);};
  dialog.addEventListener('pointerdown',event=>{outsideDown=outside(event);});
  dialog.addEventListener('click',event=>{if(outsideDown&&outside(event))close();outsideDown=false;});
  dialog.addEventListener('close',()=>{
    if(dialog.open)return;
    session++;clearTimeout(closeTimer);clearTimeout(copyTimer);dialog.classList.remove('is-closing');document.body.style.overflow=overflow;
    if(opener&&!opener.closest('[hidden]'))opener.focus({preventScroll:true});
  });
  copy.addEventListener('click',async()=>{
    const token=session;clearTimeout(copyTimer);copy.disabled=true;copy.textContent='正在复制…';delete copy.dataset.copied;status.textContent='';
    try{
      if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(prompt);
      if(token!==session||!dialog.open)return;
      copy.dataset.copied='true';copy.textContent='已复制 ✓';status.textContent='完整提示词已复制。';
      copyTimer=setTimeout(()=>{delete copy.dataset.copied;copy.textContent='一键复制提示词';status.textContent='';},2000);
    }catch{
      if(token!==session||!dialog.open)return;
      copy.textContent='一键复制提示词';status.textContent='未能复制，请长按或选中文字复制。';
      body.focus({preventScroll:true});const range=document.createRange(),selection=getSelection();range.selectNodeContents(body);selection?.removeAllRanges();selection?.addRange(range);
    }finally{if(token===session)copy.disabled=false;}
  });
  return {layout,close:()=>close(true)};
}
