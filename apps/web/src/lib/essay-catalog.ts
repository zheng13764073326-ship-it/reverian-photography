export interface EssayImage {src:string;alt:string;caption?:string;sideNote?:{heading:string;paragraphs:string[]}}
export type EssayBlock={type:'paragraph'|'heading'|'quote';text:string}|({type:'image'}&EssayImage);
export interface Essay {id:string;issueNumber:string;title:string;subtitle:string;date:string;location:string;readTime:number;excerpt:string;coverImage:EssayImage;content:EssayBlock[];closingNote?:string}

const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const text=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0;
function image(v:unknown):v is EssayImage{
 return record(v)&&text(v.src)&&/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|avif)$/i.test(v.src)&&text(v.alt)&&(v.caption===undefined||text(v.caption))
  &&(v.sideNote===undefined||(record(v.sideNote)&&text(v.sideNote.heading)&&Array.isArray(v.sideNote.paragraphs)&&v.sideNote.paragraphs.length>0&&v.sideNote.paragraphs.every(text)));
}
export function validateEssay(value:unknown):Essay{
 if(!record(value))throw Error('Essay must be an object');
 for(const key of ['id','issueNumber','title','subtitle','date','location','excerpt'])if(!text(value[key]))throw Error(`Essay is missing ${key}`);
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id as string))throw Error('Essay id must be a lowercase URL slug');
 if(!/^NO\. \d{2,}$/.test(value.issueNumber as string))throw Error('Essay issueNumber must use NO. 01 format');
 const date=value.date as string;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('Essay date must be a real YYYY-MM-DD date');
 if(!Number.isInteger(value.readTime)||Number(value.readTime)<=0)throw Error('Essay readTime must be positive minutes');
 if(!image(value.coverImage))throw Error('Essay coverImage must name an image inside the issue asset folder');
 if(value.closingNote!==undefined&&!text(value.closingNote))throw Error('Essay closingNote must be text');
 if(!Array.isArray(value.content)||!value.content.length)throw Error('Essay content is empty');
 for(const block of value.content){
  if(!record(block)||!(['paragraph','heading','quote','image'] as unknown[]).includes(block.type))throw Error('Unknown essay content block');
  if(block.type==='image'?!image(block):!text(block.text))throw Error('Invalid essay content block');
 }
 return value as unknown as Essay;
}
export function essayCatalog(values:unknown[]):Essay[]{
 const essays=values.map(validateEssay),ids=new Set<string>(),issues=new Set<string>();
 for(const essay of essays){
  if(ids.has(essay.id)||issues.has(essay.issueNumber))throw Error('Duplicate essay id or issueNumber');
  ids.add(essay.id);issues.add(essay.issueNumber);
 }
 return [...essays].sort((a,b)=>b.date.localeCompare(a.date)||Number(b.issueNumber.slice(4))-Number(a.issueNumber.slice(4)));
}
export const essayHref=(essay:Pick<Essay,'id'>)=>`/essays/${essay.id}/`;
export const essayDate=(date:string,monthOnly=false)=>date.slice(0,monthOnly?7:10).replaceAll('-','.');
