'use strict';
// All photographs, destinations and dates are placeholders for this prototype.
const photos={
 coast:{file:'coast.jpg',title:'海面',en:'Sea',category:'自然',alt:'蓝绿色海面上的波浪'},
 city:{file:'city.jpg',title:'街道',en:'Street',category:'街头',alt:'高楼之间的城市街道'},
 town:{file:'town.jpg',title:'沿岸建筑',en:'Coastal houses',category:'建筑',alt:'海岸山坡上的彩色房屋'},
 forest:{file:'forest.jpg',title:'林间',en:'In the woods',category:'自然',alt:'光线穿过树林'},
 paris:{file:'paris.jpg',title:'河岸',en:'Riverside',category:'街头',alt:'河岸、桥梁与远处的铁塔'},
 lake:{file:'lake.jpg',title:'船与湖面',en:'On the lake',category:'自然',alt:'湖面上的木船与远处的群山'},
 mountain:{file:'mountain.jpg',title:'山体与倒影',en:'Mountain reflection',category:'自然',alt:'湖面倒映山峰与天空'},
 field:{file:'field.jpg',title:'山脊',en:'Ridgeline',category:'自然',alt:'落日下的层叠山脊'},
 valley:{file:'valley.jpg',title:'湖畔木屋',en:'Lakeside cabin',category:'建筑',alt:'山间湖泊岸边的木屋'}
};
const selected=['coast','city','town','forest','paris','lake','mountain','valley','field'];
const albums=[
 {id:'kyoto',title:'京都',en:'Kyoto',date:'2026.10',cover:'forest',images:['forest','field','city','valley']},
 {id:'dali',title:'大理',en:'Dali',date:'2026.08',cover:'lake',images:['lake','valley','field','coast']},
 {id:'italy-north',title:'意大利北部',en:'Northern Italy',date:'2026.07',cover:'town',images:['town','mountain','coast','valley']},
 {id:'paris',title:'巴黎',en:'Paris',date:'2026.05',cover:'paris',images:['paris','city','town']},
 {id:'alps',title:'阿尔卑斯',en:'The Alps',date:'2025.10',cover:'mountain',images:['mountain','lake','valley','field']},
 {id:'hangzhou',title:'杭州',en:'Hangzhou',date:'2025.03',cover:'valley',images:['valley','forest','lake']}
];
const main=document.querySelector('main'),dialog=document.querySelector('#lightbox'),menuButton=document.querySelector('#menu-toggle');
let lightboxPhotos=[],lightboxIndex=0,lightboxName='',returnFocus=null,touchStart=null;
const assetSrc=file=>typeof embeddedImages!=='undefined'?embeddedImages[file]:(file==='home-desk.png'&&typeof localHomeImage!=='undefined'?localHomeImage:'assets/'+file);
const photoSrc=key=>photos[key].src||assetSrc(photos[key].file);
const image=(key,eager=false)=>`<img src="${photoSrc(key)}" alt="${photos[key].alt}（占位照片）" loading="${eager?'eager':'lazy'}" decoding="async">`;
const footer=()=>`<footer class="page-footer"><span>© 2026 REVERIAN / PHOTOGRAPHY</span><a href="#/about">示例照片 · Unsplash</a></footer>`;
const heading=(title,en,aside='')=>`<header class="page-heading"><div><h1>${title}</h1><p>${en}</p></div>${aside?`<span class="heading-aside">${aside}</span>`:''}</header>`;
function photoButton(key,index){return `<button class="work" data-photo="${index}" aria-label="放大查看：${photos[key].title}"><span class="photo-frame">${image(key,index<2)}</span><span class="work-caption"><span>${photos[key].title}<small>${photos[key].en}</small></span><span class="work-index">${String(index+1).padStart(2,'0')}</span></span></button>`;}
// The cover prints are projected back onto a flat canvas for the foreground viewer.
// Replace each entry's file with a real original photo when originals are available.
const coverPrints=[
 {key:'stilllight',title:'窗边',en:'Window light',alt:'窗边花瓶与茶杯的静物照片',width:960,height:640,quad:[[423,308],[810,220],[888,476],[471,565]],hit:'400,294 831,198 911,486 449,588'},
 {key:'gardenchair',title:'庭院',en:'Garden chair',alt:'庭院树荫中的一把木椅',width:540,height:900,quad:[[938,68],[1153,93],[1123,410],[946,388]],hit:'861,41 1177,75 1143,432 945,411 861,160'},
 {key:'afternoon',title:'午后',en:'Afternoon',alt:'阳光下的花束、水果和木桌',width:640,height:800,quad:[[1245,226],[1510,316],[1390,603],[1110,515]],hit:'1233,200 1540,301 1415,637 1077,533'}
];
for(const p of coverPrints)photos[p.key]={...p,file:'home-desk.png'};
let coverReady;
function prepareCoverPrints(){
 if(coverReady)return coverReady;
 coverReady=(async()=>{
  const source=new Image();source.src=assetSrc('home-desk.png');await source.decode();
  const c=document.createElement('canvas');c.width=source.naturalWidth;c.height=source.naturalHeight;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
  const pixels=ctx.getImageData(0,0,c.width,c.height).data;
  for(const p of coverPrints){
   const q=p.quad.map(([x,y])=>[x*c.width/1672,y*c.height/941]);
   const [a,b,d,e]=q,dx1=b[0]-d[0],dx2=e[0]-d[0],dx3=a[0]-b[0]+d[0]-e[0],dy1=b[1]-d[1],dy2=e[1]-d[1],dy3=a[1]-b[1]+d[1]-e[1];
   const det=dx1*dy2-dx2*dy1,g=(dx3*dy2-dx2*dy3)/det,h=(dx1*dy3-dx3*dy1)/det;
   const ax=b[0]-a[0]+g*b[0],bx=e[0]-a[0]+h*e[0],ay=b[1]-a[1]+g*b[1],by=e[1]-a[1]+h*e[1];
   const out=document.createElement('canvas');out.width=p.width;out.height=p.height;
   const oc=out.getContext('2d'),data=oc.createImageData(p.width,p.height);
   for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
    const u=x/(p.width-1),v=y/(p.height-1),den=g*u+h*v+1;
    const sx=Math.max(0,Math.min(c.width-2,(ax*u+bx*v+a[0])/den)),sy=Math.max(0,Math.min(c.height-2,(ay*u+by*v+a[1])/den));
    const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,idx=(iy*c.width+ix)*4,o=(y*p.width+x)*4;
    for(let ch=0;ch<3;ch++)data.data[o+ch]=pixels[idx+ch]*(1-fx)*(1-fy)+pixels[idx+4+ch]*fx*(1-fy)+pixels[idx+c.width*4+ch]*(1-fx)*fy+pixels[idx+c.width*4+4+ch]*fx*fy;
    data.data[o+3]=255;
   }
   oc.putImageData(data,0,0);photos[p.key].src=out.toDataURL('image/jpeg',.94);
  }
 })();
 return coverReady;
}
function renderHome(){
 main.innerHTML=`<section class="home-cover" aria-label="Reverian 的摄影桌面"><div class="desk-stage"><img class="desk-background" src="${assetSrc('home-desk.png')}" alt="暖光中的摄影桌面，照片盒里与桌面上摆放着三张照片" fetchpriority="high"><svg class="photo-hotspots" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice" aria-label="点击照片放大">${coverPrints.map((p,i)=>`<a href="#view-${p.key}" data-photo="${i}" role="button" aria-label="放大查看：${p.title}" aria-haspopup="dialog"><polygon points="${p.hit}"><title>点击放大 · ${p.title}</title></polygon></a>`).join('')}</svg></div><div class="home-identity"><h1>Reverian</h1><p class="home-genres">旅行 · 街头 · 胶片</p><span class="home-motto">按下快门，因为热爱</span></div><p class="home-hint" aria-live="polite">点击相片，查看作品</p></section>`;
 const ready=prepareCoverPrints();
 main.querySelectorAll('[data-photo]').forEach(button=>{
  button.addEventListener('click',async event=>{
   event.preventDefault();const hint=main.querySelector('.home-hint');hint.textContent='正在展开相片…';
   try{await ready;}catch{hint.textContent='相片暂时无法打开，请刷新重试。';return;}
   if(!button.isConnected)return;
   hint.textContent='点击相片，查看作品';
   lightboxPhotos=coverPrints.map(p=>p.key);lightboxIndex=Number(button.dataset.photo);lightboxName='REVERIAN / PHOTOGRAPHS';returnFocus=button;
   dialog.classList.add('home-viewer');updateLightbox();dialog.showModal();document.body.classList.add('modal-open');document.querySelector('#lightbox-close').focus();
  });
  button.addEventListener('keydown',event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();button.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));}});
 });
 ready.catch(()=>{});
}

function renderSelected(){
 main.innerHTML=heading('作品集','PORTFOLIO')+`<section class="works-grid" aria-label="摄影作品">${selected.map(photoButton).join('')}</section>`+footer();
 attachPhotos(selected,'作品集');
}
function renderSeries(kind){
 const series=kind==='street'?{title:'街巷观察',en:'STREET OBSERVATIONS',keys:['city','paris','town']}:{title:'胶片选集',en:'SELECTED FILM',keys:['forest','coast','field','valley']};
 main.innerHTML=heading(series.title,series.en,`${series.keys.length} 张`)+(kind==='film'?'<p class="series-placeholder">示例照片，后续替换为你的胶片照片。</p>':'')+`<section class="works-grid" aria-label="${series.title}">${series.keys.map(photoButton).join('')}</section>`+footer();
 attachPhotos(series.keys,series.title);
}
function renderAlbums(){
 main.innerHTML=heading('旅行影集','TRAVEL ALBUMS',`${albums.length} 个目的地`)+`<section class="album-grid" aria-label="按目的地浏览旅行影集">${albums.map((a,i)=>`<a class="album" href="#/collection/${a.id}" aria-label="浏览${a.title}影集"><div class="album-cover">${image(a.cover,i<2)}</div><div class="album-caption"><h2>${a.title}<small>${a.en}</small></h2><span>${a.date}</span></div></a>`).join('')}</section><p class="sample-note">地点与日期为示例，配图暂作占位。</p>`+footer();
}
function renderAlbum(id){
 const album=albums.find(a=>a.id===id);
 if(!album){renderNotFound();return;}
 const index=albums.indexOf(album),next=albums[(index+1)%albums.length];
 main.innerHTML=`<a class="back-link" href="#/collections">← 旅行影集 / Travel Albums</a>`+heading(album.title,album.en.toUpperCase(),`${album.date} · ${album.images.length} 张`)+`<section class="works-grid album-photos" aria-label="${album.title}影集">${album.images.map(photoButton).join('')}</section><div class="album-navigation"><a href="#/collections">返回全部影集</a><a href="#/collection/${next.id}">下一册 / ${next.title} →</a></div><p class="sample-note">地点与日期为示例，照片不对应实际旅行记录。</p>`+footer();
 attachPhotos(album.images,`${album.title} · ${album.date}`);
}
function renderAbout(){
 main.innerHTML=heading('关于我','ABOUT / REVERIAN')+`<section class="about-layout"><figure>${image('valley',true)}<figcaption>示例图片 · 可替换为个人照片</figcaption></figure><div class="about-copy"><p class="about-name">Reverian</p><p>这里收录我的旅行摄影，<br>以及一些想留下的作品。</p><p>从城市街道到自然风景，<br>用照片记录不同地方的样子。</p><div class="about-contact"><span>联系 / Contact</span><p>邮箱与社交主页待补充</p></div><p class="about-placeholder">以上为介绍文案示例。本站照片来自 Unsplash，地点与日期为演示内容，正式版本将替换为你的作品及个人介绍。</p></div></section>`+footer();
}
function renderNotFound(){main.innerHTML=heading('页面不存在','PAGE NOT FOUND')+`<a class="back-link" href="#/selected">← 返回作品集</a>`+footer();}
function attachPhotos(keys,title,scope=main){scope.querySelectorAll('[data-photo]').forEach(button=>button.addEventListener('click',()=>{lightboxPhotos=keys;lightboxIndex=Number(button.dataset.photo);lightboxName=title;returnFocus=button;dialog.classList.add('home-viewer');updateLightbox();dialog.showModal();document.body.classList.add('modal-open');document.querySelector('#lightbox-close').focus();}));}
function updateLightbox(){const key=lightboxPhotos[lightboxIndex];document.querySelector('#lightbox-image').src=photoSrc(key);document.querySelector('#lightbox-image').alt=photos[key].alt+'（占位照片）';document.querySelector('#lightbox-title').textContent=lightboxName;document.querySelector('#lightbox-caption').textContent=photos[key].title+' / '+photos[key].en;document.querySelector('#lightbox-count').textContent=`${String(lightboxIndex+1).padStart(2,'0')} / ${String(lightboxPhotos.length).padStart(2,'0')}`;}
function stepPhoto(delta){lightboxIndex=(lightboxIndex+delta+lightboxPhotos.length)%lightboxPhotos.length;updateLightbox();}
document.querySelector('#lightbox-close').addEventListener('click',()=>dialog.close());
document.querySelector('#lightbox-prev').addEventListener('click',()=>stepPhoto(-1));
document.querySelector('#lightbox-next').addEventListener('click',()=>stepPhoto(1));
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
dialog.addEventListener('close',()=>{document.body.classList.remove('modal-open');if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});});
dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();stepPhoto(-1);}if(event.key==='ArrowRight'){event.preventDefault();stepPhoto(1);}});
dialog.addEventListener('touchstart',event=>{touchStart=event.changedTouches[0].clientX;},{passive:true});
dialog.addEventListener('touchend',event=>{if(touchStart===null)return;const delta=event.changedTouches[0].clientX-touchStart;if(Math.abs(delta)>60)stepPhoto(delta>0?-1:1);touchStart=null;},{passive:true});
const portfolioNav=document.querySelector('.portfolio-nav'),portfolioToggle=document.querySelector('#portfolio-toggle'),portfolioPanel=document.querySelector('#portfolio-panel');
function setPortfolioOpen(open){portfolioPanel.hidden=!open;portfolioToggle.setAttribute('aria-expanded',String(open));}
portfolioNav.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'&&matchMedia('(min-width:901px)').matches)setPortfolioOpen(true);});
portfolioNav.addEventListener('pointerleave',()=>{if(!portfolioNav.contains(document.activeElement))setPortfolioOpen(false);});
portfolioToggle.addEventListener('click',()=>setPortfolioOpen(portfolioToggle.getAttribute('aria-expanded')!=='true'));
portfolioToggle.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();setPortfolioOpen(true);portfolioPanel.querySelector('a').focus();}});
portfolioNav.addEventListener('focusout',event=>{if(!portfolioNav.contains(event.relatedTarget))setPortfolioOpen(false);});
document.addEventListener('pointerdown',event=>{if(!portfolioNav.contains(event.target))setPortfolioOpen(false);});
document.querySelectorAll('#site-navigation a').forEach(link=>link.addEventListener('click',()=>{setPortfolioOpen(false);setMenu(false);}));
const menuBackdrop=document.createElement('button');
menuBackdrop.id='menu-backdrop';menuBackdrop.hidden=true;menuBackdrop.tabIndex=-1;menuBackdrop.setAttribute('aria-label','关闭导航菜单');document.body.append(menuBackdrop);
menuBackdrop.addEventListener('click',()=>{setMenu(false);menuButton.focus();});
function setMenu(open){
 open=Boolean(open&&matchMedia('(max-width:900px)').matches);
 document.querySelector('.site-header').classList.toggle('menu-open',open);
 document.body.classList.toggle('navigation-open',open);main.inert=open;menuBackdrop.hidden=!open;
 menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'关闭导航菜单':'打开导航菜单');
 menuButton.innerHTML='<span class="menu-bars" aria-hidden="true"><i></i><i></i><i></i></span>';
 if(!open)setPortfolioOpen(false);
}
document.addEventListener('keydown',event=>{
 if(event.key!=='Tab'||menuButton.getAttribute('aria-expanded')!=='true')return;
 const focusable=[...document.querySelector('.site-header').querySelectorAll('a,button')].filter(el=>el.getClientRects().length);
 const first=focusable[0],last=focusable[focusable.length-1];
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
menuButton.addEventListener('click',()=>setMenu(menuButton.getAttribute('aria-expanded')!=='true'));
document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(!portfolioPanel.hidden){setPortfolioOpen(false);portfolioToggle.focus();}else if(menuButton.getAttribute('aria-expanded')==='true'){setMenu(false);menuButton.focus();}}});
const streamPages=['home','collections','street','film'];
function renderStream(){
 renderHome();
 const cover=main.querySelector('.home-cover');cover.id='section-home';cover.dataset.scrollSection='home';
 cover.insertAdjacentHTML('beforeend','<a class="scroll-invitation" href="#/collections">向下浏览作品 <span aria-hidden="true">↓</span></a>');
 const sectionHeading=(title,en,number,aside)=>`<header class="section-heading"><div><span class="section-number">${number} / REVERIAN</span><h2>${title}</h2><p>${en}</p></div><span class="section-aside">${aside}</span></header>`;
 main.insertAdjacentHTML('beforeend',`<section id="section-collections" class="portfolio-section travel-section" data-scroll-section="collections" aria-label="旅行影集"><div class="section-inner">${sectionHeading('旅行影集','TRAVEL ALBUMS','01',`${albums.length} 个目的地`)}<div class="album-grid">${albums.map((a,i)=>`<a class="album" href="#/collection/${a.id}" aria-label="浏览${a.title}影集"><div class="album-cover">${image(a.cover,i<2)}</div><div class="album-caption"><h2>${a.title}<small>${a.en}</small></h2><span>${a.date}</span></div></a>`).join('')}</div><p class="sample-note">地点与日期为示例，配图暂作占位。</p><a class="section-next" href="#/street">街巷观察 <span aria-hidden="true">↓</span></a></div></section>`);
 for(const [kind,title,en,number,keys] of [['street','街巷观察','STREET OBSERVATIONS','02',['city','paris','town']],['film','胶片选集','SELECTED FILM','03',['forest','coast','field','valley']]]){
  main.insertAdjacentHTML('beforeend',`<section id="section-${kind}" class="portfolio-section ${kind}-section" data-scroll-section="${kind}" aria-label="${title}"><div class="section-inner">${sectionHeading(title,en,number,`${keys.length} 张作品`)}${kind==='film'?'<p class="series-placeholder">示例照片，后续替换为你的胶片照片。</p>':''}<div class="works-grid">${keys.map(photoButton).join('')}</div><a class="section-next" href="#/${kind==='street'?'film':'home'}">${kind==='street'?'胶片选集 ↓':'返回首页 ↑'}</a>${kind==='film'?footer():''}</div></section>`);
  attachPhotos(keys,title,main.querySelector('#section-'+kind));
 }
 main.dataset.stream='true';
}
function setActiveNavigation(page){
 const active=page==='home'?'home':page==='about'?'about':'portfolio';
 document.querySelectorAll('[data-nav]').forEach(link=>{if(link.dataset.nav===active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
 document.querySelectorAll('[data-section]').forEach(link=>{if(link.dataset.section===(page==='collection'?'collections':page))link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
 document.body.classList.toggle('cover-active',page==='home'&&scrollY<60);
 main.dataset.page=page;
}
function syncScrollSection(){
 if(main.dataset.stream!=='true'||dialog.open)return;
 let active='home';
 const line=document.querySelector('.site-header').offsetHeight+40;
 for(const section of main.querySelectorAll('[data-scroll-section]'))if(section.getBoundingClientRect().top<=line)active=section.dataset.scrollSection;
 if(innerHeight+scrollY>=document.documentElement.scrollHeight-3)active='film';
 setActiveNavigation(active);
 if(location.hash!=='#/'+active)history.replaceState(null,'','#/'+active);
 document.title=({home:'摄影',collections:'旅行影集',street:'街巷观察',film:'胶片选集'}[active])+' · Reverian';
}
let scrollFrame=0;
addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;syncScrollSection();});},{passive:true});
function route(){
 if(location.hash==='#main'){main.focus();return;}
 const [,rawPage='home',rawId]=location.hash.split('/');
 const retired=['selected','diary','entry','archive','notes','note','places','place','subject','contact-sheet'];
 const page=retired.includes(rawPage)?'collections':rawPage;
 if(page!==rawPage)history.replaceState(null,'','#/'+page);
 if(dialog.open)dialog.close();setMenu(false);
 const stream=streamPages.includes(page);
 document.body.classList.toggle('home-page',stream);
 if(stream){
  if(main.dataset.stream!=='true')renderStream();
  const target=main.querySelector('#section-'+page);
  const compactLanding=['collections','street','film'].includes(page);
  const anchor=compactLanding?target.querySelector('.section-heading h2'):target;
  const top=page==='home'?0:anchor.getBoundingClientRect().top+scrollY-document.querySelector('.site-header').offsetHeight-(compactLanding?12:0);
  window.scrollTo({top,behavior:'instant'});
  setActiveNavigation(page);syncScrollSection();
 }else{
  delete main.dataset.stream;
  if(page==='collection')renderAlbum(rawId);else if(page==='about')renderAbout();else renderNotFound();
  window.scrollTo({top:0,behavior:'instant'});setActiveNavigation(page);
  document.title=(main.querySelector('h1')?.textContent||'摄影作品')+' · Reverian';
 }
 main.focus({preventScroll:true});
}
// Same-section links still scroll to its beginning after the scroll observer updates the hash.
document.addEventListener('click',event=>{
 const link=event.target.closest('a[href^="#/"]');
 if(!link||event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
 if(link.getAttribute('href')===location.hash){event.preventDefault();route();}
});
addEventListener('hashchange',route);
matchMedia('(max-width:900px)').addEventListener('change',()=>setMenu(false));
history.scrollRestoration='manual';route();
