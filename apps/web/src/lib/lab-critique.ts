import {compressCritiqueImage,checkCritiqueFile} from './critique-image';
import {CRITIQUE_DIMENSIONS,validateCritique,type CritiqueReport} from './critique-contract';

export function setupLabCritique(root:HTMLElement){
 const q=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const input=q<HTMLInputElement>('[data-critique-file]'),drop=q<HTMLButtonElement>('[data-critique-drop]'),preview=q<HTMLElement>('[data-critique-preview]'),img=q<HTMLImageElement>('[data-critique-image]');
 const report=q('[data-critique-report]'),status=q('[data-critique-status]'),sheet=q('[data-critique-sheet]'),reset=q<HTMLButtonElement>('[data-critique-reset]'),retry=q<HTMLButtonElement>('[data-critique-retry]');
 let selected:File|undefined,previewUrl:string|undefined,request:AbortController|undefined,version=0;
 function state(value:'empty'|'developing'|'ready'|'error'){
  root.dataset.state=value;sheet.setAttribute('aria-busy',String(value==='developing'));
  q('[data-critique-empty]').hidden=value!=='empty';q('[data-critique-developing]').hidden=value!=='developing';q('[data-critique-error]').hidden=value!=='error';report.hidden=value!=='ready';
  preview.hidden=!previewUrl;drop.hidden=!!previewUrl;reset.hidden=value==='empty';retry.hidden=!selected;
  q('[data-critique-frame-status]').textContent=value==='developing'?'DEVELOPING':value==='ready'?'DEVELOPED':'PAUSED';
 }
 function render(value:CritiqueReport,mock:boolean){
  q('[data-critique-score]').textContent=value.score.toFixed(1);q('[data-critique-verdict]').textContent=value.verdict;
  q('[data-critique-mode]').textContent=mock?'本地示例 · 非AI评片':'AI 评片';
  for(const key of CRITIQUE_DIMENSIONS){q(`[data-dimension-score="${key}"]`).textContent=value.dimensions[key].toFixed(1);const bar=q(`[data-dimension-bar="${key}"]`);bar.style.setProperty('--value',value.dimensions[key]*10+'%');bar.setAttribute('aria-valuenow',String(value.dimensions[key]));}
  for(const key of ['highlights','suggestions'] as const){const list=q('[data-critique-'+key+']');list.replaceChildren();for(const text of value[key]){const li=document.createElement('li');li.textContent=text;list.append(li);}}
  state('ready');status.textContent=mock?'本地示例报告，仅供预览排版，不代表对照片的真实分析。':'显影完成。建议可作参考，照片的最终取舍仍由你决定。';
 }
 function showError(message:string){q('[data-critique-error-text]').textContent=message;state('error');status.textContent='评片未完成，可重试或更换照片。';}
 async function analyze(file:File){
  const serial=++version;request?.abort();request=new AbortController();const controller=request;
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
 // No photo or report is persisted. Release local object URLs on navigation.
 window.addEventListener('pagehide',()=>{version++;request?.abort();if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=undefined;selected=undefined;img.removeAttribute('src');state('empty');});
 return {};
}
