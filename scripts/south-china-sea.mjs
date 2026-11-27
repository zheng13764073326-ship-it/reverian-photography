// Geometry comes from the retained DataV source; see public/maps/SOURCES.md.
export function southChinaSeaInset(geo){
 const project=([lon,lat])=>[6+(lon-105)*6.1,8+(24-lat)*6.9];
 const path=polygon=>polygon.map(ring=>ring.map((p,i)=>{const [x,y]=project(p);return `${i?'L':'M'}${x.toFixed(3)},${y.toFixed(3)}`;}).join('')+'Z').join('');
 const coast=geo.features.filter(f=>f.properties.adcode!=='100000_JD').flatMap(f=>f.geometry.coordinates.map(p=>`<path data-sea-island d="${path(p)}"/>`)).join('');
 const dashes=geo.features.find(f=>f.properties.adcode==='100000_JD').geometry.coordinates.filter(p=>p.flat().every(([,lat])=>lat<22));
 if(dashes.length!==9)throw Error(`Expected nine southern dash polygons, received ${dashes.length}`);
 return `<svg data-south-china-sea x="824" y="470" width="142" height="204" viewBox="0 0 132 190" overflow="hidden" aria-label="南海诸岛与九段线附图"><rect x=".5" y=".5" width="131" height="189" rx="1" fill="#f4f1e9" stroke="#c7c2b6" stroke-width=".7"/><svg x="5" y="5" width="122" height="164" viewBox="0 0 122 164" overflow="hidden"><g fill="#eeeae0" stroke="#c7c2b6" stroke-width=".7" stroke-linejoin="round">${coast}</g><g fill="#a5a093" stroke="#a5a093" stroke-width=".5">${dashes.map(p=>`<path data-nine-dash d="${path(p)}"/>`).join('')}</g></svg><text x="66" y="182" text-anchor="middle" font-size="13" font-family="Noto Serif SC Variable,serif" fill="#73736a" letter-spacing="2">南海诸岛</text></svg>`;
}
