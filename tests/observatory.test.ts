import test from 'node:test';
import assert from 'node:assert/strict';
import {dayDate,directionLabel,fetchObservatory,observation,observatoryUrl,parseObservatory,parsePlaces,placeKey,readObservatoryCache,type Place} from '../apps/web/src/lib/observatory.ts';
import {CACHE_AGE,shanghaiDate} from '../apps/web/src/lib/sunset.ts';
const place:Place={id:'shanghai',name:'上海',latitude:31.23,longitude:121.47};
const now=new Date('2026-11-23T04:00:00Z');
function fixture(){
 const dates=[0,1,2].map(i=>dayDate(i,now));
 const hourly:Record<string,Array<string|number|null>>={time:dates.flatMap(date=>Array.from({length:24},(_,h)=>date+'T'+String(h).padStart(2,'0')+':00'))};
 const specs:Record<string,[number,string]>={cloud_cover_high:[50,'%'],cloud_cover_mid:[40,'%'],cloud_cover_low:[10,'%'],precipitation_probability:[20,'%'],wind_speed_10m:[3,'m/s'],temperature_2m:[12,'°C'],visibility:[24000,'m']};
 for(const [key,[value]] of Object.entries(specs))hourly[key]=Array.from({length:72},(_,i)=>key==='cloud_cover_low'?value+Math.floor(i/24)*20:value);
 return {utc_offset_seconds:28800,daily:{time:dates,sunrise:dates.map(d=>d+'T06:30'),sunset:dates.map(d=>d+'T17:00')},hourly,hourly_units:Object.fromEntries(Object.entries(specs).map(([key,[,unit]])=>[key,unit]))};
}
test('three-day event selection keeps weather, calendar date and sample windows aligned',()=>{
 const data=parseObservatory(fixture(),now);assert.equal(data.hours.length,72);
 for(let day=0;day<3;day++)for(const event of ['sunrise','sunset'] as const){const reading=observation(place,dayDate(day,now),event,data,now);assert.equal(reading.source,'forecast');assert.equal(reading.metrics.low,10+day*20);assert.equal(reading.date,dayDate(day,now));assert.ok(reading.hours.length>=7&&reading.hours.length<=8);assert.equal(reading.visibility,24000);assert.equal(reading.temperature,12);assert.equal(shanghaiDate(new Date(reading.eventTime)),reading.date);}
});
test('astronomical windows and directions use morning/evening ordering and UTC+8 civil dates',()=>{
 for(const date of ['2026-11-23','2026-06-21'])for(const event of ['sunrise','sunset'] as const){const r=observation(place,date,event,null,now);assert.ok(r.golden[0]<r.golden[1]);assert.ok(r.blue[0]<r.blue[1]);assert.ok(r.arrival<r.blue[0]&&r.arrival<r.golden[0]);assert.ok(event==='sunrise'?r.blue[1]<r.eventTime:r.blue[0]>r.eventTime);assert.ok(event==='sunrise'?r.bearing>45&&r.bearing<135:r.bearing>225&&r.bearing<315);assert.equal(shanghaiDate(new Date(r.eventTime)),date);}
 assert.equal(directionLabel(90),'东');assert.equal(directionLabel(270),'西');assert.equal(directionLabel(359),'北');
 assert.equal(dayDate(0,new Date('2026-11-23T16:01Z')),'2026-11-24');assert.equal(dayDate(2,new Date('2026-12-31T16:01Z')),'2027-01-03');
});
test('sample fallback never invents hourly forecasts, temperature or visibility',()=>{
 const r=observation(place,dayDate(1,now),'sunrise',null,now);assert.equal(r.source,'sample');assert.deepEqual(r.hours,[]);assert.equal(r.visibility,null);assert.equal(r.temperature,null);assert.equal(r.advice.includes('西侧'),false);
});
test('missing cloud data, stale dates, invalid percentages, timezone or units reject the forecast',()=>{
 const edits=[(d:ReturnType<typeof fixture>)=>{d.hourly.cloud_cover_low[42]=null;},(d:ReturnType<typeof fixture>)=>{d.hourly.cloud_cover_high[1]=101;},(d:ReturnType<typeof fixture>)=>{d.hourly_units.wind_speed_10m='km/h';},(d:ReturnType<typeof fixture>)=>{d.utc_offset_seconds=0;},(d:ReturnType<typeof fixture>)=>{d.hourly.time[3]=d.hourly.time[2];}];
 for(const edit of edits){const d=fixture();edit(d);assert.throws(()=>parseObservatory(d,now));}
 assert.throws(()=>parseObservatory(fixture(),new Date('2026-11-24T04:00Z')));assert.throws(()=>parseObservatory(null,now));
});
test('optional atmosphere fields remain unknown without valid units or with nulls',()=>{
 const d=fixture();d.hourly.visibility[17]=null;d.hourly_units.temperature_2m='°F';const r=observation(place,dayDate(0,now),'sunset',parseObservatory(d,now),now);assert.equal(r.source,'forecast');assert.equal(r.visibility,null);assert.equal(r.temperature,null);
});
test('cache rejects another coordinate, expiration, future timestamps and date rollover',()=>{
 const pack=(at=now.getTime(),location=placeKey(place))=>JSON.stringify({at,place:location,data:fixture()});
 assert.equal(readObservatoryCache(pack(),place,now)?.source,'cache');assert.equal(readObservatoryCache(pack(now.getTime()-CACHE_AGE-1),place,now),null);assert.equal(readObservatoryCache(pack(now.getTime()+1),place,now),null);assert.equal(readObservatoryCache(pack(now.getTime(),'0,0'),place,now),null);assert.equal(readObservatoryCache(pack(),place,new Date('2026-11-23T16:01Z')),null);
});
test('requests ask for three days and both solar events; timeout and cancellation abort',async()=>{
 const url=new URL(observatoryUrl(place));assert.equal(url.searchParams.get('forecast_days'),'3');assert.equal(url.searchParams.get('daily'),'sunrise,sunset');assert.equal(url.searchParams.get('wind_speed_unit'),'ms');
 const slow=(async(_url:unknown,options:RequestInit)=>new Promise((_resolve,reject)=>{if(options.signal!.aborted)reject(Error('aborted'));options.signal!.addEventListener('abort',()=>reject(Error('aborted')));} )) as typeof fetch;
 await assert.rejects(fetchObservatory(place,undefined,slow,15),/aborted/);
 const controller=new AbortController();controller.abort();await assert.rejects(fetchObservatory(place,controller.signal,slow),/aborted/);
 await assert.rejects(fetchObservatory(place,undefined,(async()=>new Response('',{status:429})) as typeof fetch),/429/);
});
test('city lookup accepts bounded Chinese coordinates and rejects invalid locations',()=>{
 const good={id:1816670,name:'北京',admin1:'北京市',country_code:'CN',latitude:39.9,longitude:116.4};
 const places=parsePlaces({results:[good,{...good,latitude:NaN},{...good,longitude:200},{...good,country_code:'US'},{...good,name:null}]});assert.equal(places.length,1);assert.equal(places[0].name,'北京 · 北京市');assert.deepEqual(parsePlaces({}),[]);
});
