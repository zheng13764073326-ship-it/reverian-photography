type Entry={image:HTMLImageElement;ready:boolean;promise:Promise<HTMLImageElement>;cancel:()=>void};

/** A small decoded-image LRU. Detached preloads never become broken DOM images. */
export class DecodedPhotos {
 private entries=new Map<string,Entry>();
 private limit:number;
 private makeImage:()=>HTMLImageElement;
 constructor(limit=6,makeImage:()=>HTMLImageElement=()=>new Image()){this.limit=limit;this.makeImage=makeImage;}
 peek(src:string){const entry=this.entries.get(src);return entry?.ready?entry.image:undefined;}
 load(src:string,priority:'high'|'low'='high'):Promise<HTMLImageElement>{
  const existing=this.entries.get(src);
  if(existing){this.entries.delete(src);this.entries.set(src,existing);if(priority==='high')existing.image.fetchPriority='high';return existing.promise;}
  const image=this.makeImage();image.decoding='async';image.loading='eager';image.fetchPriority=priority;
  let rejectLoad:(reason:unknown)=>void=()=>{};
  const entry:Entry={image,ready:false,promise:Promise.resolve(image),cancel:()=>{}};
  let cancelled=false;
  entry.promise=new Promise<HTMLImageElement>((resolve,reject)=>{
   rejectLoad=reject;image.src=src;
   void image.decode().then(()=>{if(cancelled)return;if(!image.naturalWidth)throw Error('Empty photograph');entry.ready=true;resolve(image);}).catch(error=>{
    if(this.entries.get(src)===entry)this.entries.delete(src);reject(error);
   });
  });
  entry.cancel=()=>{if(entry.ready)return;cancelled=true;rejectLoad(new Error('Photo preload cancelled'));image.removeAttribute('src');};
  // Eviction and clear can reject speculative work without an active consumer.
  void entry.promise.catch(()=>{});
  this.entries.set(src,entry);
  while(this.entries.size>this.limit){const oldest=this.entries.keys().next().value!;const old=this.entries.get(oldest)!;this.entries.delete(oldest);old.cancel();}
  return entry.promise;
 }
 clear(){for(const entry of this.entries.values())entry.cancel();this.entries.clear();}
}
