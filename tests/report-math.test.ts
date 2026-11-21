import test from 'node:test';
import assert from 'node:assert/strict';
import {analysePixels,wavePoints,wavePath,dimensionScores} from '../apps/web/src/lib/report-math.ts';
const pixels=(colors:number[][])=>new Uint8ClampedArray(colors.flatMap(c=>[...c,255]));
test('every correct node coincides and incorrect nodes remain separated',()=>{
 for(let mask=0;mask<1024;mask++){
  const correct=Array.from({length:10},(_,i)=>Boolean(mask&(1<<i))),{mine,visitor}=wavePoints(correct);
  assert.equal(mine.length,10);correct.forEach((same,i)=>{assert.equal(mine[i].x,visitor[i].x);assert.equal(mine[i].y===visitor[i].y,same);});
  assert.ok(!wavePath(visitor).includes('NaN'));
 }
});
test('pixel analysis measures dark, light and warm/cool images without invented values',()=>{
 const dark=analysePixels(pixels([[0,0,0]])),light=analysePixels(pixels([[255,255,255]]));
 assert.equal(dark.brightness,0);assert.equal(light.brightness,100);assert.equal(light.neutral,100);assert.deepEqual(dark.palette,Array(5).fill('#000000'));
 assert.equal(analysePixels(pixels([[255,0,0]])).warm,100);assert.equal(analysePixels(pixels([[0,0,255]])).cool,100);
 assert.throws(()=>analysePixels(new Uint8ClampedArray([255,0,0,0])));
});
test('representative colors preserve an equal five-color sample and proportions sum to 100',()=>{
 const a=analysePixels(pixels([[240,20,20],[20,240,20],[20,20,240],[230,230,230],[20,20,20]]));
 assert.deepEqual(new Set(a.palette),new Set(['#F01414','#14F014','#1414F0','#E6E6E6','#141414']));
 assert.equal(a.warm+a.cool+a.neutral,100);
 assert.equal(a.histogram.reduce((sum,n)=>sum+n,0),5);
});
test('radar normalizes each dimension by its own question count',()=>{
 assert.deepEqual(dimensionScores([true,true,false,false,true,false,false,false,true,true]),[.5,1/3,2/3]);
 assert.deepEqual(dimensionScores(Array(10).fill(true)),[1,1,1]);
 assert.deepEqual(dimensionScores(Array(10).fill(false)),[0,0,0]);
});
test('relative image luminance is finite and histogram covers every sampled pixel',()=>{
 const black=analysePixels(pixels([[0,0,0]])),white=analysePixels(pixels([[255,255,255]]));
 assert.equal(black.relativeEV,-2);assert.equal(white.relativeEV,2);assert.equal(black.histogram[0],1);assert.equal(white.histogram[31],1);
});

test('cool and warm luminance layers conserve every pixel without inventing curves',()=>{
 const a=analysePixels(pixels([[230,80,20],[20,80,230],[100,100,100],[0,0,0],[255,255,255]]));
 a.histogram.forEach((n,i)=>assert.ok(Math.abs(a.coolHistogram[i]+a.warmHistogram[i]-n)<1e-9));
 assert.equal(a.coolHistogram.reduce((n,v)=>n+v,0)+a.warmHistogram.reduce((n,v)=>n+v,0),a.samples);
 const red=analysePixels(pixels([[255,0,0]])),blue=analysePixels(pixels([[0,0,255]])),gray=analysePixels(pixels([[128,128,128]]));
 assert.equal(red.coolHistogram.reduce((n,v)=>n+v,0),0);
 assert.equal(blue.warmHistogram.reduce((n,v)=>n+v,0),0);
 assert.deepEqual(gray.coolHistogram,gray.warmHistogram);
});
