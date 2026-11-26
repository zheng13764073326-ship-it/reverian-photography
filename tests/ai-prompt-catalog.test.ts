import test from 'node:test';
import assert from 'node:assert/strict';
import {sortPrompts,recentPrompts,matchesPromptSearch} from '../apps/web/src/lib/ai-prompt-catalog.ts';

test('prompt catalog puts edits before older publications without mutating source order',()=>{
  const entries=[
    {id:'old',index:'01',createdAt:'2026-10-01'},
    {id:'new',index:'11',createdAt:'2026-11-26'},
    {id:'edited',index:'02',createdAt:'2026-10-01',updatedAt:'2026-11-27'},
  ];
  assert.deepEqual(sortPrompts(entries).map(p=>p.id),['edited','new','old']);
  assert.deepEqual(entries.map(p=>p.id),['old','new','edited']);
});

test('same-day catalog entries retain numeric sequence, including double-digit numbers',()=>{
  const entries=['10','02','01'].map(index=>({index,createdAt:'2026-11-26',updatedAt:'2026-11-27'}));
  assert.deepEqual(sortPrompts(entries).map(p=>p.index),['01','02','10']);
});

test('NEW badges are limited to two recent entries and exclude future or expired dates',()=>{
  const now=Date.parse('2026-11-27T12:00:00Z');
  const entry=(id:string,date:string)=>({id,index:id,createdAt:date});
  const entries=[entry('01','2026-11-27T12:00:01Z'),entry('02','2026-11-27'),entry('03','2026-11-26'),entry('04','2026-11-25'),entry('05','2026-11-13T12:00:00Z')];
  assert.deepEqual(recentPrompts(entries,now),['02','03']);
  assert.deepEqual(recentPrompts([entries[4]],now),[]);
  assert.deepEqual(recentPrompts(entries,Date.parse('2026-12-20')),[]);
});

test('keyword search accepts fullwidth Latin, case changes and whitespace without regex interpretation',()=>{
  assert.equal(matchesPromptSearch('GTA 封面 游戏电影 人物',' ｇｔａ   封面 '),true);
  assert.equal(matchesPromptSearch('撕纸手账 胶片 平面设计','胶片 手账'),true);
  assert.equal(matchesPromptSearch('撕纸手账 胶片 平面设计','胶片 水彩'),false);
  assert.equal(matchesPromptSearch('邮票 周边物件','.*'),false);
  assert.equal(matchesPromptSearch('元素重构',''),true);
});
