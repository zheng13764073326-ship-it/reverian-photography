import test from 'node:test';
import assert from 'node:assert/strict';
import {tacitQuestions,isInFocus,tacitScore,tacitResult} from '../apps/web/src/lib/tacit.ts';

test('player pair is a single answer and old multi-select submissions cannot score',() => {
  const question = tacitQuestions[5];
  assert.equal(isInFocus(question,[2]),true);
  for (const picks of [[0],[1],[3],[1,3],[2,2],[]]) assert.equal(isInFocus(question,picks),false);
});
test('scores count one point per question and missing answers as incorrect',() => {
  assert.equal(tacitScore(tacitQuestions,tacitQuestions.map(q=>[...q.answers])),100);
  assert.equal(tacitScore(tacitQuestions,[]),0);
  const picks = tacitQuestions.map(q=>[...q.answers]);
  picks[5] = [1];
  assert.equal(tacitScore(tacitQuestions,picks),90);
  picks[0] = [0];
  assert.equal(tacitScore(tacitQuestions,picks),80);
});

test('result copy switches at 40 and 80, including every boundary',() => {
  for (const score of [0,30]) assert.equal(tacitResult(score).title,'初识 / 搜焦');
  for (const score of [40,70]) assert.equal(tacitResult(score).title,'同频 / 测光');
  for (const score of [80,100]) assert.equal(tacitResult(score).title,'默契 / 合焦');
  assert.ok(!tacitResult(80).message.includes('满分'));
});
