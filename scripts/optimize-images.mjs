import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,writeFile,copyFile,stat,unlink,realpath} from 'node:fs/promises';
import {resolve,join,relative,dirname,extname,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';

const hash=data=>createHash('sha256').update(data).digest('hex');
const inside=(parent,child)=>{const rel=relative(parent,child);return !rel||(!rel.startsWith('..')&&!isAbsolute(rel));};
async function scan(dir){const files=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())files.push(...await scan(p));else if(e.isFile()&&/\.(jpe?g|png)$/i.test(e.name))files.push(p);}return files.sort();}
const mb=n=>(n/1024/1024).toFixed(2)+' MiB';

/** Back up every original and verify its hash before encoding or deleting anything. */
export async function optimizeImages({input,output=input,backup,projectRoot,manifest,hero=[],removeOriginals=false,log=console.log}){
 if(!backup)throw Error('An external --backup directory is required.');
 input=await realpath(resolve(input));projectRoot=await realpath(resolve(projectRoot));
 await mkdir(resolve(backup),{recursive:true});backup=await realpath(resolve(backup));
 if(inside(projectRoot,backup)||inside(input,backup))throw Error('Backup must be outside the project and input directories.');
 await mkdir(resolve(output),{recursive:true});output=await realpath(resolve(output));
 if(inside(output,backup)||inside(backup,output))throw Error('Backup and output must be separate directories.');
 const files=await scan(input),originals=[],keys=new Set();
 const images=manifest?JSON.parse(await readFile(manifest,'utf8').catch(e=>{if(e.code!=='ENOENT')throw e;return '{}';})):{};
 if(!files.length){log('No JPG/PNG originals found; existing WebP files and manifest were left unchanged.');return {images,report:{count:0}};}
 for(const file of files){
  const name=relative(input,file).replaceAll('\\','/'),key=name.slice(0,-extname(name).length);
  if(keys.has(key.toLowerCase()))throw Error('JPG/PNG basename collision: '+key);keys.add(key.toLowerCase());
  const data=await readFile(file),digest=hash(data),destination=join(backup,name);
  await mkdir(dirname(destination),{recursive:true});
  const existing=await readFile(destination).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
  if(existing&&hash(existing)!==digest)throw Error('Refusing to overwrite a different backup: '+destination);
  if(!existing)await copyFile(file,destination);
  if(hash(await readFile(destination))!==digest)throw Error('Backup verification failed: '+name);
  originals.push({file,name,key,bytes:data.length,sha256:digest});
 }
 await writeFile(join(backup,'originals-manifest.json'),JSON.stringify({input,created:new Date().toISOString(),files:originals.map(({file,...entry})=>entry)},null,2)+'\n');
 log(`Backup verified: ${originals.length} originals, ${backup}`);
 let thumbnailBytes=0,fullBytes=0,responsiveBytes=0;
 for(const [index,source] of originals.entries()){
  const data=await readFile(source.file);
  if(hash(data)!==source.sha256)throw Error('Original changed after backup: '+source.name);
  const meta=await sharp(data).metadata();
  const orientation=meta.orientation||1,width=orientation>=5?meta.height:meta.width,height=orientation>=5?meta.width:meta.height;
  if(!width||!height)throw Error('Image dimensions unavailable: '+source.name);
  const maxEdge=Math.max(width,height),heroImage=hero.includes(source.name)||hero.includes(source.key);
  async function encode(suffix,edge,quality){
   const name=source.key+suffix+'.webp',destination=join(output,name);
   await mkdir(dirname(destination),{recursive:true});
   const encoded=await sharp(data).rotate().resize({width:edge,height:edge,fit:'inside',withoutEnlargement:true}).webp({quality,effort:5}).toBuffer({resolveWithObject:true});
   await writeFile(destination,encoded.data);
   return {src:'/images/'+name,width:encoded.info.width,height:encoded.info.height,bytes:encoded.data.length};
  }
  const thumbnail=await encode('_thumb',1200,80),full=await encode('',heroImage?2400:2048,84),thumbnails=[];
  for(const edge of [480,800])if(edge<Math.min(maxEdge,1200)){const item=await encode('_thumb-'+edge,edge,80);thumbnails.push(item);responsiveBytes+=item.bytes;}
  thumbnails.push(thumbnail);
  const lqip='data:image/webp;base64,'+(await sharp(data).rotate().resize({width:24,height:24,fit:'inside',withoutEnlargement:true}).webp({quality:30}).toBuffer()).toString('base64');
  images[source.key]={width,height,thumbnail,full,thumbnails,lqip};
  thumbnailBytes+=thumbnail.bytes;fullBytes+=full.bytes;
  if((index+1)%10===0||index+1===originals.length)log(`Optimized ${index+1}/${originals.length} images`);
 }
 if(manifest){await mkdir(dirname(resolve(manifest)),{recursive:true});await writeFile(manifest,JSON.stringify(images,null,2)+'\n');}
 // No original is removed until ALL outputs have succeeded and backup hashes still match.
 if(removeOriginals){
  for(const source of originals)if(hash(await readFile(join(backup,source.name)))!==source.sha256||hash(await readFile(source.file))!==source.sha256)throw Error('Original/backup changed; refusing removal: '+source.name);
  for(const source of originals)await unlink(source.file);
 }
 const originalBytes=originals.reduce((n,f)=>n+f.bytes,0),outputBytes=thumbnailBytes+fullBytes+responsiveBytes;
 const report={count:originals.length,originalBytes,thumbnailBytes,fullBytes,responsiveBytes,outputBytes,savedPercent:originalBytes?Number(((1-outputBytes/originalBytes)*100).toFixed(1)):0,backup};
 log(`Originals: ${mb(originalBytes)} | thumbnails: ${mb(thumbnailBytes)} | full-size: ${mb(fullBytes)} | small responsive files: ${mb(responsiveBytes)} | total WebP: ${mb(outputBytes)} | saved ${report.savedPercent}%`);
 return {images,report};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const root=resolve(import.meta.dirname,'..'),args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1];};
 if(args.includes('--help'))console.log('node scripts/optimize-images.mjs --backup <outside-project-dir> [--input <JPG/PNG-dir>] [--output <WebP-dir>] [--hero <relative-file,relative-file>] [--remove-originals]\nDefaults: input/output apps/web/public/images; manifest apps/web/src/data/local-images.json. Originals are backed up and checksum-verified before encoding. --remove-originals only removes backed-up JPG/PNG after every conversion succeeds.');
 else await optimizeImages({input:value('--input')||join(root,'apps/web/public/images'),output:value('--output')||value('--input')||join(root,'apps/web/public/images'),backup:value('--backup'),projectRoot:root,manifest:value('--manifest')||join(root,'apps/web/src/data/local-images.json'),hero:(value('--hero')||'home-desk.png,covers/kinmen-portrait-v3-941.jpg').split(','),removeOriginals:args.includes('--remove-originals')});
}
