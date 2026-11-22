import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {selectFrames,frameGeometry,type WildFrame,type AboveFrame} from '../apps/web/src/lib/collections.ts';

const wild:WildFrame[]=JSON.parse(await readFile(new URL('../apps/web/src/data/collections/wild-encounters.json',import.meta.url),'utf8'));
const above:AboveFrame[]=JSON.parse(await readFile(new URL('../apps/web/src/data/collections/from-above.json',import.meta.url),'utf8'));

test('collection data keeps unique IDs, supported categories and stable image geometry',()=>{
  assert.equal(new Set([...wild,...above].map(frame=>frame.id)).size,wild.length+above.length);
  for(const frame of [...wild,...above]){assert.ok(frame.title);assert.equal(typeof frame.src,'string');}
  for(const frame of wild){
    assert.ok(['birds','beneath','portraits'].includes(frame.category));
    assert.ok(['WILD','ZOO','AQUARIUM'].includes(frame.environment));
    assert.ok(['3:2','2:3','4:5'].includes(frame.aspectRatio));
    const {width,height,padding}=frameGeometry(frame);
    assert.ok(width>0&&height>0);assert.equal(padding,height/width*100);
  }
  for(const frame of above){assert.ok(['aerial','window'].includes(frame.category));assert.ok(frame.meta);}
});

test('filtering happens before pagination, preserves source order and never mutates data',()=>{
  const items=Array.from({length:30},(_,i)=>({id:i,category:i%2?'birds':'beneath',src:i===1?'/future.webp':''}));
  const snapshot=JSON.stringify(items);
  assert.deepEqual(selectFrames(items,'birds',12).map(f=>f.id),Array.from({length:12},(_,i)=>i*2+1));
  assert.equal(selectFrames(items,'birds',24).length,15);
  assert.equal(selectFrames(items,'all',12).length,12);
  assert.equal(selectFrames(items,'birds')[0].src,'/future.webp');
  assert.deepEqual(selectFrames(items,'missing'),[]);
  assert.deepEqual(selectFrames(items,'all',0),[]);
  assert.equal(JSON.stringify(items),snapshot);
});

test('aerial sequences retain wide/half/half rhythm after each category filter',()=>{
  for(const category of ['all','aerial','window']){
    const frames=selectFrames(above,category);
    assert.ok(frames.length>0);assert.equal(frames.length%3,0);
    frames.forEach((frame,i)=>assert.equal(frame.layout,i%3===0?'wide':'half'));
  }
  assert.equal(frameGeometry({layout:'wide'}).aspectRatio,'21:9');
  assert.equal(frameGeometry({layout:'half'}).aspectRatio,'3:2');
  assert.equal(frameGeometry({aspectRatio:'2:3'}).padding,150);
  for(const aspectRatio of ['0:3','-1:2','1:NaN','3:2:1','landscape'])assert.throws(()=>frameGeometry({aspectRatio}),/Invalid frame/);
});
