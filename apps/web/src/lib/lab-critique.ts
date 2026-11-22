import type {CritiqueExport,ReportQr} from './critique-export';
import {compressCritiqueImage,checkCritiqueFile} from './critique-image';
import {CRITIQUE_DIMENSIONS,validateCritique,type CritiqueReport} from './critique-contract';

export function setupLabCritique(root:HTMLElement){
 const q=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const input=q<HTMLInputElement>('[data-critique-file]'),drop=q<HTMLButtonElement>('[data-critique-drop]'),preview=q<HTMLElement>('[data-critique-preview]'),img=q<HTMLImageElement>('[data-critique-image]');
 const report=q('[data-critique-report]'),status=q('[data-critique-status]'),sheet=q('[data-critique-sheet]'),reset=q<HTMLButtonElement>('[data-critique-reset]'),retry=q<HTMLButtonElement>('[data-critique-retry]');
 const exportButton=q<HTMLButtonElement>('[data-critique-export]'),shareDialog=q<HTMLDialogElement>('[data-critique-share]'),shareImage=q<HTMLImageElement>('[data-critique-share-image]'),download=q<HTMLAnchorElement>('[data-critique-download]'),shareButton=q<HTMLButtonElement>('[data-critique-native-share]'),shareHint=q('[data-critique-share-hint]');
 let snapshot:CritiqueExport|undefined,exportUrl:string|undefined,shareFile:File|undefined,exportRun=0;
 function releaseExport(){
  exportRun++;if(exportUrl)URL.revokeObjectURL(exportUrl);exportUrl=undefined;shareFile=undefined;shareImage.removeAttribute('src');shareImage.hidden=true;download.removeAttribute('href');download.hidden=true;shareButton.hidden=true;exportButton.disabled=false;exportButton.textContent='导出报告图片 ↗';document.documentElement.classList.remove('darkroom-sharing');
 }
 function cancelExport(){if(shareDialog.open)shareDialog.close();releaseExport();snapshot=undefined;}
 let selected:File|undefined,previewUrl:string|undefined,request:AbortController|undefined,version=0;
 function state(value:'empty'|'developing'|'ready'|'error'){
  root.dataset.state=value;sheet.setAttribute('aria-busy',String(value==='developing'));
  q('[data-critique-empty]').hidden=value!=='empty';q('[data-critique-developing]').hidden=value!=='developing';q('[data-critique-error]').hidden=value!=='error';report.hidden=value!=='ready';
  preview.hidden=!previewUrl;drop.hidden=!!previewUrl;reset.hidden=value==='empty';retry.hidden=!selected;exportButton.hidden=value!=='ready';
  q('[data-critique-frame-status]').textContent=value==='developing'?'DEVELOPING':value==='ready'?'DEVELOPED':'PAUSED';
 }
 function render(value:CritiqueReport,mock:boolean){
  if(selected)snapshot={report:value,photo:selected,createdAt:new Date(),mock};
  q('[data-critique-score]').textContent=value.score.toFixed(1);q('[data-critique-verdict]').textContent=value.verdict;
  q('[data-critique-mode]').textContent=mock?'本地示例 · 非AI评片':'AI 评片';
  for(const key of CRITIQUE_DIMENSIONS){q(`[data-dimension-score="${key}"]`).textContent=value.dimensions[key].toFixed(1);const bar=q(`[data-dimension-bar="${key}"]`);bar.style.setProperty('--value',value.dimensions[key]*10+'%');bar.setAttribute('aria-valuenow',String(value.dimensions[key]));}
  for(const key of ['highlights','suggestions'] as const){const list=q('[data-critique-'+key+']');list.replaceChildren();for(const text of value[key]){const li=document.createElement('li');li.textContent=text;list.append(li);}}
  state('ready');status.textContent=mock?'本地示例报告，仅供预览排版，不代表对照片的真实分析。':'显影完成。建议可作参考，照片的最终取舍仍由你决定。';
 }
 function showError(message:string){q('[data-critique-error-text]').textContent=message;state('error');status.textContent='评片未完成，可重试或更换照片。';}
 async function analyze(file:File){
  cancelExport();const serial=++version;request?.abort();request=new AbortController();const controller=request;
  try{checkCritiqueFile(file);}catch(error){selected=undefined;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=undefined;img.removeAttribute('src');showError(error instanceof Error?error.message:'请选择一张照片。');return;}
  selected=file;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(file);img.src=previewUrl;q('[data-critique-filename]').textContent=file.name;
  state('developing');status.textContent='照片已在本机预览，正在准备显影。';
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   // Give the local preview a frame before canvas processing begins.
   await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
   const blob=await compressCritiqueImage(file);if(serial!==version)return;
   timer=setTimeout(()=>controller.abort(),55000);status.textContent='DEVELOPING // 正在暗房测光与构图分析...';
   const response=await fetch('/api/critique',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:blob,credentials:'same-origin',cache:'no-store',signal:controller.signal});
   let body:unknown;try{body=await response.json();}catch{throw Error('暗房暂未响应，请稍后重试。');}
   if(serial!==version)return;
   if(!response.ok){const message=(body as {error?:unknown})?.error;throw Error(typeof message==='string'?message:'本次显影未完成，请稍后重试。');}
   const result=validateCritique(body);render(result,(body as {mode?:string}).mode==='mock');
  }catch(error){if(serial!==version)return;showError(controller.signal.aborted?'显影等待较久，请稍后重新评片。':error instanceof Error?error.message:'本次显影未完成，请稍后重试。');}
  finally{if(timer)clearTimeout(timer);}
 }
 const choose=()=>input.click();drop.addEventListener('click',choose);reset.addEventListener('click',choose);
 input.addEventListener('change',()=>{const file=input.files?.[0];input.value='';if(file)void analyze(file);});
 retry.addEventListener('click',()=>{if(selected)void analyze(selected);});
 for(const event of ['dragenter','dragover'])drop.addEventListener(event,e=>{e.preventDefault();drop.dataset.dragging='true';});
 for(const event of ['dragleave','drop'])drop.addEventListener(event,e=>{e.preventDefault();delete drop.dataset.dragging;});
 drop.addEventListener('drop',e=>{const files=e.dataTransfer?.files;if(!files?.length)return;if(files.length>1){status.textContent='一次只显影一张，已选取第一张照片。';}void analyze(files[0]);});
 q('[data-critique-share-close]').addEventListener('click',()=>shareDialog.close());
 shareDialog.addEventListener('click',event=>{if(event.target===shareDialog)shareDialog.close();});
 shareDialog.addEventListener('close',()=>{releaseExport();if(!exportButton.hidden&&exportButton.getClientRects().length)exportButton.focus({preventScroll:true});});
 exportButton.addEventListener('click',async()=>{
  if(!snapshot||root.dataset.state!=='ready'||exportButton.disabled)return;
  const current=snapshot,generation=version;releaseExport();const run=exportRun;
  exportButton.disabled=true;exportButton.textContent='正在生成…';shareHint.textContent='正在生成分享图片…';shareDialog.showModal();document.documentElement.classList.add('darkroom-sharing');
  try{
   const {renderCritiqueReport}=await import('./critique-export');
   const blob=await renderCritiqueReport(current,root,JSON.parse(root.dataset.critiqueQr!) as ReportQr);
   if(generation!==version||run!==exportRun||!shareDialog.open)return;
   const stamp=[current.createdAt.getFullYear(),String(current.createdAt.getMonth()+1).padStart(2,'0'),String(current.createdAt.getDate()).padStart(2,'0')].join('')+'-'+[current.createdAt.getHours(),current.createdAt.getMinutes(),current.createdAt.getSeconds()].map(v=>String(v).padStart(2,'0')).join('');
   const filename='reverian-critique-'+stamp+'.png';exportUrl=URL.createObjectURL(blob);shareFile=new File([blob],filename,{type:'image/png'});
   // This is a user-requested local Blob: load it even while the preview is hidden.
   shareImage.loading='eager';shareImage.src=exportUrl;await shareImage.decode();if(generation!==version||run!==exportRun||!shareDialog.open)return;
   shareImage.width=shareImage.naturalWidth;shareImage.height=shareImage.naturalHeight;shareImage.hidden=false;download.href=exportUrl;download.download=filename;download.hidden=false;
   shareButton.hidden=!(typeof navigator.canShare==='function'&&typeof navigator.share==='function'&&navigator.canShare({files:[shareFile]}));
   shareHint.textContent='图片已生成。手机可长按保存，也可下载后分享。';
  }catch(error){if(generation===version&&run===exportRun&&shareDialog.open)shareHint.textContent=error instanceof Error?error.message:'报告暂未生成，请关闭后重试。';}
  finally{if(generation===version&&run===exportRun){exportButton.disabled=false;exportButton.textContent='导出报告图片 ↗';}}
 });
 shareButton.addEventListener('click',async()=>{
  if(!shareFile||shareButton.disabled)return;shareButton.disabled=true;
  try{await navigator.share({files:[shareFile],title:'暗房评片 · Reverian'});}catch(error){if(!(error instanceof DOMException&&error.name==='AbortError'))shareHint.textContent='系统分享暂不可用，可长按保存或下载图片。';}finally{shareButton.disabled=false;}
 });
 window.addEventListener('popstate',()=>{if(root.closest<HTMLElement>('[data-lab-panel]')?.hidden&&shareDialog.open)shareDialog.close();});
 // No photo or report is persisted. Release local object URLs on navigation.
 window.addEventListener('pagehide',()=>{cancelExport();version++;request?.abort();if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=undefined;selected=undefined;img.removeAttribute('src');state('empty');});
 return {};
}
