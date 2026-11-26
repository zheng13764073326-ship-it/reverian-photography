import test from 'node:test';
import assert from 'node:assert/strict';
import {DecodedPhotos} from '../apps/web/src/lib/decoded-photos.ts';

function fixture(limit=3){
 const images:FakeImage[]=[];
 class FakeImage {
  src='';naturalWidth=0;decoding='';loading='';fetchPriority='';
  resolve!:()=>void;reject!:(error:Error)=>void;
  promise=new Promise<void>((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});
  decode(){return this.promise;}
  removeAttribute(name:string){if(name==='src')this.src='';}
  finish(){this.naturalWidth=1600;this.resolve();}
 }
 const cache=new DecodedPhotos(limit,()=>{const image=new FakeImage();images.push(image);return image as unknown as HTMLImageElement;});
 return {cache,images};
}

test('deduplicates concurrent requests, promotes a neighbour and only exposes decoded photos',async()=>{
 const {cache,images}=fixture();const first=cache.load('a','low');
 assert.equal(cache.peek('a'),undefined);assert.equal(images[0].fetchPriority,'low');
 assert.equal(cache.load('a'),first);assert.equal(images.length,1);assert.equal(images[0].fetchPriority,'high');
 assert.equal(images[0].loading,'eager');assert.equal(images[0].decoding,'async');
 images[0].finish();assert.equal(await first,images[0]);assert.equal(cache.peek('a'),images[0]);
 assert.equal(await cache.load('a'),images[0]);assert.equal(images.length,1);
});

test('keeps recently used photos and releases the least recently used decoded image',async()=>{
 const {cache,images}=fixture(2);
 const a=cache.load('a');images[0].finish();await a;
 const b=cache.load('b');images[1].finish();await b;
 await cache.load('a');const c=cache.load('c');images[2].finish();await c;
 assert.equal(cache.peek('a'),images[0]);assert.equal(cache.peek('b'),undefined);assert.equal(cache.peek('c'),images[2]);
 const again=cache.load('b');assert.equal(images.length,4);images[3].finish();await again;
});

test('eviction cancels pending decode and an old failure cannot remove its replacement',async()=>{
 const {cache,images}=fixture(1);
 const old=cache.load('a');const oldRejection=assert.rejects(old,/cancelled/);
 const b=cache.load('b');const bRejection=assert.rejects(b,/cancelled/);assert.equal(images[0].src,'');
 const replacement=cache.load('a');images[0].reject(Error('Late old decode failure'));
 await oldRejection;await bRejection;await Promise.resolve();
 assert.equal(cache.load('a'),replacement);assert.equal(images.length,3);
 images[2].finish();await replacement;assert.equal(cache.peek('a'),images[2]);
});

test('failed or empty photos can be retried without poisoning the cache',async()=>{
 const {cache,images}=fixture();
 const failed=cache.load('a');images[0].reject(Error('Network failure'));await assert.rejects(failed,/Network failure/);
 const empty=cache.load('a');images[1].resolve();await assert.rejects(empty,/Empty photograph/);
 const valid=cache.load('a');images[2].finish();await valid;assert.equal(cache.peek('a'),images[2]);
});

test('closing releases all entries and late completion cannot restore a cleared image',async()=>{
 const {cache,images}=fixture();
 const ready=cache.load('ready');images[0].finish();await ready;
 const pending=cache.load('pending');const rejection=assert.rejects(pending,/cancelled/);
 cache.clear();await rejection;assert.equal(cache.peek('ready'),undefined);assert.equal(images[1].src,'');
 images[1].finish();await Promise.resolve();assert.equal(cache.peek('pending'),undefined);
 const reopened=cache.load('pending');images[2].finish();await reopened;assert.equal(cache.peek('pending'),images[2]);
});
