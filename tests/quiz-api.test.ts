import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onRequest as submit} from '../functions/api/quiz.ts';
import {onRequest as records} from '../functions/api/quiz-records.ts';
import {tacitQuestions} from '../apps/web/src/lib/tacit.ts';
import {QUIZ_VERSION} from '../functions/_quiz.ts';
import type {QuizContext,QuizEnv,Statement} from '../functions/_quiz.ts';

function setup(){
  const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0001_quiz.sql',import.meta.url),'utf8'));
  const env:QuizEnv={QUIZ_OWNER_ID:'owner',QUIZ_RATE_SECRET:'test-only-secret',QUIZ_DB:{prepare(sql){let values:unknown[]=[];const statement={bind(...v:unknown[]){values=v;return statement;},async first(){return db.prepare(sql).get(...values as never[])??null;},async all(){return{results:db.prepare(sql).all(...values as never[])};},async run(){return db.prepare(sql).run(...values as never[]);}};return statement as Statement;}}};
  const context=(request:Request):QuizContext=>({request,env,waitUntil:p=>{void p;}});
  const payload=()=>({id:crypto.randomUUID(),name:'测试昵称',version:QUIZ_VERSION,answers:tacitQuestions.map(q=>[...q.answers]),score:0});
  const post=(value:unknown,origin='https://site.test')=>new Request('https://site.test/api/quiz',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(value)});
  return{db,env,context,payload,post};
}
test('submission is write-only, recomputes score, and retries cannot duplicate a record',async()=>{
  const {db,context,payload,post}=setup();try{
    const data=payload();data.name="<img onerror=alert(1)> '";
    assert.equal((await submit(context(post(data)))).status,200);
    assert.equal((await submit(context(post(data)))).status,200);
    assert.equal(db.prepare('SELECT count(*) AS n FROM quiz_records').get()?.n,1);
    const row=db.prepare('SELECT * FROM quiz_records').get()!;
    assert.equal(row.correct_count,10);assert.equal(row.nickname,data.name);
    assert.equal(JSON.parse(row.answers_json as string)[5].correct,true);
    assert.equal((await submit(context(new Request('https://site.test/api/quiz')))).status,405);
    assert.equal((await submit(context(post(payload(),'https://foreign.test')))).status,403);
  }finally{db.close();}
});
test('missing, malformed, oversized, and old-version answers are rejected; bursts are limited',async()=>{
  const {db,context,payload,post}=setup();try{
    for(const data of [{...payload(),name:'  '},{...payload(),name:'x'.repeat(33)},{...payload(),answers:[]},{...payload(),version:'old'},{...payload(),id:'not-id'},{...payload(),answers:tacitQuestions.map(()=>[999])}])assert.equal((await submit(context(post(data)))).status,400);
    assert.equal((await submit(context(post({noise:'x'.repeat(9000)})))).status,400);
    for(let i=0;i<30;i++)assert.equal((await submit(context(post(payload())))).status,200);
    assert.equal((await submit(context(post(payload())))).status,429);
  }finally{db.close();}
});
test('record reads require a verified owner token; other Sanity users cannot read them',async()=>{
  const {db,context}=setup();const original=globalThis.fetch;try{
    const request=(auth?:string)=>new Request('https://site.test/api/quiz-records',{headers:auth?{Authorization:auth,Origin:'https://reverian-photography.sanity.studio'}:{}});
    assert.equal((await records(context(request()))).status,401);
    globalThis.fetch=async()=>Response.json({id:'someone-else'});
    assert.equal((await records(context(request('Bearer valid-other-user')))).status,403);
    globalThis.fetch=async()=>new Response('',{status:401});
    assert.equal((await records(context(request('Bearer expired')))).status,401);
    globalThis.fetch=async()=>Response.json({id:'owner',sanityUserId:'global-user-id'});
    const response=await records(context(request('Bearer owner-token')));
    assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
    assert.deepEqual((await response.json()).records,[]);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://reverian-photography.sanity.studio');
  }finally{globalThis.fetch=original;db.close();}
});
