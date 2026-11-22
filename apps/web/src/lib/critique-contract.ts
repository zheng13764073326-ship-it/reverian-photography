export const MAX_CRITIQUE_BYTES=200_000;
export const CRITIQUE_DIMENSIONS=['composition','lighting','color','mood'] as const;
export interface CritiqueReport {
 score:number;verdict:string;
 dimensions:Record<typeof CRITIQUE_DIMENSIONS[number],number>;
 highlights:[string,string];suggestions:[string,string];
}
export function validateCritique(value:unknown,requireChinese=true):CritiqueReport {
 const p=value as Record<string,unknown>;
 const score=(v:unknown)=>{const n=typeof v==='number'?v:typeof v==='string'&&/^\d+(\.\d+)?$/.test(v)?Number(v):NaN;if(!Number.isFinite(n)||n<0||n>10)throw Error('Invalid score');return Math.round(n*10)/10;};
 const text=(v:unknown,max:number)=>{if(typeof v!=='string'||!v.trim()||[...v.trim()].length>max||/25字以内的|一句话克制总评|具体画面亮点[12]|具体可执行建议[12]/.test(v))throw Error('Invalid report text');if(requireChinese&&!/[\u3400-\u9fff]/.test(v))throw Error('Chinese report required');return v.trim();};
 const list=(v:unknown):[string,string]=>{if(!Array.isArray(v)||v.length!==2)throw Error('Invalid report list');return [text(v[0],220),text(v[1],220)];};
 if(!p||typeof p!=='object'||!p.dimensions||typeof p.dimensions!=='object')throw Error('Invalid report');
 const dims=p.dimensions as Record<string,unknown>;
 return {score:score(p.score),verdict:text(p.verdict,requireChinese?25:220),dimensions:{composition:score(dims.composition),lighting:score(dims.lighting),color:score(dims.color),mood:score(dims.mood)},highlights:list(p.highlights),suggestions:list(p.suggestions)};
}
