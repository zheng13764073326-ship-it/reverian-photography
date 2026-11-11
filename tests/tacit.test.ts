import test from 'node:test';
import assert from 'node:assert/strict';
import {tacitQuestions,isInFocus,tacitScore} from '../apps/web/src/lib/tacit.ts';

test('multi-select requires exactly both correct players, in either order',() => {
  const question = tacitQuestions[5];
  assert.equal(isInFocus(question,[3,1]),true);
  for (const picks of [[1],[3],[1,2],[1,3,4],[1,1],[]]) assert.equal(isInFocus(question,picks),false);
});
test('scores include missing answers as incorrect and never award partial multi-select points',() => {
  assert.equal(tacitScore(tacitQuestions,tacitQuestions.map(q=>[...q.answers])),100);
  assert.equal(tacitScore(tacitQuestions,[]),0);
  const picks = tacitQuestions.map(q=>[...q.answers]);
  picks[5] = [1];
  assert.equal(tacitScore(tacitQuestions,picks),90);
  picks[0] = [0];
  assert.equal(tacitScore(tacitQuestions,picks),80);
});
