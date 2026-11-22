import {readFile,writeFile,realpath} from 'node:fs/promises';
import {resolve,relative,isAbsolute,join} from 'node:path';
import {pathToFileURL} from 'node:url';

const attr=(tag,name)=>tag.match(new RegExp('\\s'+name+'="([^"]*)"'))?.[1];
const safePath=(root,file)=>{const rel=relative(root,file);return rel&&!rel.startsWith('..')&&!isAbsolute(rel);};

/** The generated homepage is small enough to inline its three stylesheets.
 * Keep other pages' CSS cached normally, and leave every original photo URL
 * available to no-script visitors, crawlers and the existing lightbox.
 */
export async function optimizeHome({dist,loader=join(import.meta.dirname,'home-image-loader.js'),log=console.log}) {
  const root=await realpath(dist),file=join(root,'index.html');
  let html=await readFile(file,'utf8');
  if(html.includes('id="home-image-loader"'))return {unchanged:true};
  const beforeBytes=Buffer.byteLength(html);
  let styles=0,cssBytes=0,deferred=0;
  for(const [tag] of html.matchAll(/<link\b[^>]*>/g)) {
    if(attr(tag,'rel')!=='stylesheet')continue;
    const href=attr(tag,'href');
    if(!href?.startsWith('/_astro/')||!href.endsWith('.css'))throw Error('Unexpected homepage stylesheet: '+href);
    const path=await realpath(resolve(root,'.'+href));
    if(!safePath(root,path))throw Error('Stylesheet outside publish directory');
    // Vite's / base emits root-relative asset URLs; preserve compiled CSS verbatim,
    // including compatibility targets, prefixes and fallback declarations.
    const css=await readFile(path,'utf8');
    if(/<\/style/i.test(css))throw Error('Unexpected style terminator');
    html=html.replace(tag,`<style data-home-css="${href}">${css}</style>`);
    styles++;cssBytes+=Buffer.byteLength(css);
  }
  html=html.replace(/<img\b[^>]*>/g,tag=>{
    const src=attr(tag,'src');
    if(attr(tag,'loading')!=='lazy'||!src||src.startsWith('data:'))return tag;
    const width=attr(tag,'width'),height=attr(tag,'height');
    if(!/^\d+$/.test(width||'')||!/^\d+$/.test(height||''))throw Error('Deferred image needs dimensions');
    // Intrinsic dimensions match the real image, including width:auto film strips.
    const placeholder='data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"></svg>`);
    const lazy=tag.replace(/\ssrcset="([^"]*)"/,' data-srcset="$1"').replace(/\ssrc="([^"]*)"/,` data-src="$1" src="${placeholder}"`).replace('<img','<img data-deferred-image');
    deferred++;
    return lazy+'<noscript>'+tag+'</noscript>';
  });
  const source=await readFile(loader,'utf8');
  if(/<\/script/i.test(source))throw Error('Unexpected script terminator');
  html=html.replace('</head>','<noscript><style>img[data-deferred-image]{display:none!important}</style></noscript></head>');
  html=html.replace('</body>',`<script id="home-image-loader">${source}</script></body>`);
  await writeFile(file,html);
  const report={styles,cssBytes,deferred,beforeBytes,afterBytes:Buffer.byteLength(html)};
  log('Homepage delivery: '+JSON.stringify(report));
  return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  await optimizeHome({dist:resolve(import.meta.dirname,'../apps/web/dist')});
}
