import {addTime,getTimes,times} from 'suncalc';
import {CACHE_AGE,localTime,scoreSunset,shanghaiDate,sunsetBearing,type Atmosphere,type City} from './sunset.ts';

export type EventKind='sunrise'|'sunset';
export type Place=Pick<City,'id'|'name'|'latitude'|'longitude'> & {english?:string;sample?:Atmosphere};
export interface Hour extends Atmosphere {time:string;temperature:number|null;visibility:number|null}
export interface ForecastData {date:string;hours:Hour[];days:{date:string;sunrise:string;sunset:string}[];fetchedAt:number;source:'forecast'|'cache'}
export interface Reading {date:string;event:EventKind;eventTime:string;bearing:number;metrics:Atmosphere;score:number;advice:string;hours:Hour[];source:'forecast'|'cache'|'sample';fetchedAt:number;visibility:number|null;temperature:number|null;golden:[string,string];blue:[string,string];arrival:string}
for(const [angle,rise,set] of [[-4,'obsBlueMorningEnd','obsBlueEveningStart'],[-8,'obsBlueMorningStart','obsBlueEveningEnd']] as const){if(!times.some(row=>row[1]===rise))addTime(angle,rise,set);}
export const dayDate=(offset:number,now=new Date())=>new Date(new Date(shanghaiDate(now)+'T12:00:00+08:00').getTime()+offset*86400_000).toISOString().slice(0,10);
export const placeKey=(place:Place)=>`${place.latitude.toFixed(4)},${place.longitude.toFixed(4)}`;
export const directionLabel=(angle:number)=>['北','东北','东','东南','南','西南','西','西北'][Math.round(angle/45)%8];
export const rangeLabel=(range:[string,string])=>range.map(localTime).join(' – ');
const iso=(text:unknown,date?:string)=>{
 if(typeof text!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)||(date&&!text.startsWith(date+'T')))throw Error('Missing local time');
 const value=new Date(text+'+08:00');if(!Number.isFinite(value.getTime()))throw Error('Invalid local time');return value.toISOString();
};
const mean=(values:number[])=>values.reduce((a,b)=>a+b,0)/values.length;
export function observatoryUrl(place:Place){
 const url=new URL('https://api.open-meteo.com/v1/forecast');
 url.search=new URLSearchParams({latitude:String(place.latitude),longitude:String(place.longitude),hourly:'cloud_cover_high,cloud_cover_mid,cloud_cover_low,precipitation_probability,wind_speed_10m,temperature_2m,visibility',daily:'sunrise,sunset',timezone:'Asia/Shanghai',forecast_days:'3',wind_speed_unit:'ms'}).toString();return url.href;
}
export function parseObservatory(payload:unknown,now=new Date()):ForecastData{
 const data=payload as {utc_offset_seconds:number;daily:{time:string[];sunrise:string[];sunset:string[]};hourly_units:Record<string,string>;hourly:Record<string,unknown[]>};
 const date=shanghaiDate(now);
 if(!data||data.utc_offset_seconds!==28800||!Array.isArray(data.daily?.time)||data.daily.time.length<3||!Array.isArray(data.hourly?.time)||data.hourly.time.length<72)throw Error('Incomplete forecast dates');
 const days=[0,1,2].map(offset=>{const day=dayDate(offset,now);if(data.daily.time[offset]!==day)throw Error('Forecast date mismatch');return {date:day,sunrise:iso(data.daily.sunrise?.[offset],day),sunset:iso(data.daily.sunset?.[offset],day)};});
 const fields={high:'cloud_cover_high',mid:'cloud_cover_mid',low:'cloud_cover_low',rain:'precipitation_probability',wind:'wind_speed_10m'} as const;
 for(const [name,key] of Object.entries(fields))if(data.hourly_units?.[key]!== (name==='wind'?'m/s':'%'))throw Error('Invalid weather units');
 const value=(key:string,i:number,max:number)=>{const v=data.hourly[key]?.[i];if(data.hourly[key]?.length!==data.hourly.time.length||typeof v!=='number'||!Number.isFinite(v)||v<0||v>max)throw Error('Incomplete weather variable: '+key);return v;};
 const optional=(key:string,i:number,unit:string,min:number,max:number)=>{const v=data.hourly[key]?.[i];return data.hourly_units?.[key]===unit&&typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:null;};
 const start=new Date(date+'T00:00:00+08:00').getTime();
 const hours=data.hourly.time.slice(0,72).map((time,i)=>{
  const instant=iso(time);if(new Date(instant).getTime()!==start+i*3600_000)throw Error('Hourly timeline has gaps');
  return {time:instant,high:value(fields.high,i,100),mid:value(fields.mid,i,100),low:value(fields.low,i,100),rain:value(fields.rain,i,100),wind:value(fields.wind,i,150),temperature:optional('temperature_2m',i,'°C',-90,65),visibility:optional('visibility',i,'m',0,500000)};
 });
 return {date,hours,days,fetchedAt:now.getTime(),source:'forecast'};
}
export function observation(place:Place,date:string,event:EventKind,forecast:ForecastData|null,now=new Date()):Reading{
 const sun=getTimes(new Date(date+'T12:00:00+08:00'),place.latitude,place.longitude,0,480);
 const instant=(value:unknown)=>{if(!(value instanceof Date)||!Number.isFinite(value.getTime()))throw Error('No solar event at this location');return value.toISOString();};
 const golden:[string,string]=event==='sunset'?[instant(sun.goldenHour),instant(sun.obsBlueEveningStart)]:[instant(sun.obsBlueMorningEnd),instant(sun.goldenHourEnd)];
 const blue:[string,string]=event==='sunset'?[instant(sun.obsBlueEveningStart),instant(sun.obsBlueEveningEnd)]:[instant(sun.obsBlueMorningStart),instant(sun.obsBlueMorningEnd)];
 const day=forecast?.days.find(day=>day.date===date),eventTime=day?.[event]||instant(sun[event]);
 const eventMs=new Date(eventTime).getTime();
 const window=forecast?.hours.filter(hour=>Math.abs(new Date(hour.time).getTime()-eventMs)<=3600_000)||[];
 const valid=window.length>=2;
 const metrics=valid?{high:mean(window.map(h=>h.high)),mid:mean(window.map(h=>h.mid)),low:mean(window.map(h=>h.low)),rain:Math.max(...window.map(h=>h.rain)),wind:mean(window.map(h=>h.wind))}:{...(place.sample||{high:48,mid:36,low:24,rain:15,wind:3})};
 const optionalMean=(key:'visibility'|'temperature')=>valid&&window.every(h=>h[key]!==null)?mean(window.map(h=>h[key]!)):null;
 const hours=valid?forecast!.hours.filter(hour=>Math.abs(new Date(hour.time).getTime()-eventMs)<=3.5*3600_000):[];
 const arrival=new Date(Math.min(eventMs-40*60_000,new Date(event==='sunrise'?blue[0]:golden[0]).getTime()-15*60_000)).toISOString();
 let {score,advice}=scoreSunset(metrics);
 if(event==='sunrise')advice=advice.replace('西侧','东侧');
 return {date,event,eventTime,bearing:sunsetBearing(new Date(eventTime),place as City),metrics,score,advice,hours,source:valid?forecast!.source:'sample',fetchedAt:forecast?.fetchedAt||now.getTime(),visibility:optionalMean('visibility'),temperature:optionalMean('temperature'),golden,blue,arrival};
}
export function readObservatoryCache(raw:string|null,place:Place,now=new Date()):ForecastData|null{
 try{const saved=JSON.parse(raw||'null');if(!saved||saved.place!==placeKey(place)||!Number.isFinite(saved.at)||now.getTime()<saved.at||now.getTime()-saved.at>CACHE_AGE)return null;return {...parseObservatory(saved.data,now),fetchedAt:saved.at,source:'cache'};}catch{return null;}
}
export async function fetchObservatory(place:Place,signal?:AbortSignal,fetcher:typeof fetch=fetch,timeout=10000){
 const abort=new AbortController(),cancel=()=>abort.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)abort.abort();
 const timer=setTimeout(cancel,timeout);
 try{const response=await fetcher(observatoryUrl(place),{signal:abort.signal,credentials:'omit'});if(!response.ok)throw Error('Weather HTTP '+response.status);const data:unknown=await response.json();return {data,forecast:parseObservatory(data)};}finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
export function geocodingUrl(name:string){const url=new URL('https://geocoding-api.open-meteo.com/v1/search');url.search=new URLSearchParams({name,count:'6',language:'zh',format:'json',countryCode:'CN'}).toString();return url.href;}
export function parsePlaces(payload:unknown):Place[]{
 const items=(payload as {results?:unknown[]})?.results;if(!Array.isArray(items))return [];
 return items.flatMap(item=>{const p=item as Record<string,unknown>;if(p.country_code!=='CN'||typeof p.name!=='string'||!p.name.trim()||typeof p.latitude!=='number'||typeof p.longitude!=='number'||!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude)||p.latitude<18||p.latitude>54||p.longitude<73||p.longitude>135)return [];return [{id:'geo-'+String(p.id),name:p.name+(typeof p.admin1==='string'&&p.admin1!==p.name?' · '+p.admin1:''),latitude:p.latitude,longitude:p.longitude}];}).slice(0,6);
}
