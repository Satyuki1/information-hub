import handler from 'vinext/server/fetch-handler';
import {processShare} from '../lib/shares';
import {authRoute,adminRoute,getUser,HttpError,json,rateLimit} from '../lib/auth';
import {feishuRoute,syncWiki} from '../lib/feishu';
function secure(response:Response,request:Request){const out=new Response(response.body,response);const url=new URL(request.url);if(!url.pathname.startsWith('/_next/static/'))out.headers.set('Cache-Control','private, no-store, max-age=0');out.headers.set('X-Content-Type-Options','nosniff');out.headers.set('Referrer-Policy','no-referrer');out.headers.set('X-Frame-Options','DENY');out.headers.set('Cross-Origin-Resource-Policy','same-origin');out.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');out.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'; font-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");if(url.protocol==='https:')out.headers.set('Strict-Transport-Security','max-age=31536000');return out;}
export async function gateway(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){
 const url=new URL(request.url),path=url.pathname.replace(/\/+$/,'')||'/',method=request.method;const mutation=!['GET','HEAD','OPTIONS'].includes(method);const publicSubmit=method==='POST'&&['/api/shares','/api/collect'].includes(path);
 if(mutation){const origin=request.headers.get('origin');if((publicSubmit?origin&&origin!==url.origin:origin!==url.origin))throw new HttpError(403,'请求来源无效。');if(publicSubmit)await rateLimit('submit:'+(request.headers.get('cf-connecting-ip')||'unknown'),30,60000);}
 if(path.startsWith('/api/auth/'))return authRoute(request);
 const staticAsset=path.startsWith('/_next/static/')||['/favicon.svg','/favicon.ico','/robots.txt','/install.html'].includes(path)||/^\/shortcuts\/[^/]+\.shortcut$/.test(path);
 const publicPage=['/login','/setup','/collect'].includes(path);
 const user=await getUser(request);
 if(!staticAsset&&!publicPage&&!publicSubmit){
  if(!user){if(path.startsWith('/api/'))throw new HttpError(401,'请先登录。');return Response.redirect(url.origin+'/login',303);}
  if(user.must_change&&!['/account'].includes(path)){if(path.startsWith('/api/'))throw new HttpError(403,'请先修改初始密码。');return Response.redirect(url.origin+'/account',303);}
  if((path==='/admin'||path.startsWith('/api/admin/')||/^\/api\/shares\/[^/]+\/process$/.test(path))&&user.role!=='admin')throw new HttpError(403,'此操作需要管理员权限。');
 }
 if(path.startsWith('/api/admin/'))return adminRoute(request);
 if(path.startsWith('/api/feishu/')){const response=await feishuRoute(request);return response;}
 if((method==='GET'||method==='HEAD')&&staticAsset&&env.ASSETS){const asset=await env.ASSETS.fetch(request);if(path.endsWith('.shortcut')&&asset.ok){const out=new Response(asset.body,asset);out.headers.set('Content-Type','application/octet-stream');out.headers.set('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent('分享到资讯汇集.shortcut'));return out;}return asset;}
 const response=await handler.fetch(request,env,ctx);
 if(publicSubmit&&response.ok){const saved=await response.clone().json() as {item?:{id:string;status:string}};if(response.status===201&&saved.item?.status==='pending')ctx.waitUntil(processShare(saved.item.id));
  // Anonymous submissions must never disclose an existing record, its metadata,
  // duplicate state, or a newly generated private reading link.
  if(!user||user.must_change)return json({accepted:true,message:'已收到分享。内容会在后台整理，登录后可查看。'},202);
 }
 return response;
}
export default {
 async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){try{return secure(await gateway(request,env,ctx),request);}catch(error){return secure(json({error:error instanceof HttpError?error.message:'服务暂时不可用，请稍后重试。'},error instanceof HttpError?error.status:503),request);}},
 async scheduled(_controller:ScheduledController,env:Cloudflare.Env){if(!env.DB)return;const stale=new Date(Date.now()-120000).toISOString();const jobs=await env.DB.prepare("SELECT id FROM shares WHERE status='pending' OR (status='processing' AND updated_at<?) ORDER BY shared_at ASC LIMIT 3").bind(stale).all<{id:string}>();for(const job of jobs.results)await processShare(job.id);await syncWiki();await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE expires<?').bind(Date.now()),env.DB.prepare('DELETE FROM audit_log WHERE at<?').bind(new Date(Date.now()-90*86400000).toISOString()),env.DB.prepare('DELETE FROM auth_flows WHERE expires<?').bind(Date.now()),...([60000,900000].map(window=>env.DB!.prepare("DELETE FROM usage_windows WHERE key LIKE ? AND key NOT LIKE ? AND key NOT LIKE ?").bind('auth:'+window+':%','%:'+Math.floor(Date.now()/window),'%:'+(Math.floor(Date.now()/window)-1))))]);}
};
