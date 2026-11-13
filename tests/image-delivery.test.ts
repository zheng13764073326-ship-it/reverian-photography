import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { localizeImages } from '../scripts/localize-images.mjs';

const base = 'https://cdn.sanity.io/images/j0zkvef5/production/' + 'a'.repeat(40) + '-3000x2000.jpg';
const jpeg = Uint8Array.from([255,216,255,224,0,1,255,217]);
async function fixture(t) {
 const dir = await mkdtemp(join(tmpdir(),'reverian-images-'));
 t.after(() => rm(dir,{recursive:true,force:true}));
 const dist=join(dir,'dist'),cache=join(dir,'cache');
 await mkdir(dist);
 return {dist,cache,delay:async()=>{},log:()=>{}};
}
test('localizes responsive images, fallback, full-size links and absolute social previews; reuses cache', async t => {
 const options=await fixture(t), calls=[];
 const html=`<meta property="og:image" content="${base}?w=1200&amp;auto=format"><a href="${base}?w=2400"><img src="${base}?w=1200&amp;auto=format" srcset="${base}?w=400 400w, ${base}?w=800 800w" data-fallback-src="${base}?w=800"></a>`;
 await writeFile(join(options.dist,'index.html'),html);
 const fetchImage=async url=>{calls.push(url);return new Response(jpeg,{headers:{'content-type':'image/jpeg'}});};
 const result=await localizeImages({...options,fetchImage});
 assert.equal(result.variants,4);assert.equal(calls.length,4);
 assert.ok(calls.every(url=>new URL(url).searchParams.get('fm')==='jpg'&&!url.includes('amp;')&&!url.includes('auto=')));
 const rewritten=await readFile(join(options.dist,'index.html'),'utf8');
 assert.doesNotMatch(rewritten,/cdn\.sanity/);
 assert.match(rewritten,/content="https:\/\/reverian-photography.pages.dev\/_photos\/[^" ]+\.jpg"/);
 assert.match(rewritten,/srcset="\/_photos\/[^ ]+ 400w, \/_photos\/[^ ]+ 800w"/);
 for(const [path] of rewritten.matchAll(/\/_photos\/[a-f0-9]+\.jpg/g)) assert.deepEqual(await readFile(join(options.dist,path)),Buffer.from(jpeg));
 await writeFile(join(options.dist,'index.html'),html);
 const again=await localizeImages({...options,fetchImage:async()=>{throw Error('cache should be used');}});
 assert.equal(again.cached,4);assert.equal(again.downloaded,0);
});
test('retries transient failures, preserves crop settings and fails the build without rewriting HTML on missing assets', async t => {
 const options=await fixture(t);
 const html=`<img src="${base}?w=1200&amp;h=800&amp;fit=crop&amp;crop=focalpoint&amp;fp-x=0.3&amp;fp-y=0.6">`;
 const file=join(options.dist,'index.html');await writeFile(file,html);
 let tries=0;
 await localizeImages({...options,fetchImage:async url=>{
   tries++; const p=new URL(url).searchParams;assert.equal(p.get('h'),'800');assert.equal(p.get('fp-x'),'0.3');
   return tries===1?new Response('',{status:503}):new Response(jpeg,{headers:{'content-type':'image/jpeg'}});
 }});
 assert.equal(tries,2);
 const missing=html.replace('w=1200','w=1920');await writeFile(file,missing);tries=0;
 await assert.rejects(localizeImages({...options,fetchImage:async()=>{tries++;return new Response('missing',{status:404});}}),/Cannot publish image/);
 assert.equal(tries,3);assert.equal(await readFile(file,'utf8'),missing);
});
test('rejects HTML responses disguised as images', async t => {
 const options=await fixture(t);await writeFile(join(options.dist,'index.html'),`<img src="${base}">`);
 await assert.rejects(localizeImages({...options,attempts:1,fetchImage:async()=>new Response('<html>bad</html>',{headers:{'content-type':'image/jpeg'}})}),/Invalid/);
});
