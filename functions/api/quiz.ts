import {json,readSmallJson,validateSubmission,rateBucket} from '../_quiz.ts';
import type {QuizContext} from '../_quiz.ts';

// Write-only public endpoint. No answer records can be read here.
export async function onRequest({request,env,waitUntil}:QuizContext) {
  if(request.method!=='POST')return json({error:'Method not allowed'},405,{Allow:'POST'});
  if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Forbidden'},403);
  if(!request.headers.get('Content-Type')?.includes('application/json'))return json({error:'请使用 JSON 提交'},415);
  if(!env.QUIZ_DB || !env.QUIZ_RATE_SECRET)return json({error:'记录服务暂不可用，请稍后重试'},503);
  let record;
  try{record=validateSubmission(await readSmallJson(request));}catch(error){return json({error:error instanceof Error?error.message:'提交格式不正确'},400);}
  try{
    const existing=await env.QUIZ_DB.prepare('SELECT id FROM quiz_records WHERE id = ?').bind(record.id).first();
    if(existing)return json({saved:true});
    const now=Math.floor(Date.now()/1000);
    const bucket=await rateBucket(request,env.QUIZ_RATE_SECRET);
    const rate=await env.QUIZ_DB.prepare('INSERT INTO quiz_rate_limits (bucket,hits,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits = hits + 1 RETURNING hits').bind(bucket,now+7200).first<{hits:number}>();
    if(!rate || rate.hits>30)return json({error:'提交过于频繁，请稍后再试'},429,{'Retry-After':'3600'});
    waitUntil(env.QUIZ_DB.prepare('DELETE FROM quiz_rate_limits WHERE expires_at < ?').bind(now).run());
    await env.QUIZ_DB.prepare('INSERT INTO quiz_records (id,nickname,submitted_at,version,correct_count,total,answers_json) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(record.id,record.name,new Date().toISOString(),record.version,record.correctCount,record.total,JSON.stringify(record.answers)).run();
    return json({saved:true});
  }catch{return json({error:'暂时没能保存记录，请重试'},503);}
}
