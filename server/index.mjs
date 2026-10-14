import {createServer} from 'node:http';
import {registerHooks} from 'node:module';
import {readFile,mkdir,writeFile,chmod,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {sqliteBinding,migrate} from './sqlite.mjs';
const port=Number(process.env.PORT||8787),host=process.env.HOST||'127.0.0.1';
const origin=new URL(process.env.PUBLIC_ORIGIN||`http://localhost:${port}`);
if(origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password||!(origin.protocol==='https:'||origin.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(origin.hostname)))throw new Error('PUBLIC_ORIGIN must be your HTTPS origin, or localhost for local use.');
const directory=resolve(process.env.DATA_DIR||'work/server-data');await mkdir(directory,{recursive:true,mode:0o700});
const keyFile=resolve(directory,'encryption.key'),databaseFile=resolve(directory,'information-hub.sqlite');
let key;try{key=(await readFile(keyFile,'utf8')).trim();}catch(e){if(e.code!=='ENOENT')throw e;try{await stat(databaseFile);throw new Error('Database exists but encryption.key is missing. Restore the original key; refusing to replace it.');}catch(error){if(error.code!=='ENOENT')throw error;}key=randomBytes(32).toString('base64url');await writeFile(keyFile,key+'\n',{flag:'wx',mode:0o600});}
if(!/^[A-Za-z0-9_-]{43}$/.test(key))throw new Error('Invalid encryption.key; restore the original key.');
const {sql,db}=sqliteBinding(databaseFile);await chmod(databaseFile,0o600);await migrate(sql,new URL('../drizzle/',import.meta.url));
sql.prepare("INSERT INTO settings(key,value) VALUES('site_origin',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(origin.origin);
const initialized=Number(sql.prepare('SELECT count(*) n FROM users').get().n)>0;
if(!initialized){
 const expires=Number(sql.prepare("SELECT value FROM settings WHERE key='bootstrap_expires'").get()?.value||0),note=resolve(directory,'setup.md');
 if(expires<=Date.now()||process.argv.includes('--setup-link')){const token=randomBytes(32).toString('base64url'),hash=createHash('sha256').update(token).digest('base64url');for(const[k,v]of [['bootstrap_hash',hash],['bootstrap_expires',String(Date.now()+86400000)]])sql.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k,v);await writeFile(note,`# Owner-only setup link\n\n${origin.origin}/setup#token=${token}\n\nExpires in 24 hours. Do not share this file.\n`,{mode:0o600});}
 console.log(`Owner setup link is saved privately: ${note}`);
}
if(process.argv.includes('--setup-link')){sql.close();process.exit(0);}
const assetRoot=resolve('dist/client'),types={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.html':'text/html','.txt':'text/plain','.md':'text/markdown','.woff2':'font/woff2'};
const ASSETS={async fetch(request){let path;try{path=decodeURIComponent(new URL(request.url).pathname);}catch{return new Response('Not found',{status:404});}const file=resolve(assetRoot,'.'+path);if(!file.startsWith(assetRoot+sep)||path.includes('\0'))return new Response('Not found',{status:404});try{const data=await readFile(file);return new Response(request.method==='HEAD'?null:data,{headers:{'Content-Type':types[extname(file)]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}}};
globalThis.informationHubEnv={DB:db,DATA_ENCRYPTION_KEY:key,ASSETS};
registerHooks({resolve(specifier,context,next){if(specifier==='cloudflare:workers')return {url:new URL('./cloudflare-env.mjs',import.meta.url).href,shortCircuit:true};return next(specifier,context);}});
const worker=(await import('../dist/server/index.js')).default;
const pending=new Set();const ctx={waitUntil(promise){const task=Promise.resolve(promise).catch(()=>console.warn('Background job failed')).finally(()=>pending.delete(task));pending.add(task);},passThroughOnException(){}};
const server=createServer(async(incoming,outgoing)=>{
 try{
  const url=new URL(incoming.url||'/',origin);if(url.origin!==origin.origin){outgoing.writeHead(400).end();return;}
  const headers=new Headers();for(const[name,value]of Object.entries(incoming.headers))if(value)headers.set(name,Array.isArray(value)?value.join(','):value);
  // Only a trusted reverse proxy may supply the original client address.
  const ip=process.env.TRUST_PROXY==='1'?String(incoming.headers['x-forwarded-for']||incoming.socket.remoteAddress).split(',')[0].trim():incoming.socket.remoteAddress;
  headers.set('cf-connecting-ip',ip||'unknown');headers.set('host',origin.host);
  const chunks=[];let size=0;for await(const chunk of incoming){size+=chunk.length;if(size>1024*1024){outgoing.writeHead(413).end('Request too large');return;}chunks.push(chunk);}
  const controller=new AbortController();outgoing.on('close',()=>{if(!outgoing.writableFinished)controller.abort();});
  const request=new Request(url,{method:incoming.method,headers,body:['GET','HEAD'].includes(incoming.method)?undefined:Buffer.concat(chunks),signal:controller.signal});
  const response=await worker.fetch(request,globalThis.informationHubEnv,ctx),outputHeaders=Object.fromEntries(response.headers);const cookies=response.headers.getSetCookie();if(cookies.length)outputHeaders['set-cookie']=cookies;
  outgoing.writeHead(response.status,outputHeaders);
  if(response.body&&incoming.method!=='HEAD')await pipeline(Readable.fromWeb(response.body),outgoing);else outgoing.end();
 }catch{if(!outgoing.headersSent)outgoing.writeHead(500).end('Request failed');else outgoing.destroy();}
});
let scheduling=false;const tick=async()=>{if(scheduling)return;scheduling=true;try{await worker.scheduled({},globalThis.informationHubEnv,ctx);}catch{console.warn('Scheduled job failed');}finally{scheduling=false;}};
const timer=setInterval(tick,60000);timer.unref();server.listen(port,host,()=>console.log(`X to Group is listening at ${origin.origin}; SQLite: ${databaseFile}`));
let closing=false;for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{if(closing)return;closing=true;clearInterval(timer);server.close(async()=>{await Promise.allSettled([...pending]);while(scheduling)await new Promise(r=>setTimeout(r,100));sql.close();process.exit(0);});setTimeout(()=>process.exit(1),30000).unref();});
