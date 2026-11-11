import {json} from '../_quiz.ts';
import type {QuizContext} from '../_quiz.ts';
const studioOrigins=new Set(['https://reverian-photography.sanity.studio','https://www.sanity.io','https://sanity.io','http://localhost:3333','http://127.0.0.1:3333']);

export async function onRequest({request,env}:QuizContext) {
  const origin=request.headers.get('Origin');
  if(origin && !studioOrigins.has(origin) && origin!==new URL(request.url).origin)return json({error:'Forbidden'},403);
  const cors:Record<string,string>=origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Authorization','Access-Control-Max-Age':'600'}});
  if(request.method!=='GET')return json({error:'Method not allowed'},405,cors);
  const auth=request.headers.get('Authorization')||'';
  if(!/^Bearer [^\s]+$/.test(auth))return json({error:'请先登录摄影编辑室'},401,cors);
  if(!env.QUIZ_OWNER_ID || !env.QUIZ_DB)return json({error:'后台暂不可用'},503,cors);
  try{
    const response=await fetch('https://j0zkvef5.api.sanity.io/v2025-02-19/users/me',{headers:{Authorization:auth},signal:AbortSignal.timeout(8000)});
    if(!response.ok)return json({error:'登录已失效，请重新登录'},response.status===401||response.status===403?401:503,cors);
    const user=await response.json() as {id?:string};
    if(user.id!==env.QUIZ_OWNER_ID)return json({error:'仅网站主人可查看答题记录'},403,cors);
    const page=Math.max(0,Math.min(100000,Number.parseInt(new URL(request.url).searchParams.get('page')||'0',10)||0));
    const data=await env.QUIZ_DB.prepare('SELECT id,nickname,submitted_at,version,correct_count,total,answers_json FROM quiz_records ORDER BY submitted_at DESC,id DESC LIMIT 51 OFFSET ?').bind(page*50).all<{id:string;nickname:string;submitted_at:string;version:string;correct_count:number;total:number;answers_json:string}>();
    return json({page,hasMore:data.results.length>50,records:data.results.slice(0,50).map(({answers_json,...row})=>({...row,answers:JSON.parse(answers_json)}))},200,cors);
  }catch{return json({error:'暂时无法读取记录，请稍后刷新'},503,cors);}
}
