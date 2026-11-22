import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const issue=JSON.parse(await readFile(new URL('../apps/web/src/data/film/drift-01.json',import.meta.url),'utf8'));
test('Drift issue preserves 38 supplied frames once, eight notes and the initiator opening',()=>{
 const ids=issue.photos.map((p:{id:number})=>p.id).sort((a:number,b:number)=>a-b);
 assert.deepEqual(ids,Array.from({length:39},(_,i)=>i+1).filter(id=>id!==7));
 assert.equal(issue.notes.length,8);assert.deepEqual(issue.notes[0].ids,[9,10]);assert.equal(issue.notes[0].author,'挽风');
 const sequence=issue.notes.flatMap((n:{ids:number[];interlude:number[]})=>[...n.ids,...n.interlude]).concat(issue.ending);
 assert.equal(sequence.length,38);assert.equal(new Set(sequence).size,38);assert.deepEqual([...sequence].sort((a:number,b:number)=>a-b),ids);
 assert.equal(issue.notes.filter((n:{interlude:number[]})=>n.interlude.length).length,7);
 for(const note of issue.notes){assert.ok(note.text.trim());for(const id of note.ids)assert.equal(issue.photos.find((p:{id:number})=>p.id===id).author,note.author);}
 for(const photo of issue.photos){assert.equal(photo.number,sequence.indexOf(photo.id)+1);assert.ok(photo.alt);if(photo.author)assert.ok(issue.participants.includes(photo.author));}
 assert.equal(issue.theoretical-issue.total,issue.lost);
});
test('Film WebP files match optimized hashes, preserve proportions and cap full/preview dimensions',async()=>{
 const publicRoot=new URL('../apps/web/public/',import.meta.url);
 for(const photo of issue.photos){
  const original=await readFile(new URL(photo.original.slice(1),publicRoot));assert.equal(createHash('sha256').update(original).digest('hex'),photo.optimizedSha256);
  assert.match(photo.sha256,/^[a-f0-9]{64}$/); // Retain the original source checksum as provenance.
  const meta=await sharp(original).metadata();assert.equal(meta.format,'webp');assert.ok(Math.max(meta.width!,meta.height!)<=2048);assert.ok(Math.abs(meta.width!/meta.height!-photo.width/photo.height)<0.002);
  for(const variant of photo.srcset.split(', ')){const [path,width]=variant.split(' ');assert.ok(Number.parseInt(width)>0);const buffer=await readFile(new URL(path.slice(1),publicRoot));const meta=await sharp(buffer).metadata();assert.equal(meta.format,'webp');assert.equal(meta.width,Number.parseInt(width));assert.ok(Math.max(meta.width!,meta.height!)<=1200);}
 }
});
