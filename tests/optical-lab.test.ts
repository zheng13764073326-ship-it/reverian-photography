import {dateAt} from '../apps/web/src/lib/local-time.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {scoreSunset,parseForecast,sampleReading,sunsetBearing,forecastUrl,readCachedForecast,fetchForecast,shanghaiDate,CACHE_AGE,type City} from '../apps/web/src/lib/sunset.ts';
const dataDir=new URL('../apps/web/src/data/lab/',import.meta.url);
const cities:City[]=JSON.parse(await readFile(new URL('cities.json',dataDir),'utf8'));
const city=cities[0],now=new Date('2026-11-22T04:00:00Z');
function fixture(){return {utc_offset_seconds:28800,daily:{time:['2026-11-22'],sunset:['2026-11-22T17:00']},hourly_units:{cloud_cover_high:'%',cloud_cover_mid:'%',cloud_cover_low:'%',precipitation_probability:'%',wind_speed_10m:'m/s'},hourly:{time:['2026-11-22T15:00','2026-11-22T16:00','2026-11-22T17:00','2026-11-22T18:00','2026-11-22T19:00'],cloud_cover_high:[100,30,60,75,100],cloud_cover_mid:[100,45,45,45,100],cloud_cover_low:[100,10,20,30,100],precipitation_probability:[100,10,20,50,100],wind_speed_10m:[90,2,3,4,90]}};}

test('sunset score favors mid/high cloud, penalizes low cloud and rain and remains bounded',()=>{
  const clear={high:50,mid:50,low:10,rain:0,wind:3};
  assert.ok(scoreSunset(clear).score>85);
  assert.ok(scoreSunset({...clear,low:80}).score<35);
  assert.ok(scoreSunset({...clear,rain:80}).score<scoreSunset(clear).score);
  assert.ok(scoreSunset({...clear,high:0,mid:0}).score<50);
  assert.ok(scoreSunset({...clear,high:100,mid:100}).score<scoreSunset(clear).score);
  assert.equal(scoreSunset(clear).score,scoreSunset({...clear,wind:25}).score);
  for(const high of [0,30,75,100])for(const mid of [0,30,75,100])for(const low of [0,60,61,100])for(const rain of [0,100]){const {score}=scoreSunset({high,mid,low,rain,wind:0});assert.ok(Number.isInteger(score)&&score>=0&&score<=100);}
  assert.throws(()=>scoreSunset({...clear,high:NaN}));
});
test('sunset window uses Shanghai-local timestamps, ±1 hour means and peak precipitation',()=>{
  const result=parseForecast(fixture(),city,now);
  assert.equal(result.sunset,'2026-11-22T09:00:00.000Z');assert.equal(result.samples,3);
  assert.deepEqual(result.metrics,{high:55,mid:45,low:20,rain:50,wind:3});
  assert.ok(result.bearing>240&&result.bearing<260);assert.equal(result.source,'forecast');
  assert.equal(shanghaiDate(new Date('2026-11-22T16:01Z')),'2026-11-23');
});
test('incomplete, stale, wrong-unit and null weather never become an optimistic zero-cloud forecast',()=>{
  const missing=fixture();missing.hourly.cloud_cover_low[2]=null as unknown as number;assert.throws(()=>parseForecast(missing,city,now));
  const invalid=fixture();invalid.hourly.cloud_cover_high[2]=101;assert.throws(()=>parseForecast(invalid,city,now));
  const units=fixture();units.hourly_units.wind_speed_10m='km/h';assert.throws(()=>parseForecast(units,city,now));
  const short=fixture();short.hourly.time=['2026-11-22T17:00'];assert.throws(()=>parseForecast(short,city,now));
  assert.throws(()=>parseForecast(fixture(),city,new Date('2026-11-23T04:00Z')));
  assert.throws(()=>parseForecast(null,city,now));
});
test('cache is city-specific, same-day and at most 15 minutes old',()=>{
  const pack=(at=now.getTime(),id=city.id)=>JSON.stringify({at,city:id,data:fixture()});
  assert.equal(readCachedForecast(pack(),city,now)?.source,'cache');
  assert.equal(readCachedForecast(pack(now.getTime()-CACHE_AGE-1),city,now),null);
  assert.equal(readCachedForecast(pack(now.getTime()+1),city,now),null);
  assert.equal(readCachedForecast(pack(now.getTime(),'nanjing'),city,now),null);
  assert.equal(readCachedForecast('broken',city,now),null);
  assert.equal(readCachedForecast(pack(),city,new Date('2026-11-23T04:00Z')),null);
});
test('fallbacks are explicitly samples; SunCalc uses north-clockwise degrees in both seasons',()=>{
  for(const entry of cities){const sample=sampleReading(entry,now);assert.equal(sample.source,'sample');assert.equal(sample.samples,0);assert.equal(sample.date,dateAt(now,entry.timezone||'Asia/Shanghai'));assert.equal(dateAt(sample.sunset,entry.timezone||'Asia/Shanghai'),sample.date);assert.ok(sample.bearing>230&&sample.bearing<260);}
  const summer=sampleReading(city,new Date('2026-06-21T04:00Z'));assert.ok(summer.bearing>290&&summer.bearing<305);
  assert.equal(sunsetBearing(new Date(summer.sunset),city),summer.bearing);
  const url=new URL(forecastUrl(city));assert.equal(url.hostname,'api.open-meteo.com');assert.equal(url.searchParams.get('timezone'),'Asia/Shanghai');assert.equal(url.searchParams.get('wind_speed_unit'),'ms');assert.equal(url.searchParams.has('apikey'),false);
});
test('weather requests abort on timeout and reject HTTP failures',async()=>{
  const slow=(async (_url:unknown,options:RequestInit)=>new Promise((_resolve,reject)=>options.signal!.addEventListener('abort',()=>reject(new Error('timed out'))))) as typeof fetch;
  await assert.rejects(fetchForecast(city,slow,15),/timed out/);
  await assert.rejects(fetchForecast(city,(async()=>new Response('',{status:429})) as typeof fetch),/429/);
});
test('guide outlines and ten AI studies include real source/artwork pairs',async()=>{
  const guides=JSON.parse(await readFile(new URL('guides.json',dataDir),'utf8'));
  assert.deepEqual(guides.map((g:any)=>g.title),['相机选择','镜头选择','焦距逻辑','曝光三角']);
  assert.equal(new Set(guides.map((g:any)=>g.id)).size,4);
  for(const guide of guides){assert.ok(guide.summary&&guide.tag&&guide.readTime);assert.ok(guide.content.length>=3);assert.ok(guide.content.every((section:any)=>section.heading&&section.points.length));}
  const prompts=JSON.parse(await readFile(new URL('prompts.json',dataDir),'utf8'));
  assert.equal(prompts.length,10);
  assert.equal(new Set(prompts.map((p:any)=>p.id)).size,10);
  assert.equal(new Set(prompts.map((p:any)=>p.original.photoId)).size,10);
  for(const prompt of prompts){
    assert.ok(prompt.title&&prompt.style&&prompt.category&&prompt.categoryLabel);
    for(const section of ['创作目标：','原图依据：','画面语言：','约束：'])assert.ok(prompt.prompt.includes(section));
    assert.notEqual(prompt.original.src,prompt.artwork.src);
    assert.match(prompt.original.albumHref,/^\/(?:albums\/[^/]+|about)\/$/);
    assert.equal(prompt.generator,'OpenAI image_gen');
    for(const image of [prompt.original,prompt.artwork]){
      assert.ok(image.alt&&image.width>0&&image.height>0);
      for(const source of [image.src,image.preview]){
        assert.match(source,/^\/images\/ai-creations\/[a-z0-9_-]+\.webp$/);
        assert.ok((await stat(new URL('../apps/web/public'+source,import.meta.url))).size>1000);
      }
    }
  }
});
