import {readFile,writeFile} from 'node:fs/promises';
import {projectChina,mapFrame} from '../apps/web/src/lib/footprints.ts';

// Derived from Apache ECharts 4.9.0 china.json; see public/maps/SOURCES.md.
const geo=JSON.parse(await readFile(new URL('./data/china.echarts.json',import.meta.url),'utf8'));
function decode(text,offset) {
  let [x,y]=offset;const points=[];
  for(let i=0;i<text.length;i+=2){
    const a=text.charCodeAt(i)-64,b=text.charCodeAt(i+1)-64;
    x+=(a>>1)^(-(a&1));y+=(b>>1)^(-(b&1));
    points.push(projectChina(x/1024,y/1024));
  }
  return points;
}
const paths=geo.features.map(feature=>{
  const {coordinates,encodeOffsets,type}=feature.geometry;
  const rings=type==='Polygon'?coordinates.map((s,i)=>decode(s,encodeOffsets[i])):
    coordinates.flatMap((polygon,i)=>polygon.map((s,j)=>decode(s,encodeOffsets[i][j])));
  const d=rings.map(ring=>ring.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('')+'Z').join('');
  return `<path d="${d}"/>`;
}).join('\n');
await writeFile(new URL('../apps/web/public/maps/china.svg',import.meta.url),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${mapFrame.width} ${mapFrame.height}"><!-- Derived from Apache ECharts 4.9.0; Apache-2.0; projected and restyled for Reverian. --><g fill="#eeeae0" stroke="#c7c2b6" stroke-width=".8" stroke-linejoin="round">${paths}</g></svg>\n`);
console.log(`Generated China map: ${geo.features.length} regions.`);
