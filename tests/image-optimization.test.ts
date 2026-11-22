import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,stat} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import sharp from 'sharp';
sharp.cache(false);
import {optimizeImages} from '../scripts/optimize-images.mjs';
import {imageSize,imageWidths} from '../apps/web/src/lib/image-sizing.ts';

async function fixture(t:any){const dir=await mkdtemp(join(tmpdir(),'reverian-compression-'));t.after(async()=>{assert.equal(dirname(resolve(dir)),resolve(tmpdir()));await rm(dir,{recursive:true,force:true});});const projectRoot=join(dir,'project'),input=join(projectRoot,'images'),backup=join(dir,'backup');await mkdir(input,{recursive:true});return {input,projectRoot,backup,manifest:join(projectRoot,'images.json'),log:()=>{}};}

test('rotates EXIF portraits before proportional resizing and verifies external backups before removing originals',async t=>{
 const f=await fixture(t);const raw=Buffer.alloc(3600*2400*3);for(let y=0;y<2400;y++)for(let x=0;x<3600;x++){const p=(y*3600+x)*3;raw[p]=x<1800?240:10;raw[p+1]=x<1800?10:240;raw[p+2]=10;}
 const original=await sharp(raw,{raw:{width:3600,height:2400,channels:3}}).jpeg({quality:90}).withMetadata({orientation:6}).toBuffer();
 await writeFile(join(f.input,'portrait.JPG'),original);
 const {images,report}=await optimizeImages({...f,removeOriginals:true});
 assert.deepEqual(await readFile(join(f.backup,'portrait.JPG')),original);assert.equal(await stat(join(f.input,'portrait.JPG')).catch(()=>null),null);
 assert.deepEqual([images.portrait.width,images.portrait.height],[2400,3600]);
 const thumb=await sharp(join(f.input,'portrait_thumb.webp')).metadata(),full=await sharp(join(f.input,'portrait.webp')).metadata();
 assert.deepEqual([thumb.width,thumb.height],[800,1200]);assert.equal(full.height,2048);assert.ok(!thumb.orientation);assert.ok(report.outputBytes>0);
 const {data,info}=await sharp(join(f.input,'portrait_thumb.webp')).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const top=(100*info.width+Math.floor(info.width/2))*info.channels,bottom=((info.height-100)*info.width+Math.floor(info.width/2))*info.channels;
 assert.ok(data[top]>data[top+1]+100,'red left half must rotate to the top');assert.ok(data[bottom+1]>data[bottom]+100,'green right half must rotate to the bottom');
 const manifest=await readFile(f.manifest,'utf8');await optimizeImages(f);assert.equal(await readFile(f.manifest,'utf8'),manifest,'repeat run must retain existing manifest');
});

test('preserves PNG transparency without upscaling and grants only specified covers a 2400px full-size limit',async t=>{
 const f=await fixture(t);
 await writeFile(join(f.input,'icon.png'),await sharp({create:{width:64,height:32,channels:4,background:{r:200,g:100,b:40,alpha:0.5}}}).png().toBuffer());
 await writeFile(join(f.input,'cover.jpg'),await sharp({create:{width:3000,height:1800,channels:3,background:'#898989'}}).jpeg().toBuffer());
 await optimizeImages({...f,hero:['cover.jpg']});
 const icon=await sharp(join(f.input,'icon.webp')).metadata(),cover=await sharp(join(f.input,'cover.webp')).metadata(),thumb=await sharp(join(f.input,'cover_thumb.webp')).metadata();
 assert.deepEqual([icon.width,icon.height,icon.hasAlpha],[64,32,true]);assert.equal(cover.width,2400);assert.equal(thumb.width,1200);
});

test('refuses in-project backups and retains every original if any conversion fails',async t=>{
 const f=await fixture(t),good=await sharp({create:{width:20,height:30,channels:3,background:'red'}}).jpeg().toBuffer();
 await writeFile(join(f.input,'a.jpg'),good);await writeFile(join(f.input,'broken.png'),'not an image');
 await assert.rejects(optimizeImages({...f,backup:join(f.projectRoot,'backup'),removeOriginals:true}),/outside/);
 await assert.rejects(optimizeImages({...f,removeOriginals:true}));
 assert.deepEqual(await readFile(join(f.input,'a.jpg')),good);assert.equal(await readFile(join(f.input,'broken.png'),'utf8'),'not an image');assert.deepEqual(await readFile(join(f.backup,'a.jpg')),good);
});

test('responsive widths honor the longest edge for portrait, landscape, crop and small source images',()=>{
 assert.deepEqual(imageSize(4000,6000,1200),{width:800,height:1200});
 assert.deepEqual(imageWidths(4000,6000),[400,800]);
 assert.deepEqual(imageSize(6000,4000,4096,'hero'),{width:2400,height:1600});
 assert.ok(imageSize(4000,6000,4096,'lightbox').height<=2048);
 assert.deepEqual(imageSize(300,600,1200),{width:300,height:600});
 assert.ok(imageSize(6000,4000,1200,'thumbnail',9/16).height<=1200);
});
