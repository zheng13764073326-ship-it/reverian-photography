import test from 'node:test';
import assert from 'node:assert/strict';
import {coordinates,geocodingUrl,dayDate,directionLabel,fetchObservatory,observation,observatoryUrl,parseObservatory,parsePlaces,placeKey,readObservatoryCache,type Place} from '../apps/web/src/lib/observatory.ts';
import {CACHE_AGE,shanghaiDate} from '../apps/web/src/lib/sunset.ts';
import {civilNoon,dateAt,timeAt,offsetMinutes,zoneLabel} from '../apps/web/src/lib/local-time.ts';
const place:Place={id:'shanghai',name:'上海',latitude:31.23,longitude:121.47,timezone:'Asia/Shanghai'};
const now=new Date('2026-11-23T04:00:00Z');
function fixture(at=now,timezone=place.timezone){
 const dates=[0,1,2].map(i=>dayDate(i,at,timezone)),offset=offsetMinutes(at,timezone)*60;
 const midnight=(date:string)=>Date.parse(date+'T00:00:00Z')/1000-offset;
 const hourly:Record<string,Array<number|null>>={time:Array.from({length:72},(_,i)=>midnight(dates[0])+i*3600)};
 const specs:Record<string,[number,string]>={cloud_cover_high:[50,'%'],cloud_cover_mid:[40,'%'],cloud_cover_low:[10,'%'],precipitation_probability:[20,'%'],wind_speed_10m:[3,'m/s'],temperature_2m:[12,'°C'],visibility:[24000,'m']};
 for(const [key,[value]] of Object.entries(specs))hourly[key]=Array.from({length:72},(_,i)=>key==='cloud_cover_low'?value+Math.floor(i/24)*20:value);
 const event=(date:string,hour:number)=>civilNoon(date,timezone).getTime()/1000+(hour-12)*3600;
 return {timezone,utc_offset_seconds:offset,daily:{time:dates.map(midnight),sunrise:dates.map(d=>event(d,6.5)),sunset:dates.map(d=>event(d,17))},hourly,hourly_units:Object.fromEntries(Object.entries(specs).map(([key,[,unit]])=>[key,unit]))};
}
test('three-day event selection keeps weather, calendar date and sample windows aligned',()=>{
 const data=parseObservatory(fixture(),now);assert.equal(data.hours.length,72);
 for(let day=0;day<3;day++)for(const event of ['sunrise','sunset'] as const){const reading=observation(place,dayDate(day,now),event,data,now);assert.equal(reading.source,'forecast');assert.equal(reading.metrics.low,10+day*20);assert.equal(reading.date,dayDate(day,now));assert.ok(reading.hours.length>=7&&reading.hours.length<=8);assert.equal(reading.visibility,24000);assert.equal(reading.temperature,12);assert.equal(shanghaiDate(new Date(reading.eventTime)),reading.date);}
});
test('astronomical windows and directions use morning/evening ordering and UTC+8 civil dates',()=>{
 for(const date of ['2026-11-23','2026-06-21'])for(const event of ['sunrise','sunset'] as const){const r=observation(place,date,event,null,now);assert.ok(r.golden&&r.blue);assert.ok(r.golden[0]<r.golden[1]);assert.ok(r.blue[0]<r.blue[1]);assert.ok(r.arrival<r.blue[0]&&r.arrival<r.golden[0]);assert.ok(event==='sunrise'?r.blue[1]<r.eventTime:r.blue[0]>r.eventTime);assert.ok(event==='sunrise'?r.bearing>45&&r.bearing<135:r.bearing>225&&r.bearing<315);assert.equal(shanghaiDate(new Date(r.eventTime)),date);}
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
const newYork:Place={id:'new-york',name:'纽约',latitude:40.71,longitude:-74.01,timezone:'America/New_York'};
test('global lookup keeps region and timezone, rejects invalid coordinates or timezone',()=>{
 const beijing={id:1816670,name:'北京',admin1:'北京市',country_code:'CN',country:'中国',latitude:39.9,longitude:116.4,timezone:'Asia/Shanghai'};
 const hongKong={id:1819729,name:'香港',latitude:22.32,longitude:114.17,timezone:'Asia/Hong_Kong',country_code:'HK'};
 const places=parsePlaces({results:[null,beijing,hongKong,newYork,{...beijing,latitude:NaN},{...beijing,longitude:200},{...beijing,timezone:'invalid'},{...beijing,name:null}]});
 assert.equal(places.length,3);assert.equal(places[0].name,'北京 · 北京市 · 中国');assert.equal(places[2].timezone,'America/New_York');assert.deepEqual(parsePlaces({}),[]);
 assert.equal(new URL(geocodingUrl('New York')).searchParams.has('countryCode'),false);assert.equal(new URL(geocodingUrl('纽约')).searchParams.get('name'),'New York');
 assert.equal(coordinates(newYork),'40.71°N / 74.01°W');assert.equal(coordinates({...newYork,latitude:-33.87,longitude:151.21}),'33.87°S / 151.21°E');
});
test('New York uses its own civil date, solar window and hourly times rather than UTC+8',()=>{
 const at=new Date('2026-11-23T02:00Z');assert.equal(dayDate(0,at,newYork.timezone),'2026-11-22');assert.equal(dayDate(0,at,place.timezone),'2026-11-23');
 const data=parseObservatory(fixture(at,newYork.timezone),at,newYork.timezone);
 for(let i=0;i<3;i++)for(const event of ['sunrise','sunset'] as const){const date=dayDate(i,at,newYork.timezone),r=observation(newYork,date,event,data,at);assert.equal(r.source,'forecast');assert.equal(dateAt(r.eventTime,newYork.timezone),date);assert.equal(timeAt(r.eventTime,newYork.timezone),event==='sunset'?'17:00':'06:30');assert.equal(r.metrics.low,10+i*20);assert.ok(r.hours.length>=7);}
 assert.equal(new URL(observatoryUrl(newYork)).searchParams.get('timezone'),'America/New_York');assert.equal(new URL(observatoryUrl(newYork)).searchParams.get('timeformat'),'unixtime');
});
test('DST transitions and fractional timezones keep UTC instants and civil dates consistent',()=>{
 const tz=newYork.timezone;
 assert.equal(timeAt('2026-03-08T06:30Z',tz),'01:30');assert.equal(timeAt('2026-03-08T07:30Z',tz),'03:30');
 assert.equal(timeAt('2026-11-01T05:30Z',tz),'01:30');assert.equal(timeAt('2026-11-01T06:30Z',tz),'01:30');
 assert.equal(zoneLabel('2026-11-23T12:00Z',tz),'UTC−5');assert.equal(zoneLabel('2026-07-01T12:00Z',tz),'UTC−4');assert.equal(zoneLabel(now,'Asia/Kathmandu'),'UTC+5:45');
 for(const date of ['2026-03-08','2026-11-01','2026-06-21','2026-12-31']){const noon=civilNoon(date,tz);assert.equal(dateAt(noon,tz),date);assert.equal(timeAt(noon,tz),'12:00');for(const event of ['sunrise','sunset'] as const){const r=observation(newYork,date,event,null,now);assert.equal(dateAt(r.eventTime,tz),date);assert.ok(r.golden&&r.blue);assert.ok(r.golden[0]<r.golden[1]);assert.ok(r.blue[0]<r.blue[1]);assert.ok(r.arrival<r.blue[0]&&r.arrival<r.golden[0]);}}
 for(const at of [new Date('2026-03-07T12:00Z'),new Date('2026-10-31T12:00Z')]){const data=parseObservatory(fixture(at,tz),at,tz);for(const day of data.days)assert.equal(timeAt(observation(newYork,day.date,'sunset',data,at).eventTime,tz),'17:00');}
});
test('cache rolls over at New York midnight, not Shanghai midnight',()=>{
 const at=new Date('2026-11-23T15:55Z'),data=fixture(at,newYork.timezone),pack=JSON.stringify({place:placeKey(newYork),at:at.getTime(),data});
 assert.equal(readObservatoryCache(pack,newYork,new Date('2026-11-23T16:01Z'))?.source,'cache');
 const before=new Date('2026-11-24T04:55Z'),packed=JSON.stringify({place:placeKey(newYork),at:before.getTime(),data:fixture(before,newYork.timezone)});
 assert.equal(readObservatoryCache(packed,newYork,new Date('2026-11-24T05:01Z')),null);
});
test('polar night has no invented solar event or condition score',()=>{
 const polar:Place={id:'tromso',name:'特罗姆瑟',latitude:69.65,longitude:18.96,timezone:'Europe/Oslo'};
 assert.throws(()=>observation(polar,'2026-12-21','sunset',null,now),/No solar event/);
});
