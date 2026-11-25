import {readFile,writeFile} from 'node:fs/promises';
import {projectWorld,mapFrame} from '../apps/web/src/lib/footprints.ts';

// Apache ECharts 4.9.0 world.json, retained with the existing map license.
const geo=JSON.parse(await readFile(new URL('./data/world.echarts.json',import.meta.url),'utf8'));
const paths=geo.features.filter(f=>f.properties.name!=='Antarctica').map(feature=>{
 const {coordinates,type}=feature.geometry;
 const rings=type==='Polygon'?coordinates:coordinates.flat();
 const d=rings.map(ring=>ring.map(([lon,lat],i)=>{const p=projectWorld(lon,lat);return `${i?'L':'M'}${p.x.toFixed(3)},${p.y.toFixed(3)}`;}).join('')+'Z').join('');
 return `<path d="${d}"/>`;
}).join('\n');
await writeFile(new URL('../apps/web/public/maps/world.svg',import.meta.url),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${mapFrame.width} ${mapFrame.height}"><!-- Derived from Apache ECharts 4.9.0; Apache-2.0; equirectangular projection, Antarctica omitted. --><g fill="#eeeae0" stroke="#c7c2b6" stroke-width=".7" stroke-linejoin="round">${paths}</g></svg>\n`);
console.log(`Generated world map from ${geo.features.length} features.`);
