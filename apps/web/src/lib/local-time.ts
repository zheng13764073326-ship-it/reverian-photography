const formatters=new Map<string,Intl.DateTimeFormat>();
function formatter(timezone:string){
 let value=formatters.get(timezone);
 if(!value){value=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});formatters.set(timezone,value);}
 return value;
}
export function validTimezone(value:unknown):value is string {if(typeof value!=='string'||!value)return false;try{formatter(value);return true;}catch{return false;}}
const parts=(date:Date|string|number,timezone:string)=>Object.fromEntries(formatter(timezone).formatToParts(new Date(date)).map(p=>[p.type,p.value]));
export function dateAt(date:Date|string|number,timezone:string){const p=parts(date,timezone);return `${p.year}-${p.month}-${p.day}`;}
export function timeAt(date:Date|string|number,timezone:string){const p=parts(date,timezone);return `${p.hour}:${p.minute}`;}
export function offsetMinutes(date:Date|string|number,timezone:string){const p=parts(date,timezone);return (Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second)-Math.floor(new Date(date).getTime()/1000)*1000)/60000;}
/** Resolve an unambiguous local noon, including a DST change on the selected date. */
export function civilNoon(date:string,timezone:string){const utc=Date.parse(date+'T12:00:00Z');let instant=utc;for(let i=0;i<3;i++)instant=utc-offsetMinutes(instant,timezone)*60000;return new Date(instant);}
export function zoneLabel(date:Date|string|number,timezone:string){const minutes=offsetMinutes(date,timezone),hours=Math.floor(Math.abs(minutes)/60),rest=Math.abs(minutes)%60;return `UTC${minutes>=0?'+':'−'}${hours}${rest?':'+String(rest).padStart(2,'0'):''}`;}
