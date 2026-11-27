import type {APIRoute} from 'astro';
import {getContent} from '../lib/content';
import {pageItems} from '../lib/publishing';
import {essays} from '../lib/essays';
import {essayHref} from '../lib/essay-catalog';
export const GET:APIRoute=async({site})=>{
 const data=await getContent();
 const paths=['/','/works/','/albums/','/wild/','/above/','/film/','/film/spring-drift-2026/','/about/','/lab/','/lab/ai-prompts/','/essays/',...essays.map(essayHref),...data.albums.map(a=>`/albums/${a.slug}/`)];
 for(const section of ['works']){
  const count=pageItems(data.photos.filter(p=>p.featured)).length;
  for(let n=2;n<=count;n++)paths.push(`/${section}/${n}/`);
 }
 const urls=data.mode==='demo'?[]:paths;
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path=>`<url><loc>${new URL(path,site).href.replaceAll('&','&amp;')}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
};
