import cities from '../data/lab/cities.json';
import {bearingLabel,CACHE_AGE,fetchForecast,localTime,readCachedForecast,sampleReading,shanghaiDate,type City,type SunsetReading} from './sunset';

export function setupLabWeather(root:HTMLElement) {
  const refresh=root.querySelector<HTMLButtonElement>('[data-weather-refresh]')!;
  const status=root.querySelector<HTMLElement>('[data-weather-status]')!;
  const dateLabel=root.querySelector<HTMLElement>('[data-weather-date]')!;
  const memory=new Map<string,{at:number;city:string;data:unknown}>();
  let busy=false,lastLoad=0,lastDate='';
  const cacheKey=(city:City)=>'reverian-weather-v1-'+city.id;
  const cached=(city:City)=>{
    let raw:string|null=null;
    try{raw=localStorage.getItem(cacheKey(city));}catch{}
    return readCachedForecast(memory.has(city.id)?JSON.stringify(memory.get(city.id)):raw,city);
  };
  function render(city:City,reading:SunsetReading) {
    const card=root.querySelector<HTMLElement>(`[data-city="${city.id}"]`)!;
    const put=(key:string,value:string)=>{card.querySelector<HTMLElement>(`[data-weather="${key}"]`)!.textContent=value;};
    card.dataset.source=reading.source;
    card.dataset.tone=reading.score>=70?'warm':'cool';
    put('source',reading.source==='sample'?'模拟数据 · 非实时':reading.source==='cache'?'缓存预报':'预报数据');
    put('sunset',localTime(reading.sunset));
    put('bearing',`${reading.bearing}° ${bearingLabel(reading.bearing)}`);
    const compass=card.querySelector<SVGElement>('[data-compass]')!;
    compass.style.transform=`rotate(${reading.bearing}deg)`;
    put('score',String(reading.score));
    put('advice',reading.source==='sample'?'模拟情景：'+reading.advice:reading.advice);
    for(const key of ['high','mid','low'] as const){
      const value=Math.round(reading.metrics[key]);put(key,value+'%');
      card.querySelector<HTMLElement>(`[data-cloud-bar="${key}"]`)!.style.setProperty('--cloud',value+'%');
    }
    put('rain',Math.round(reading.metrics.rain)+'%');put('wind',reading.metrics.wind.toFixed(1));
    put('window',`${localTime(new Date(reading.sunset).getTime()-3600_000)} — ${localTime(new Date(reading.sunset).getTime()+3600_000)}`);
    put('updated',reading.source==='sample'?'接口暂不可用 · 云量为本地示例，日落为天文估算':`北京时间 ${localTime(reading.fetchedAt)} 获取 · ${reading.samples} 个小时采样`);
    put('phase',Date.now()>new Date(reading.sunset).getTime()?'今日日落已过':'今日日落');
    card.setAttribute('aria-busy','false');
  }
  async function load(force=false) {
    if(busy)return;
    busy=true;refresh.disabled=true;refresh.textContent='正在观测…';
    dateLabel.textContent=shanghaiDate();status.textContent='正在获取三城日落窗口的气象预报…';
    const states=await Promise.all(cities.map(async city=>{
      const card=root.querySelector<HTMLElement>(`[data-city="${city.id}"]`)!;
      card.setAttribute('aria-busy','true');
      const cache=cached(city);
      if(cache&&!force){render(city,cache);return 'cache';}
      try{
        const {data,reading}=await fetchForecast(city);
        const saved={city:city.id,at:reading.fetchedAt,data};memory.set(city.id,saved);
        try{localStorage.setItem(cacheKey(city),JSON.stringify(saved));}catch{}
        render(city,reading);return 'forecast';
      }catch{
        const previous=cached(city);
        render(city,previous||sampleReading(city));return previous?'cache':'sample';
      }
    }));
    const samples=states.filter(value=>value==='sample').length,caches=states.filter(value=>value==='cache').length;
    status.textContent=samples?`${samples} 城接口暂不可用，已明确标注模拟数据。${3-samples} 城显示有效预报。`:caches?`${caches} 城使用 15 分钟内的缓存预报，可点击刷新重新获取。`:'三城预报已更新。';
    busy=false;lastLoad=Date.now();lastDate=shanghaiDate();refresh.disabled=false;refresh.textContent='刷新观测 ↻';
  }
  refresh.addEventListener('click',()=>void load(true));
  const ensure=()=>{if(!lastLoad||Date.now()-lastLoad>CACHE_AGE||lastDate!==shanghaiDate())void load();};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!root.hidden)ensure();});
  return {ensure};
}
