export const AI_PROMPTS_PATH='/lab/ai-prompts/';
export const PROMPT_SEARCH_THRESHOLD=20;
export const RECENT_PROMPT_DAYS=14;
type DatedPrompt={index:string;createdAt:string;updatedAt?:string};
export function promptTimestamp(work:DatedPrompt){
  return Date.parse(work.updatedAt||work.createdAt)||0;
}
export function sortPrompts<T extends DatedPrompt>(works:readonly T[]):T[]{
  return [...works].sort((a,b)=>promptTimestamp(b)-promptTimestamp(a)||Number(a.index)-Number(b.index));
}
export function recentPrompts<T extends DatedPrompt & {id:string}>(works:readonly T[],now=Date.now()){
  return sortPrompts(works).filter(work=>{const age=now-promptTimestamp(work);return age>=0&&age<RECENT_PROMPT_DAYS*86400000;}).slice(0,2).map(work=>work.id);
}
export function normalizePromptSearch(text:string){return text.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim();}
export function matchesPromptSearch(text:string,query:string){
  const haystack=normalizePromptSearch(text);
  return normalizePromptSearch(query).split(' ').every(term=>haystack.includes(term));
}
