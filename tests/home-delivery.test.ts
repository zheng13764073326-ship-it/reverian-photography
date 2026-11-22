import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {optimizeHome} from '../scripts/optimize-home.mjs';

async function fixture(t:any){
 const dist=await mkdtemp(join(tmpdir(),'reverian-home-'));
 t.after(async()=>{assert.equal(dirname(resolve(dist)),resolve(tmpdir()));await rm(dist,{recursive:true,force:true});});
 await mkdir(join(dist,'_astro'));
 return {dist,log:()=>{}};
}

test('homepage inlines CSS in cascade order and defers only non-cover images with equal-ratio no-script fallbacks',async t=>{
 const f=await fixture(t),hero='<img class="hero-photo" src="/cover.webp" width="941" height="1671" loading="eager" fetchpriority="high" decoding="sync">';
 const photo='<img src="/photo.webp" srcset="/small.webp 400w, /photo.webp 1200w" sizes="100vw" width="1200" height="800" alt="作品" loading="lazy" decoding="async">';
 const css='@font-face{font-family:demo;src:url(/_astro/demo.woff2)}@media(max-width:800px){.grid{display:block}}';
 const intro='<div id="aperture-intro"></div><script>setTimeout(()=>{},2200)</script>';
 await writeFile(join(f.dist,'_astro/base.css'),css);await writeFile(join(f.dist,'_astro/home.css'),'.hero{height:100vh;height:100svh}');
 await writeFile(join(f.dist,'index.html'),`<html><head><link rel="stylesheet" href="/_astro/base.css"><link rel="stylesheet" href="/_astro/home.css"></head><body>${intro}${hero}${photo}<img id="viewer-image" loading="lazy" decoding="async"></body></html>`);
 const r=await optimizeHome(f),html=await readFile(join(f.dist,'index.html'),'utf8');
 assert.equal(r.styles,2);assert.equal(r.deferred,1);assert.ok(html.includes(hero));assert.ok(html.includes(intro));assert.ok(html.includes(css));
 assert.ok(html.indexOf('data-home-css="/_astro/base.css"')<html.indexOf('data-home-css="/_astro/home.css"'));
 assert.doesNotMatch(html,/<link[^>]+rel="stylesheet"/);
 assert.ok(html.includes('<noscript>'+photo+'</noscript>'));
 const jsMarkup=html.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/g,'');
 const tag=jsMarkup.match(/<img data-deferred-image[^>]*>/)![0];
 assert.match(tag,/data-src="\/photo.webp"/);assert.match(tag,/data-srcset="\/small.webp 400w, \/photo.webp 1200w"/);
 assert.doesNotMatch(tag,/\ssrcset=/);const placeholder=decodeURIComponent(tag.match(/\ssrc="data:image\/svg\+xml,([^"]+)"/)![1]);
 assert.match(placeholder,/viewBox="0 0 1200 800"/);assert.match(tag,/loading="lazy"/);assert.match(tag,/decoding="async"/);
 assert.deepEqual(await optimizeHome(f),{unchanged:true});assert.equal(await readFile(join(f.dist,'index.html'),'utf8'),html);
});

test('unexpected stylesheet URLs fail before altering the output HTML',async t=>{
 const f=await fixture(t),html='<head><link rel="stylesheet" href="https://example.org/styles.css"></head><body></body>';
 await writeFile(join(f.dist,'index.html'),html);await assert.rejects(optimizeHome(f),/Unexpected homepage stylesheet/);
 assert.equal(await readFile(join(f.dist,'index.html'),'utf8'),html);
});
