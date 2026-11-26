export const MAX_CRITIQUE_BYTES=200_000;
export const CRITIQUE_DIMENSIONS=['composition','lighting','color','mood'] as const;
export const CRITIQUE_LABELS={composition:'构图',lighting:'光影',color:'色彩',mood:'情绪'};
export const CRITIQUE_TONES={gentle:'温和客观',direct:'直白锐评'} as const;
export type CritiqueTone=keyof typeof CRITIQUE_TONES;
type Dimension=typeof CRITIQUE_DIMENSIONS[number];
export interface CritiqueReport {
 score:number;verdict:string;
 dimensions:Record<Dimension,number>;
 analysis:Record<Dimension,string>;
 highlights:[string,string];suggestions:[string,string];
}
export function meanCritiqueScore(dimensions:Record<Dimension,number>){return Math.round(CRITIQUE_DIMENSIONS.reduce((sum,key)=>sum+dimensions[key],0)/CRITIQUE_DIMENSIONS.length*10)/10;}
export const STIFF_CRITIQUE_COPY=/整体很好|光线很好|颜色很好|色彩很好|提高深度感|增加深度感|提高情绪感|图像|该照片|营造出一种|增添了色彩和深度感|社区感|自然与人文(?:和谐)?融合|和谐统一|令人印象深刻|岁月静好|光影交错|相映成趣|层次分明|传递出一种/;
export function validateCritique(value:unknown,requireChinese=true):CritiqueReport {
 const p=value as Record<string,unknown>;
 const score=(v:unknown)=>{const n=typeof v==='number'?v:typeof v==='string'&&/^\d+(\.\d+)?$/.test(v)?Number(v):NaN;if(!Number.isFinite(n)||n<0||n>10)throw Error('Invalid score');return Math.round(n*10)/10;};
 const text=(v:unknown,max:number)=>{if(typeof v!=='string'||!v.trim()||[...v.trim()].length>max||/根据当前照片写|25字以内的|一句话克制总评|具体画面亮点[12]|具体可执行建议[12]/.test(v))throw Error('Invalid report text');if(requireChinese&&(!/[\u3400-\u9fff]/.test(v)||STIFF_CRITIQUE_COPY.test(v)))throw Error('Natural Chinese report required');return v.trim();};
 if(!p||typeof p!=='object'||!p.dimensions||typeof p.dimensions!=='object'||!p.analysis||typeof p.analysis!=='object')throw Error('Invalid report');
 const dims=p.dimensions as Record<string,unknown>,notes=p.analysis as Record<string,unknown>;
 const dimensions={} as Record<Dimension,number>,analysis={} as Record<Dimension,string>;
 for(const key of CRITIQUE_DIMENSIONS){dimensions[key]=score(dims[key]);analysis[key]=text(notes[key],requireChinese?25:600);if(requireChinese&&[...analysis[key]].length<15)throw Error('Dimension note is too short');}
 const list=(v:unknown,max:number):[string,string]=>{if(!Array.isArray(v)||v.length!==2)throw Error('Invalid report list');return [text(v[0],requireChinese?max:600),text(v[1],requireChinese?max:600)];};
 return {score:meanCritiqueScore(dimensions),verdict:text(p.verdict,requireChinese?45:300),dimensions,analysis,highlights:list(p.highlights,40),suggestions:list(p.suggestions,50)};
}
export function formatCritiqueText(report:CritiqueReport,tone:CritiqueTone,mock=false){
 return [`AI 评片 · ${CRITIQUE_TONES[tone]}${mock?'（本地示例，非 AI 分析）':''}`,report.verdict,`综合评分：${meanCritiqueScore(report.dimensions).toFixed(1)} / 10（四项均值）`,'',...CRITIQUE_DIMENSIONS.flatMap(key=>[`${CRITIQUE_LABELS[key]} · ${report.dimensions[key].toFixed(1)} / 10`,report.analysis[key],'']),'调整建议',...report.suggestions.map((text,i)=>`${i+1}. ${text}`),'','https://reverian.cc/lab/?tab=critique'].join('\n');
}
