import {Readable} from 'node:stream';
import {fileURLToPath} from 'node:url';
/** Astro dev only: the exact Pages endpoint runs before Astro's trailing-slash guard. */
export function darkroomDev(){return {name:'darkroom-local-api',enforce:'post',configureServer(server){return ()=>{
 server.middlewares.stack.unshift({route:'',handle:async(req,res,next)=>{
  if(!/^\/api\/critique\/?(?:\?|$)/.test(req.url||''))return next();
  try{
   const {handleCritique}=await server.ssrLoadModule(fileURLToPath(new URL('../functions/_critique.ts',import.meta.url)));
   const origin='http://'+(req.headers.host||'localhost:4321'),headers=new Headers();for(const [name,value] of Object.entries(req.headers))if(value)headers.set(name,Array.isArray(value)?value.join(','):value);
   const request=new Request(new URL(req.url,origin),{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
   const response=await handleCritique({request,env:{},waitUntil:()=>{}});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
  }catch(error){server.config.logger.error('[darkroom] '+error.message);res.writeHead(500,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({error:'本地暗房启动失败，请检查开发终端。'}));}
 }});
};}};}
