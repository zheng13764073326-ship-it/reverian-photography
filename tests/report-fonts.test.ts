import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);

test('report font covers fixed Chinese copy and representative visitor names with real regular, semibold and bold weights',async()=>{
 const css=await readFile(require.resolve('@fontsource-variable/noto-serif-sc/wght.css'),'utf8');
 const faces=[...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(([,body])=>({
  weights:body.match(/font-weight:\s*(\d+)\s+(\d+)/)!.slice(1).map(Number),
  ranges:[...body.matchAll(/U\+([a-f\d]+)(?:-([a-f\d]+))?/gi)].map(([,start,end])=>[parseInt(start,16),parseInt(end||start,16)]),
 }));
 assert.ok(faces.length>1,'Chinese font must remain split for on-demand loading');
 const files=['components/TacitQuiz.astro','components/OpticalReport.astro','lib/optical-report.ts','lib/report-export.ts','lib/tacit.ts'];
 const sources=await Promise.all(files.map(file=>readFile(new URL('../apps/web/src/'+file,import.meta.url),'utf8')));
 const chars=new Set((sources.join('')+'张鑫龚涵曦璟昵挽集').match(/\p{Script=Han}/gu));
 for(const char of chars)for(const weight of [400,600,700]){
  const point=char.codePointAt(0)!;
  assert.ok(faces.some(face=>face.weights[0]<=weight&&face.weights[1]>=weight&&face.ranges.some(([a,b])=>a<=point&&point<=b)),`Missing ${char} at weight ${weight}`);
 }
});
