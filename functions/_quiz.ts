import {tacitQuestions,isInFocus,QUIZ_VERSION} from '../apps/web/src/lib/tacit.ts';

export {QUIZ_VERSION};
export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string,unknown>>(): Promise<T | null>;
  all<T = Record<string,unknown>>(): Promise<{results:T[]}>;
  run(): Promise<unknown>;
}
export interface QuizEnv {
  QUIZ_DB: {prepare(sql:string):Statement};
  QUIZ_OWNER_ID: string;
  QUIZ_RATE_SECRET: string;
}
export interface QuizContext {request:Request;env:QuizEnv;waitUntil:(promise:Promise<unknown>)=>void}
export function json(value:unknown,status=200,headers:Record<string,string>={}) {
  return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
}
export function validateSubmission(value:unknown) {
  const input=value as {id?:unknown;name?:unknown;answers?:unknown;version?:unknown};
  if(!input || typeof input.id!=='string' || !/^[a-f0-9-]{36}$/i.test(input.id))throw Error('无效的答题编号');
  if(typeof input.name!=='string')throw Error('请填写名字或昵称');
  const name=input.name.trim();
  if(!name || [...name].length>32 || /[\u0000-\u001f\u007f]/.test(name))throw Error('名字请填写 1–32 个字');
  if(input.version!==QUIZ_VERSION)throw Error('题目已更新，请刷新后重新作答');
  if(!Array.isArray(input.answers) || input.answers.length!==tacitQuestions.length)throw Error('请完成全部题目');
  let correctCount=0;
  const answers=tacitQuestions.map((q,i)=>{
    const picks=(input.answers as unknown[])[i];
    if(!Array.isArray(picks) || picks.length!==q.answers.length || new Set(picks).size!==picks.length || picks.some(p=>!Number.isInteger(p)||p<0||p>=q.options.length))throw Error('答案格式不正确');
    const correct=isInFocus(q,picks);
    if(correct)correctCount++;
    return {question:q.question,picked:picks.map(p=>q.options[p]),answer:q.answers.map(p=>q.options[p]),correct};
  });
  return {id:input.id,name,version:QUIZ_VERSION,correctCount,total:tacitQuestions.length,answers};
}
export async function readSmallJson(request:Request) {
  const reader=request.body?.getReader();
  if(!reader)throw Error('缺少答案');
  const chunks:Uint8Array[]=[];let bytes=0;
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>8192){await reader.cancel();throw Error('提交内容过长');}chunks.push(value);}
  const result=new Uint8Array(bytes);let offset=0;for(const part of chunks){result.set(part,offset);offset+=part.length;}
  return JSON.parse(new TextDecoder().decode(result));
}
export async function rateBucket(request:Request,secret:string) {
  const hour=Math.floor(Date.now()/3600000);
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const hash=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${hour}:${request.headers.get('CF-Connecting-IP')||'local'}`));
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
