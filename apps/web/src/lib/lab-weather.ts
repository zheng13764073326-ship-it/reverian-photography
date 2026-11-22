import cities from '../data/lab/cities.json';
import {CACHE_AGE} from './sunset';
import {civilNoon,dateAt,timeAt,zoneLabel} from './local-time';
import {coordinates,dayDate,directionLabel,fetchObservatory,geocodingUrl,observation,parsePlaces,placeKey,rangeLabel,readObservatoryCache,type EventKind,type ForecastData,type Place,type Reading} from './observatory';

export function setupLabWeather(root:HTMLElement){
 const q=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const all=<T extends Element=HTMLElement>(selector:string)=>[...root.querySelectorAll<T>(selector)];
 const put=(key:string,value:string)=>{q('[data-obs-'+key+']').textContent=value;};
 const refresh=q<HTMLButtonElement>('[data-weather-refresh]'),status=q('[data-weather-status]'),shell=q('[data-obs-reading]');
 const memory=new Map<string,string>();let place:Place=cities[0],day=0,event:EventKind='sunset',forecast:ForecastData|null=null,reading:Reading|null=null;
 const currentDate=()=>dateAt(new Date(),place.timezone),selectedDate=(offset:number)=>dayDate(offset,new Date(),place.timezone),localTime=(date:Date|string|number)=>timeAt(date,place.timezone);
 const getReading=(date:string)=>{try{return observation(place,date,event,forecast);}catch{return null;}};
 let loading=false,loaded=false,request=0,abort:AbortController|undefined,lastDate=currentDate(),lastAttempt=0;
 const key=(p:Place)=>'reverian-observatory-v3-'+placeKey(p);
 const cached=(p:Place)=>{let raw=memory.get(key(p))||null;try{raw??=localStorage.getItem(key(p));}catch{}return readObservatoryCache(raw,p);};
 function controls(){
  all<HTMLButtonElement>('[data-obs-city]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.obsCity===place.id)));
  all<HTMLButtonElement>('[data-obs-day]').forEach(button=>{const index=Number(button.dataset.obsDay);button.setAttribute('aria-pressed',String(day===index));button.querySelector('[data-day-date]')!.textContent=selectedDate(index).slice(5).replace('-',' / ');const result=forecast?getReading(selectedDate(index)):null;const score=result&&result.source!=='sample'?result.score:null;button.querySelector('[data-day-score]')!.textContent=score===null?'—':String(score);});
  all<HTMLButtonElement>('[data-obs-event]').forEach(button=>button.setAttribute('aria-pressed',String(event===button.dataset.obsEvent)));
  put('place',place.name);put('period',`${['今日','明日','后天'][day]}${event==='sunset'?'晚霞':'朝霞'} · ${selectedDate(day).slice(5).replace('-',' / ')}`);
  put('coordinates',coordinates(place));put('status-date',selectedDate(day)+' / '+zoneLabel(civilNoon(selectedDate(day),place.timezone),place.timezone)+' · 城市当地时间');put('event-label',event==='sunset'?'日落 / SUNSET':'日出 / SUNRISE');
 }
 function chart(current:Reading){
  const svg=q<SVGElement>('[data-obs-chart]'),table=q<HTMLTableElement>('[data-obs-table]'),empty=q('[data-obs-empty-chart]');
  // The region is selected by class to keep the markup useful without script.
  const region=root.querySelector<HTMLElement>('.obs-chart-scroll')!;
  svg.replaceChildren();table.replaceChildren();region.hidden=!current.hours.length;empty.hidden=!!current.hours.length;
  if(!current.hours.length){empty.textContent=current.source==='sample'?'模拟示例不绘制逐小时趋势。更新成功后显示真实预报。':'暂无逐小时数据';put('hour-detail','逐小时数据尚未获取。');return;}
  const n=current.hours.length,x=(i:number)=>48+i*548/(n-1),y=(v:number)=>148-v*1.18;
  const colors={high:'#1E4D54',mid:'#7c969e',low:'#B86B35'};
  const nearest=current.hours.reduce((best,h,i)=>Math.abs(new Date(h.time).getTime()-new Date(current.eventTime).getTime())<Math.abs(new Date(current.hours[best].time).getTime()-new Date(current.eventTime).getTime())?i:best,0);
  svg.setAttribute('aria-label',`${place.name} ${current.date} ${event==='sunset'?'日落':'日出'}附近逐小时高、中、低云占比趋势`);
  svg.innerHTML=[0,50,100].map(v=>`<line x1="48" x2="596" y1="${y(v)}" y2="${y(v)}" stroke="#222222" opacity=".1"/><text x="32" y="${y(v)+4}" text-anchor="end">${v}</text>`).join('')+
   `<line x1="${x(nearest)}" x2="${x(nearest)}" y1="22" y2="155" stroke="#B86B35" stroke-dasharray="3 5" opacity=".5"/><text x="${x(nearest)}" y="15" text-anchor="middle">${event==='sunset'?'日落附近':'日出附近'}</text>`+
   (['high','mid','low'] as const).map(key=>`<polyline points="${current.hours.map((h,i)=>`${x(i)},${y(h[key])}`).join(' ')}" fill="none" stroke="${colors[key]}" stroke-width="2" stroke-linejoin="round"/>`).join('')+
   current.hours.map((h,i)=>`<text x="${x(i)}" y="176" text-anchor="middle">${localTime(h.time)}</text>`).join('')+`<line data-hour-cursor y1="25" y2="155" stroke="#222222" opacity=".45"/>`;
  const caption=document.createElement('caption');caption.className='lab-sr-only';caption.textContent='逐小时气象预报，点击时刻查看明细';table.append(caption);
  const thead=table.createTHead(),header=thead.insertRow();header.innerHTML='<th scope="col">时刻</th>';
  current.hours.forEach((hour,index)=>{const th=document.createElement('th');th.scope='col';const button=document.createElement('button');button.type='button';button.dataset.obsHour=String(index);button.textContent=localTime(hour.time);button.setAttribute('aria-label',localTime(hour.time)+' 逐小时预报');button.addEventListener('click',()=>selectHour(index));th.append(button);header.append(th);});
  const tbody=table.createTBody();
  for(const [metric,label,unit] of [['high','高云','%'],['mid','中云','%'],['low','低云','%'],['rain','降水','%'],['wind','风速','m/s']] as const){
   const row=tbody.insertRow();row.dataset.metric=metric;const th=document.createElement('th');th.scope='row';th.textContent=label;row.append(th);
   current.hours.forEach(hour=>{const cell=row.insertCell();cell.textContent=(metric==='wind'?hour[metric].toFixed(1):String(Math.round(hour[metric])))+unit;cell.style.setProperty('--cell-alpha',String(.025+Math.min(hour[metric]/(metric==='wind'?15:100),1)*.25));});
  }
  function selectHour(index:number){const hour=current.hours[index];put('hour-detail',`${localTime(hour.time)} · 高 ${Math.round(hour.high)}% / 中 ${Math.round(hour.mid)}% / 低 ${Math.round(hour.low)}% · 降水 ${Math.round(hour.rain)}%`);all<HTMLButtonElement>('[data-obs-hour]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.obsHour)===index)));const cursor=svg.querySelector('[data-hour-cursor]')!;cursor.setAttribute('x1',String(x(index)));cursor.setAttribute('x2',String(x(index)));}
  selectHour(nearest);
 }
 function render(){
  if(loaded&&lastDate!==currentDate()){void load();return;}
  controls();if(!loaded)return;
  reading=getReading(selectedDate(day));
  if(!reading){clearReading();shell.dataset.source='unavailable';put('source','无观测时段');put('verdict','当日无'+(event==='sunrise'?'日出':'日落')+'时段');put('advice','当地可能处于极昼或极夜，可切换日期或地点。');q('[data-obs-empty-chart]').textContent='当日无对应太阳事件，不计算朝晚霞趋势。';status.textContent='所选地点当日无对应太阳事件。';return;}
  const r=reading,sample=r.source==='sample';shell.dataset.source=r.source;shell.dataset.tone=r.score>=70?'warm':'cool';
  put('source',sample?'模拟示例 · 非预报':r.source==='cache'?'缓存预报':'预报数据');put('score',String(r.score));
  put('verdict',(sample?'模拟情景 · ':'')+(r.score>=75?'值得等一场光':r.score>=50?'留意天空的变化':'条件暂不理想'));
  put('advice',r.advice);q('[data-obs-score-marker]').style.setProperty('--score',r.score+'%');
  put('bearing',r.bearing+'°');put('direction',directionLabel(r.bearing));q<SVGElement>('[data-obs-bearing-arrow]').style.transform=`rotate(${r.bearing}deg)`;
  q<SVGElement>('[data-obs-compass]').setAttribute('aria-label',`${event==='sunset'?'日落':'日出'}方位 ${r.bearing} 度，${directionLabel(r.bearing)}`);
  put('event-time',localTime(r.eventTime));put('phase',Date.now()>new Date(r.eventTime).getTime()?'该时段已过 · 可查看明天':'城市当地时间 · '+(sample?'天文估算':'预报时刻'));
  put('arrival',localTime(r.arrival));put('golden',rangeLabel(r.golden,place.timezone));put('blue',rangeLabel(r.blue,place.timezone));
  put('window',`${localTime(new Date(r.eventTime).getTime()-3600_000)} – ${localTime(new Date(r.eventTime).getTime()+3600_000)} · ${sample?'示例云量':'窗口内云量均值'}`);
  for(const metric of ['high','mid','low'] as const){const value=Math.round(r.metrics[metric]),cloud=q(`[data-obs-cloud="${metric}"]`);cloud.querySelector('[data-cloud-value]')!.textContent=value+'%';(cloud.querySelector('.obs-cloud-bar') as HTMLElement).style.setProperty('--cloud',value+'%');cloud.querySelector('[data-cloud-note]')!.textContent=metric==='low'?(value>60?'低云较多，注意遮挡':value<30?'低云较少，视野相对开阔':'留意低空云层变化'):(value<30?'云量偏少，可留意边缘光':value<=75?'有一定云量，可形成层次':'云量较密，留意透光条件');}
  const values={rain:String(Math.round(r.metrics.rain)),wind:r.metrics.wind.toFixed(1),visibility:r.visibility===null?'—':(r.visibility/1000).toFixed(1),temperature:r.temperature===null?'—':r.temperature.toFixed(1)};
  Object.entries(values).forEach(([k,v])=>q(`[data-obs-metric="${k}"]`).textContent=v);
  chart(r);
  status.textContent=sample?'接口暂不可用，云量与条件分为模拟示例；天文时刻仍可参考。':`${r.source==='cache'?'15 分钟内缓存':'预报已获取'} · ${localTime(r.fetchedAt)} 获取 · Open-Meteo 自动选模`;
 }
 function reset(){delete shell.dataset.source;delete shell.dataset.tone;reading=null;forecast=null;loaded=false;controls();clearReading();}
 function clearReading(){
  q('[data-obs-score-marker]').style.setProperty('--score','0%');q<SVGElement>('[data-obs-bearing-arrow]').style.transform='rotate(0deg)';
  for(const field of ['score','bearing','event-time','arrival','golden','blue'])put(field,field==='bearing'?'—°':'—');
  put('source','更新中');put('verdict','正在读取天空的线索');put('advice','获取所选城市未来三天的预报。');put('phase','城市当地时间');put('direction','太阳方位');put('window','等待日出 / 日落窗口数据');
  all('[data-cloud-value]').forEach(el=>el.textContent='—%');all('.obs-cloud-bar').forEach(el=>el.style.setProperty('--cloud','0%'));all('[data-cloud-note]').forEach(el=>el.textContent='等待云层数据');all('[data-obs-metric]').forEach(el=>el.textContent='—');q('.obs-chart-scroll').hidden=true;q('[data-obs-empty-chart]').hidden=false;q('[data-obs-empty-chart]').textContent='正在加载逐小时预报…';put('hour-detail','点选时间，查看这一小时的云量与降水。');
 }
 async function load(force=false){
  const serial=++request,target=place;abort?.abort();abort=new AbortController();loading=true;lastAttempt=Date.now();lastDate=currentDate();refresh.disabled=true;refresh.textContent='更新中…';shell.setAttribute('aria-busy','true');reset();status.textContent='正在获取未来三天的预报…';
  let data:ForecastData|null=force?null:cached(target);
  if(!data){try{const result=await fetchObservatory(target,abort.signal);data=result.forecast;const saved=JSON.stringify({place:placeKey(target),at:data.fetchedAt,data:result.data});memory.set(key(target),saved);try{localStorage.setItem(key(target),saved);}catch{}}catch{if(serial!==request)return;data=cached(target);}}
  if(serial!==request)return;forecast=data;loaded=true;loading=false;shell.setAttribute('aria-busy','false');refresh.disabled=false;refresh.textContent='更新预报 ↻';render();
 }
 all<HTMLButtonElement>('[data-obs-city]').forEach(button=>button.addEventListener('click',()=>selectPlace(cities.find(c=>c.id===button.dataset.obsCity)!)));
 all<HTMLButtonElement>('[data-obs-day]').forEach(button=>button.addEventListener('click',()=>{day=Number(button.dataset.obsDay);render();}));
 all<HTMLButtonElement>('[data-obs-event]').forEach(button=>button.addEventListener('click',()=>{event=button.dataset.obsEvent as EventKind;render();}));
 refresh.addEventListener('click',()=>void load(true));
 const form=q<HTMLFormElement>('[data-obs-search]'),input=q<HTMLInputElement>('#obs-city-query'),searchStatus=q('[data-obs-search-status]'),results=q('#obs-search-results');
 const submit=form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
 let searchAbort:AbortController|undefined,searchVersion=0;
 function selectPlace(candidate:Place){
  searchVersion++;searchAbort?.abort();place=candidate;results.replaceChildren();results.hidden=true;searchStatus.hidden=false;searchStatus.textContent='当前观测：'+candidate.name;input.value=candidate.name.split(' · ')[0];submit.textContent='查询城市 ↗';
  const heading=q('.obs-summary h3');heading.tabIndex=-1;heading.focus({preventScroll:true});void load();
 }
 input.addEventListener('input',()=>{searchVersion++;searchAbort?.abort();results.replaceChildren();results.hidden=true;searchStatus.hidden=true;submit.textContent='查询城市 ↗';});
 form.addEventListener('submit',async e=>{
  e.preventDefault();const name=input.value.trim(),version=++searchVersion;searchAbort?.abort();results.replaceChildren();results.hidden=true;searchStatus.hidden=false;
  if(name.length<2){submit.textContent='查询城市 ↗';searchStatus.textContent='请输入至少两个字，例如「北京」或「成都」。';return;}
  const controller=new AbortController();searchAbort=controller;const timer=setTimeout(()=>controller.abort(),8000);searchStatus.textContent='正在查找城市…';submit.textContent='查询中…';
  try{const response=await fetch(geocodingUrl(name),{signal:controller.signal,credentials:'omit'});if(!response.ok)throw Error('Search unavailable');const places=parsePlaces(await response.json());if(version!==searchVersion)return;
   searchStatus.textContent=places.length?'请选择观测地点（按城市当地时间预报）：':'未找到城市，可尝试全名、拼音或英文名称，例如 New York。';results.hidden=!places.length;
   places.forEach(candidate=>{const button=document.createElement('button');button.type='button';button.textContent=candidate.name;const small=document.createElement('small');small.textContent=coordinates(candidate);button.append(small);button.addEventListener('click',()=>selectPlace(candidate));results.append(button);});
  }catch{if(version===searchVersion)searchStatus.textContent='城市查询暂不可用，请稍后重试，或选择下方快捷城市。';}finally{clearTimeout(timer);if(version===searchVersion)submit.textContent='查询城市 ↗';}
 });
 const ensure=()=>{if(!loading&&(!loaded||Date.now()-lastAttempt>CACHE_AGE||lastDate!==currentDate()))void load();};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!root.hidden)ensure();});
 setInterval(()=>{if(!document.hidden&&!root.hidden&&lastDate!==currentDate())ensure();},60000);
 controls();return {ensure};
}
