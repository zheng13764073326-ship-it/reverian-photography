import {readdir,readFile,stat} from 'node:fs/promises';
import {resolve,join,basename} from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const root=resolve(import.meta.dirname,'../apps/web/dist'),production=process.argv.includes('--production');
async function walk(dir){const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())files.push(...await walk(path));else files.push(path);}return files;}
const files=await walk(root),pages=files.filter(file=>file.endsWith('.html')),metadata=new Map();let links=0;
async function imageMeta(url){const path=join(root,url);if(!metadata.has(path))metadata.set(path,await sharp(path).metadata());return metadata.get(path);}
for(const file of files){
 assert.ok(!/\.(jpe?g|png)$/i.test(file),'Raw/legacy raster image in publish output: '+file);
 if(file.endsWith('.webp')){const meta=await sharp(file).metadata();metadata.set(file,meta);assert.equal(meta.format,'webp');assert.ok(!meta.orientation||meta.orientation===1,file+': uncorrected EXIF orientation');assert.ok(Math.max(meta.width,meta.height)<=(basename(file).includes('_thumb')?1200:2400),file+': exceeds image size budget');}
}
for(const file of pages){
 const html=await readFile(file,'utf8');
 for(const match of html.matchAll(/(?:src|href)="(\/[^"#?]*)/g)){const target=decodeURIComponent(match[1]),path=join(root,target.endsWith('/')?target+'index.html':target);assert.ok((await stat(path).catch(()=>null))?.isFile(),`${file}: broken ${target}`);links++;}
 for(const [target] of html.matchAll(/\/(?:_photos|images)\/[^"'<>\s,()\\]+\.webp/g))assert.ok((await stat(join(root,target)).catch(()=>null))?.isFile(),file+': missing '+target);
 for(const [,srcset] of html.matchAll(/\bsrcset="([^"]+)"/g))for(const [,src,width] of srcset.matchAll(/(\/[^\s,]+)\s+(\d+)w/g)){const meta=await imageMeta(src);assert.equal(meta.width,Number(width),file+': inaccurate srcset descriptor '+src);}
 for(const [tag] of html.matchAll(/<a\b[^>]*data-lightbox[^>]*>/g)){const src=tag.match(/\bhref="([^\"]+)"/)?.[1];if(src?.startsWith('/')){assert.ok(src.endsWith('.webp'),file+': Lightbox still points to original');const meta=await imageMeta(src);assert.ok(Math.max(meta.width,meta.height)<=2048,file+': oversized Lightbox image');}}
 assert.match(html,/<html lang="zh-CN"/);
 if(production){assert.doesNotMatch(html,/https:\/\/cdn\.sanity\.io\/images\//,file+': external photo dependency');assert.doesNotMatch(html,/演示版 · 照片、地点与文字为占位内容/);assert.doesNotMatch(html,/name="robots" content="noindex, nofollow"/);assert.match(html,/rel="canonical" href="https:\/\/reverian\.cc\//);}
 else assert.match(html,/name="robots" content="noindex, nofollow"/);
 for(const [tag] of html.matchAll(/<img\b[^>]*>/g)){
  if(tag.includes('class="hero-photo"')){assert.match(tag,/fetchpriority="high"/);assert.match(tag,/decoding="sync"/);assert.match(tag,/loading="eager"/);}
  else{assert.match(tag,/loading="lazy"/,file+': non-cover image must be lazy');assert.match(tag,/decoding="async"/,file+': non-cover image must decode asynchronously');}
  if(tag.includes('id="viewer-image"'))continue;
  assert.match(tag,/alt="[^"]+"/,file+': missing alt');assert.match(tag,/width="\d+"/,file+': missing width');assert.match(tag,/height="\d+"/,file+': missing height');
 }
 assert.doesNotMatch(html,/(?:sk_live_|SANITY_READ_TOKEN\s*=|ghp_[A-Za-z0-9]+)/);
}
console.log(`PASS ${pages.length} pages, ${links} local references, ${metadata.size} WebP assets; size budgets, real srcset widths, lazy loading, Lightbox and canonical URLs.`);
