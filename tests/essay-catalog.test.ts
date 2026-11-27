import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {essayCatalog,essayHref,validateEssay} from '../apps/web/src/lib/essay-catalog.ts';
const first=JSON.parse(await readFile(new URL('../apps/web/src/data/essays/01-a-generation-without-meaning.json',import.meta.url),'utf8'));
test('new essay data gets its own stable route and sorts ahead without changing existing content',()=>{
 const second={...first,id:'second-essay',issueNumber:'NO. 02',date:'2026-12-01'};
 const input=[first,second],snapshot=JSON.stringify(input),catalog=essayCatalog(input);
 assert.equal(catalog[0].id,'second-essay');assert.equal(essayHref(catalog[0]),'/essays/second-essay/');
 assert.equal(essayHref(catalog[1]),'/essays/a-generation-without-meaning/');assert.equal(JSON.stringify(input),snapshot);
});
test('invalid or colliding essay URLs and dates fail the build instead of silently hiding an article',()=>{
 assert.throws(()=>essayCatalog([first,first]),/Duplicate/);
 for(const patch of [{id:'../about'},{id:'two',issueNumber:first.issueNumber}])assert.throws(()=>essayCatalog([first,{...first,...patch}]));
 assert.throws(()=>validateEssay({...first,date:'2026-02-30'}),/date/);
 assert.throws(()=>validateEssay({...first,readTime:0}),/readTime/);
 assert.throws(()=>validateEssay({...first,coverImage:{...first.coverImage,src:'../../private.jpg'}}),/coverImage/);
 assert.throws(()=>validateEssay({...first,content:[{type:'html',text:'<script>alert(1)</script>'}]}),/Unknown/);
});
test('first issue preserves the requested image placements, independent quote and prose boundaries',()=>{
 const essay=validateEssay(first),blocks=essay.content;
 assert.equal(essay.coverImage.src,'01/cover.jpg');assert.equal(blocks.filter(b=>b.type==='heading').length,5);
 const firstImage=blocks.findIndex(b=>b.type==='image'&&b.src==='01/photo-1.jpg');
 const secondImage=blocks.findIndex(b=>b.type==='image'&&b.src==='01/photo-2.jpg');
 assert.deepEqual(blocks[firstImage+1],{type:'heading',text:'四、时代的断层'});
 assert.deepEqual(blocks[secondImage+1],{type:'heading',text:'五、算法之外'});
 assert.deepEqual(blocks.filter(b=>b.type==='quote'),[{type:'quote',text:'人工智能可以生成一场完美的日落，却无法替我度过那个黄昏。'}]);
 assert.equal(blocks[0].type,'paragraph');assert.equal('text' in blocks[0]?blocks[0].text:'','2026 年 11 月 28 日，凌晨 1:35，上海。');
 assert.deepEqual(blocks.at(-1),{type:'paragraph',text:'而我还生活在那个熟悉的时代里。'});
});
