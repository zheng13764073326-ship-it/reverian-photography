import {MAX_CRITIQUE_BYTES} from './critique-contract';
const ALLOWED=new Set(['image/jpeg','image/png','image/webp']);
export function checkCritiqueFile(file:File){
 if(!ALLOWED.has(file.type))throw Error('请选择 JPG、PNG 或 WebP 照片。');
 if(file.size===0)throw Error('这张图片是空文件，请重新选择。');
 if(file.size>30*1024*1024)throw Error('原图超过30MB，请先导出较小的版本。');
}
export async function compressCritiqueImage(file:File):Promise<Blob>{
 checkCritiqueFile(file);let source:ImageBitmap|HTMLImageElement;let url:string|undefined;
 try{
  if(typeof createImageBitmap==='function')source=await createImageBitmap(file,{imageOrientation:'from-image'});
  else {url=URL.createObjectURL(file);const img=new Image();img.src=url;await img.decode();source=img;}
 }catch{if(url)URL.revokeObjectURL(url);throw Error('图片无法解码，请换一张照片或重新导出。');}
 try{
  const width=source instanceof HTMLImageElement?source.naturalWidth:source.width,height=source instanceof HTMLImageElement?source.naturalHeight:source.height;
  if(!width||!height||width*height>80_000_000)throw Error('图片尺寸过大或无效，请先缩小原图。');
  let scale=Math.min(1,1024/Math.max(width,height));
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw Error('浏览器暂不支持图片处理，请换一个浏览器试试。');
  // Keep JPEG quality at .75; reduce dimensions further if a detailed frame exceeds 200 KB.
  for(let attempt=0;attempt<12;attempt++){
   canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));ctx.fillStyle='#F4F3EE';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,0,0,canvas.width,canvas.height);
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',0.75));
   if(!blob)throw Error('图片压缩失败，请重新选择。');
   if(blob.type==='image/jpeg'&&blob.size<=MAX_CRITIQUE_BYTES){canvas.width=canvas.height=1;return blob;}
   scale*=Math.min(.85,Math.sqrt(MAX_CRITIQUE_BYTES/blob.size)*.94);
  }throw Error('这张图片仍然过大，请换一个较小的版本。');
 }finally{if('close' in source)source.close();if(url)URL.revokeObjectURL(url);}
}
