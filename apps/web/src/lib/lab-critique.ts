import type {CritiqueExport,ReportQr} from './critique-export';
import {compressCritiqueImage,checkCritiqueFile} from './critique-image';
import {CRITIQUE_DIMENSIONS,CRITIQUE_TONES,validateCritique,formatCritiqueText,type CritiqueReport,type CritiqueTone} from './critique-contract';

export function setupLabCritique(root:HTMLElement){
 const q=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const input=q<HTMLInputElement>('[data-critique-file]'),drop=q<HTMLButtonElement>('[data-critique-drop]'),preview=q('[data-critique-preview]'),img=q<HTMLImageElement>('[data-critique-image]');
 const report=q('[data-critique-report]'),status=q('[data-critique-status]'),sheet=q('[data-critique-sheet]'),retry=q<HTMLButtonElement>('[data-critique-retry]');
 const example=q<HTMLButtonElement>('[data-critique-example]'),copy=q<HTMLButtonElement>('[data-critique-copy]'),copyStatus=q('[data-critique-copy-status]');
 const tones=[...root.querySelectorAll<HTMLButtonElement>('[data-critique-tone]')];
 const exportButton=q<HTMLButtonElement>('[data-critique-export]'),shareDialog=q<HTMLDialogElement>('[data-critique-share]'),shareImage=q<HTMLImageElement>('[data-critique-share-image]'),download=q<HTMLAnchorElement>('[data-critique-download]'),shareButton=q<HTMLButtonElement>('[data-critique-native-share]'),shareHint=q('[data-critique-share-hint]');
 let tone:CritiqueTone='gentle',snapshot:CritiqueExport|undefined,exportUrl:string|undefined,shareFile:File|undefined,exportRun=0;
 let selected:File|undefined,previewUrl:string|undefined,request:AbortController|undefined,version=0;
 let phaseTimer:ReturnType<typeof setTimeout>|undefined,copyTimer:ReturnType<typeof setTimeout>|undefined;
 function releaseExport(){
  exportRun++;if(exportUrl)URL.revokeObjectURL(exportUrl);exportUrl=undefined;shareFile=undefined;shareImage.removeAttribute('src');shareImage.hidden=true;download.removeAttribute('href');download.hidden=true;shareButton.hidden=true;exportButton.disabled=false;exportButton.textContent='↓ 导出报告图片';document.documentElement.classList.remove('darkroom-sharing');
 }
 function cancelExport(){if(shareDialog.open)shareDialog.close();releaseExport();snapshot=undefined;}
 function clearCopy(){clearTimeout(copyTimer);copy.textContent='复制评片结果';copy.disabled=false;copyStatus.textContent='';copyStatus.hidden=true;}
 function progress(text:string){q('[data-critique-progress]').textContent=text;status.textContent=text;}
 function state(value:'empty'|'developing'|'ready'|'error'){
  root.dataset.state=value;root.dataset.hasPhoto=String(!!previewUrl);sheet.hidden=value==='empty';sheet.setAttribute('aria-busy',String(value==='developing'));
  q('[data-critique-developing]').hidden=value!=='developing';q('[data-critique-error]').hidden=value!=='error';report.hidden=value!=='ready';
  preview.hidden=!previewUrl;drop.hidden=!!previewUrl;q('[data-critique-upload-extras]').hidden=!!previewUrl;q('[data-critique-photo-actions]').hidden=!previewUrl;
  retry.hidden=!selected;copy.hidden=value!=='ready';exportButton.hidden=value!=='ready';
  tones.forEach(button=>button.disabled=value==='developing');
 }
 function render(value:CritiqueReport,mock:boolean,usedTone:CritiqueTone){
  if(selected)snapshot={report:value,photo:selected,createdAt:new Date(),mock,tone:usedTone};
  q('[data-critique-score]').textContent=value.score.toFixed(1);q('[data-critique-verdict]').textContent=value.verdict;
  q('[data-critique-mode]').textContent=mock?'本地示例 · 非 AI 分析':`AI 评片 · ${CRITIQUE_TONES[usedTone]}`;
  for(const key of CRITIQUE_DIMENSIONS){q(`[data-dimension-score="${key}"]`).textContent=value.dimensions[key].toFixed(1);q(`[data-dimension-analysis="${key}"]`).textContent=value.analysis[key];const bar=q(`[data-dimension-bar="${key}"]`);bar.style.setProperty('--value',value.dimensions[key]*10+'%');bar.setAttribute('aria-valuenow',String(value.dimensions[key]));}
  const list=q('[data-critique-suggestions]');list.replaceChildren();for(const text of value.suggestions){const li=document.createElement('li');li.textContent=text;list.append(li);}
  state('ready');status.textContent=mock?'本地示例报告，仅供预览排版，不代表对照片的真实分析。':'分析完成，可以查看四维拆解和调整建议。';
 }
 function showError(message:string){clearTimeout(phaseTimer);q('[data-critique-error-text]').textContent=message;state('error');status.textContent='分析未完成，可重试或更换照片。';}
 async function analyze(file:File){
  cancelExport();clearCopy();clearTimeout(phaseTimer);example.disabled=false;
  const serial=++version,usedTone=tone;request?.abort();request=new AbortController();const controller=request;
  try{checkCritiqueFile(file);}catch(error){selected=undefined;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=undefined;img.removeAttribute('src');showError(error instanceof Error?error.message:'请选择一张照片。');return;}
  selected=file;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(file);img.loading='eager';img.src=previewUrl;q('[data-critique-filename]').textContent=file.name;
  state('developing');progress('本地压缩中…');
  let timeout:ReturnType<typeof setTimeout>|undefined;
  try{
   await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
   const blob=await compressCritiqueImage(file);if(serial!==version)return;
   timeout=setTimeout(()=>controller.abort(),65000);progress('正在读取构图与光影…');
   // This is a waiting message, not a claimed server-side progress percentage.
   phaseTimer=setTimeout(()=>{if(serial===version&&root.dataset.state==='developing')progress('正在分析，整理调整建议…');},6500);
   const response=await fetch('/api/critique',{method:'POST',headers:{'Content-Type':'image/jpeg','X-Critique-Tone':usedTone},body:blob,credentials:'same-origin',cache:'no-store',signal:controller.signal});
   let body:unknown;try{body=await response.json();}catch{throw Error('分析服务暂未响应，请稍后重试。');}
   if(serial!==version)return;
   if(!response.ok){const message=(body as {error?:unknown})?.error;throw Error(typeof message==='string'?message:'本次分析未完成，请稍后重试。');}
   const result=validateCritique(body);clearTimeout(phaseTimer);render(result,(body as {mode?:string}).mode==='mock',usedTone);
  }catch(error){if(serial!==version)return;showError(controller.signal.aborted?'分析等待较久，请稍后重试。':error instanceof Error?error.message:'本次分析未完成，请稍后重试。');}
  finally{if(timeout)clearTimeout(timeout);}
 }
 img.addEventListener('load',()=>{img.width=img.naturalWidth;img.height=img.naturalHeight;});
 const choose=()=>input.click();drop.addEventListener('click',choose);q('[data-critique-reset]').addEventListener('click',choose);
 input.addEventListener('change',()=>{const file=input.files?.[0];input.value='';if(file)void analyze(file);});
 retry.addEventListener('click',()=>{if(selected)void analyze(selected);});
 tones.forEach(button=>button.addEventListener('click',()=>{const next=button.dataset.critiqueTone as CritiqueTone;if(next===tone)return;tone=next;tones.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));if(selected)void analyze(selected);}));
 for(const event of ['dragenter','dragover'])drop.addEventListener(event,e=>{e.preventDefault();drop.dataset.dragging='true';});
 for(const event of ['dragleave','drop'])drop.addEventListener(event,e=>{e.preventDefault();delete drop.dataset.dragging;});
 drop.addEventListener('drop',e=>{const file=e.dataTransfer?.files[0];if(file)void analyze(file);});
 example.addEventListener('click',async()=>{
  if(example.disabled)return;const serial=++version;request?.abort();const controller=new AbortController();request=controller;example.disabled=true;example.textContent='正在载入示例图…';status.textContent='正在载入示例图…';
  const timer=setTimeout(()=>controller.abort(),20000);
  try{const response=await fetch(root.dataset.critiqueExampleSrc!,{signal:controller.signal});if(!response.ok)throw Error('示例图暂时无法加载，请重试或上传自己的照片。');const blob=await response.blob();if(serial!==version)return;clearTimeout(timer);await analyze(new File([blob],'示例图 · 厦门港口.webp',{type:'image/webp'}));}
  catch(error){if(serial===version)showError(error instanceof Error&&!controller.signal.aborted?error.message:'示例图载入超时，请重试。');}
  finally{clearTimeout(timer);example.disabled=false;example.textContent='没有合适照片？用示例图试一下';}
 });
 copy.addEventListener('click',async()=>{
  if(!snapshot||root.dataset.state!=='ready')return;const current=snapshot,serial=version;copy.disabled=true;
  try{await navigator.clipboard.writeText(formatCritiqueText(current.report,current.tone,current.mock));if(serial!==version)return;copy.textContent='已复制 ✓';copyStatus.textContent='完整评片结果已复制。';}
  catch{if(serial!==version)return;const range=document.createRange();range.selectNodeContents(report);getSelection()?.removeAllRanges();getSelection()?.addRange(range);report.focus({preventScroll:true});copyStatus.textContent='无法自动复制，已选中报告，请手动复制。';}
  finally{if(serial===version){copy.disabled=false;copyStatus.hidden=false;copyTimer=setTimeout(clearCopy,2500);}}
 });
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
  finally{if(generation===version&&run===exportRun){exportButton.disabled=false;exportButton.textContent='↓ 导出报告图片';}}
 });
 shareButton.addEventListener('click',async()=>{
  if(!shareFile||shareButton.disabled)return;shareButton.disabled=true;
  try{await navigator.share({files:[shareFile],title:'AI 评片 · Reverian'});}catch(error){if(!(error instanceof DOMException&&error.name==='AbortError'))shareHint.textContent='系统分享暂不可用，可长按保存或下载图片。';}finally{shareButton.disabled=false;}
 });

 window.addEventListener('popstate',()=>{if(root.closest<HTMLElement>('[data-lab-panel]')?.hidden&&shareDialog.open)shareDialog.close();});
 window.addEventListener('pagehide',()=>{cancelExport();clearCopy();clearTimeout(phaseTimer);version++;request?.abort();if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=undefined;selected=undefined;img.removeAttribute('src');status.textContent='';example.disabled=false;example.textContent='没有合适照片？用示例图试一下';state('empty');});
 return {};
}
