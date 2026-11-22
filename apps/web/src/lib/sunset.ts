import {getPosition, getTimes} from 'suncalc';

export interface Atmosphere {high:number; mid:number; low:number; rain:number; wind:number}
export interface City {id:string; name:string; english:string; latitude:number; longitude:number; sample:Atmosphere}
export interface SunsetReading {
  date:string; sunset:string; bearing:number; metrics:Atmosphere; score:number; advice:string;
  samples:number; fetchedAt:number; source:'forecast'|'cache'|'sample';
}
interface Forecast {
  utc_offset_seconds:number;
  daily:{time:string[]; sunset:string[]};
  hourly:{time:string[]; [key:string]:Array<number|null>|string[]};
  hourly_units:Record<string,string>;
}
export const CACHE_AGE = 15 * 60 * 1000;
export const shanghaiDate = (date = new Date()) => new Date(date.getTime() + 8 * 3600_000).toISOString().slice(0,10);
export const localTime = (date:Date|string|number) => new Date(new Date(date).getTime() + 8 * 3600_000).toISOString().slice(11,16);
const clamp = (value:number, min=0, max=100) => Math.max(min,Math.min(max,value));

/** A photography-condition heuristic, not a calibrated event probability. */
export function scoreSunset(metrics:Atmosphere) {
  if (![metrics.high,metrics.mid,metrics.low,metrics.rain].every(Number.isFinite)) throw Error('Invalid weather metrics');
  const high=clamp(metrics.high),mid=clamp(metrics.mid),low=clamp(metrics.low),rain=clamp(metrics.rain);
  const cloudQuality=(value:number)=>value<30?value/30:value<=75?1:(100-value)/25;
  let score=35*cloudQuality(high)+30*cloudQuality(mid)+25*(1-low/100)+10*(1-rain/100)-rain*.2;
  if(low>60)score*=.35;
  score=Math.round(clamp(score));
  const advice=low>60?'低云遮挡，出片机会偏低。':rain>=60?'降水风险偏高，留意临近天气。':high<10&&mid<10?'云量偏少，可留意地平线余晖。':score>=75?'具备出片条件，建议提前蹲守。':score>=50?'有一定机会，留意西侧地平线。':'条件较弱，等待云层与光线变化。';
  return {score,advice};
}

export function sunsetBearing(sunset:Date,city:City) {
  // SunCalc 2 uses degrees clockwise from north (not the old v1 radians convention).
  return Math.round((getPosition(sunset,city.latitude,city.longitude).azimuth+360)%360)%360;
}
export const bearingLabel=(bearing:number)=>Math.abs(bearing-270)<=3?'正西':bearing<270?'西偏南':'西偏北';

export function forecastUrl(city:City) {
  const url=new URL('https://api.open-meteo.com/v1/forecast');
  url.search=new URLSearchParams({latitude:String(city.latitude),longitude:String(city.longitude),hourly:'cloud_cover_high,cloud_cover_mid,cloud_cover_low,precipitation_probability,wind_speed_10m',daily:'sunset',timezone:'Asia/Shanghai',forecast_days:'1',wind_speed_unit:'ms'}).toString();
  return url.href;
}

export function parseForecast(payload:unknown,city:City,now=new Date()):SunsetReading {
  const data=payload as Forecast,date=shanghaiDate(now);
  if(!data||data.utc_offset_seconds!==28800||data.daily?.time?.[0]!==date||!Array.isArray(data.hourly?.time))throw Error('Weather date or timezone mismatch');
  const sunsetValue=data.daily.sunset?.[0];
  if(typeof sunsetValue!=='string'||!sunsetValue.startsWith(date+'T'))throw Error('Missing sunset');
  const sunset=new Date(sunsetValue+'+08:00');
  if(!Number.isFinite(sunset.getTime()))throw Error('Invalid sunset');
  const indexes=data.hourly.time.flatMap((time,index)=>{
    const instant=new Date(time+'+08:00').getTime();
    return Math.abs(instant-sunset.getTime())<=3600_000?[index]:[];
  });
  if(indexes.length<2)throw Error('Incomplete sunset window');
  const values=(key:string,max=100)=>{
    const series=data.hourly[key];
    if(!Array.isArray(series)||series.length!==data.hourly.time.length)throw Error('Incomplete weather variable: '+key);
    return indexes.map(index=>{const value=series[index];if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>max)throw Error('Invalid weather sample: '+key);return value;});
  };
  for(const key of ['cloud_cover_high','cloud_cover_mid','cloud_cover_low','precipitation_probability'])if(data.hourly_units?.[key]!=='%')throw Error('Unexpected weather unit');
  if(data.hourly_units?.wind_speed_10m!=='m/s')throw Error('Unexpected wind unit');
  const mean=(values:number[])=>values.reduce((sum,n)=>sum+n,0)/values.length;
  const metrics={high:mean(values('cloud_cover_high')),mid:mean(values('cloud_cover_mid')),low:mean(values('cloud_cover_low')),rain:Math.max(...values('precipitation_probability')),wind:mean(values('wind_speed_10m',150))};
  return {date,sunset:sunset.toISOString(),bearing:sunsetBearing(sunset,city),metrics,...scoreSunset(metrics),samples:indexes.length,fetchedAt:now.getTime(),source:'forecast'};
}

export function sampleReading(city:City,now=new Date()):SunsetReading {
  const date=shanghaiDate(now);
  const sunset=getTimes(new Date(date+'T12:00:00+08:00'),city.latitude,city.longitude,0,480).sunset;
  if(!sunset)throw Error('No sunset for this city');
  return {date,sunset:sunset.toISOString(),bearing:sunsetBearing(sunset,city),metrics:{...city.sample},...scoreSunset(city.sample),samples:0,fetchedAt:now.getTime(),source:'sample'};
}

export function readCachedForecast(raw:string|null,city:City,now=new Date()):SunsetReading|null {
  try {
    const saved=JSON.parse(raw||'null');
    if(!saved||saved.city!==city.id||!Number.isFinite(saved.at)||now.getTime()-saved.at<0||now.getTime()-saved.at>CACHE_AGE)return null;
    const reading=parseForecast(saved.data,city,now);
    return {...reading,fetchedAt:saved.at,source:'cache'};
  } catch {return null;}
}

export async function fetchForecast(city:City,fetcher:typeof fetch=fetch,timeout=10000) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try {
    const response=await fetcher(forecastUrl(city),{signal:controller.signal,credentials:'omit'});
    if(!response.ok)throw Error('Weather HTTP '+response.status);
    const data:unknown=await response.json(),now=new Date();
    return {data,reading:parseForecast(data,city,now)};
  } finally {clearTimeout(timer);}
}
