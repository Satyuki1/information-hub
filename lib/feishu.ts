import {env} from 'cloudflare:workers';
import {HttpError,body,json,requireUser,seal,unseal,setting,setSetting,rateLimit,auditEvent,type SessionUser} from './auth';
import {dayOf,type Article} from './content';
import {archiveMarkdown,dailyKey,markdownParts,type Part} from './feishu-document';
import {getDb} from '../db';
import {shares} from '../db/schema';
import {eq} from 'drizzle-orm';
const OPEN='https://open.feishu.cn/open-apis';const ACCOUNTS='https://accounts.feishu.cn';
export const FEISHU_SCOPES=['offline_access','wiki:space:write_only','wiki:space:retrieve','wiki:space:read','wiki:node:create','wiki:node:retrieve','docx:document:write_only','docs:document.media:upload'];
type App={id:string;secret:string};type Tokens={access_token:string;refresh_token:string};
type Connection={user_id:string;open_id:string;name:string;tokens:string;expires:number;refresh_lock:number;space_id:string;space_name:string};
type Day={id:string;user_id:string;space_id:string;day:string;document_id:string;node_token:string;url:string;state:string;lock:number;error:string};
type Job={id:string;user_id:string;share_id:string;day_id:string;state:string};
type Flow={id:string;user_id:string;session_hash:string;kind:string;payload:string;expires:number;next_poll:number};
// Device registration and authorization follow the official larksuite/cli protocol.
// Credentials stay on the server; the browser only gets an expiring verification URL.
async function form(path:string,params:Record<string,string>,basic?:App){const r=await fetch(ACCOUNTS+path,{method:'POST',redirect:'manual',signal:AbortSignal.timeout(18000),headers:{'Content-Type':'application/x-www-form-urlencoded',...(basic?{Authorization:'Basic '+btoa(basic.id+':'+basic.secret)}:{})},body:new URLSearchParams(params)});let data;try{data=await r.json() as Record<string,any>;}catch{throw new HttpError(502,'飞书授权服务未返回有效结果，请稍后重试。');}if(!r.ok&&!data.error)throw new HttpError(502,'飞书授权服务暂不可用。');return data;}
async function refreshToken(app:App,token:string){const r=await fetch(ACCOUNTS+'/oauth/v3/token',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(18000),headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({grant_type:'refresh_token',refresh_token:token,client_id:app.id,client_secret:app.secret})});return await r.json() as Record<string,any>;}
async function appConfig(){const value=await setting('feishu_app');if(!value)throw new HttpError(409,'请管理员先创建或配置飞书应用。');return unseal<App>(value,'feishu-app');}
async function api(path:string,token:string,method='GET',value?:unknown){if(path.startsWith('/docx/')&&method!=='GET'){const slot=await env.DB!.prepare("INSERT INTO settings(key,value) VALUES('feishu_write_slot',?) ON CONFLICT(key) DO UPDATE SET value=CAST(MAX(CAST(value AS INTEGER)+400,?) AS TEXT) RETURNING value").bind(String(Date.now()),Date.now()).first<{value:string}>();const wait=Number(slot?.value)-Date.now();if(wait>0)await new Promise(resolve=>setTimeout(resolve,Math.min(wait,60000)));}const r=await fetch(OPEN+path,{method,redirect:'manual',signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+token,...(value instanceof FormData?{}:{'Content-Type':'application/json'})},body:value===undefined?undefined:value instanceof FormData?value:JSON.stringify(value)});const data=await r.json() as Record<string,any>;if(!r.ok||data.code!==0)throw new HttpError(502,`飞书操作未完成（${data.code||r.status}），请检查授权范围和知识库权限。`);return data.data||data;}
function approvedURL(value:unknown){try{const u=new URL(String(value));if(u.protocol==='https:'&&['open.feishu.cn','accounts.feishu.cn'].includes(u.hostname)&&!u.username&&!u.password)return u.href;}catch{}throw new HttpError(502,'飞书未返回有效授权链接。');}
async function connection(user:string){const c=await env.DB!.prepare('SELECT * FROM feishu_connections WHERE user_id=?').bind(user).first<Connection>();if(!c)throw new HttpError(409,'请先连接自己的飞书账号。');return c;}
async function tokenFor(user:string){const c=await connection(user);const tokens=await unseal<Tokens>(c.tokens,'feishu-token:'+user);if(c.expires>Date.now()+120000)return tokens.access_token;
 const lease=Date.now()+60000;const claim=await env.DB!.prepare('UPDATE feishu_connections SET refresh_lock=? WHERE user_id=? AND refresh_lock<? RETURNING user_id').bind(lease,user,Date.now()).first();if(!claim)throw new HttpError(409,'飞书授权正在刷新，请稍后重试。');
 try{const app=await appConfig();const r=await refreshToken(app,tokens.refresh_token);if(!r.access_token||r.error)throw new HttpError(409,'飞书授权已到期，请重新连接账号。');await env.DB!.prepare('UPDATE feishu_connections SET tokens=?,expires=?,refresh_lock=0 WHERE user_id=? AND refresh_lock=?').bind(await seal({access_token:r.access_token,refresh_token:r.refresh_token||tokens.refresh_token},'feishu-token:'+user),Date.now()+Number(r.expires_in||7200)*1000,user,lease).run();return String(r.access_token);}catch(e){await env.DB!.prepare('UPDATE feishu_connections SET refresh_lock=0 WHERE user_id=? AND refresh_lock=?').bind(user,lease).run();throw e;}
}
async function newFlow(me:SessionUser,kind:string,payload:Record<string,unknown>,expires:number,interval:number){const id=crypto.randomUUID();await env.DB!.prepare('DELETE FROM auth_flows WHERE user_id=? AND kind=?').bind(me.id,kind).run();await env.DB!.prepare('INSERT INTO auth_flows(id,user_id,session_hash,kind,payload,expires,next_poll) VALUES(?,?,?,?,?,?,?)').bind(id,me.id,me.sessionHash,kind,await seal(payload,'flow:'+id),Date.now()+Math.min(expires,900)*1000,Date.now()+interval*1000).run();return id;}
async function finishFlow(me:SessionUser,input:Record<string,unknown>){const flow=await env.DB!.prepare('SELECT * FROM auth_flows WHERE id=? AND user_id=? AND session_hash=?').bind(String(input.id||''),me.id,me.sessionHash).first<Flow>();if(!flow||flow.expires<Date.now())throw new HttpError(410,'授权已过期，请重新开始。');if(flow.kind==='register'&&me.role!=='admin')throw new HttpError(403,'需要管理员权限。');if(flow.next_poll>Date.now())return json({pending:true,interval:5});
 const claimed=await env.DB!.prepare('UPDATE auth_flows SET next_poll=? WHERE id=? AND next_poll<=? RETURNING id').bind(Date.now()+30000,flow.id,Date.now()).first();if(!claimed)return json({pending:true,interval:5});
 const data=await unseal<{code:string;appId?:string}>(flow.payload,'flow:'+flow.id);let r:Record<string,any>;
 if(flow.kind==='register'){r=await form('/oauth/v1/app/registration',{action:'poll',device_code:data.code});if(r.user_info?.tenant_brand&&r.user_info.tenant_brand!=='feishu')throw new HttpError(400,'当前支持中国版飞书，请使用飞书账号。');}
 else{const app=await appConfig();if(data.appId!==app.id)throw new HttpError(409,'应用配置已变化，请重新发起授权。');r=await form('/oauth/v3/token',{grant_type:'urn:ietf:params:oauth:grant-type:device_code',device_code:data.code,client_id:app.id,client_secret:app.secret});}
 if(['authorization_pending','slow_down'].includes(r.error)){await env.DB!.prepare('UPDATE auth_flows SET next_poll=? WHERE id=?').bind(Date.now()+(r.error==='slow_down'?15000:5000),flow.id).run();return json({pending:true,interval:r.error==='slow_down'?15:5});}
 if(r.error){await env.DB!.prepare('DELETE FROM auth_flows WHERE id=?').bind(flow.id).run();throw new HttpError(400,'授权未完成、被拒绝或已过期，请重新连接。');}
 if(flow.kind==='register'){
  if(!r.client_id||!r.client_secret)return json({pending:true,interval:5});
  const encrypted=await seal({id:r.client_id,secret:r.client_secret},'feishu-app');const inserted=await env.DB!.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES('feishu_app',?)").bind(encrypted).run();if(!inserted.meta.changes)throw new HttpError(409,'应用已经配置，请使用当前应用连接账号。');await auditEvent(me.id,'feishu.app_created');
 }else{
  if(!r.access_token||!r.refresh_token)throw new HttpError(400,'缺少持续授权，请确认 offline_access 权限后重试。');
  const info=await api('/authen/v1/user_info',r.access_token);if(!info.open_id)throw new HttpError(502,'无法确认飞书用户身份。');
  const previous=await env.DB!.prepare('SELECT open_id FROM feishu_connections WHERE user_id=?').bind(me.id).first<{open_id:string}>();if(previous&&previous.open_id!==info.open_id)throw new HttpError(409,'连接的是另一位飞书用户，请先解除旧账号连接。');
  await env.DB!.prepare('INSERT INTO feishu_connections(user_id,open_id,name,tokens,expires,connected_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET open_id=excluded.open_id,name=excluded.name,tokens=excluded.tokens,expires=excluded.expires,refresh_lock=0').bind(me.id,info.open_id,String(info.name||'飞书用户').slice(0,80),await seal({access_token:r.access_token,refresh_token:r.refresh_token},'feishu-token:'+me.id),Date.now()+Number(r.expires_in||7200)*1000,new Date().toISOString()).run();await auditEvent(me.id,'feishu.connected');
 }
 await env.DB!.prepare('DELETE FROM auth_flows WHERE id=?').bind(flow.id).run();return json({complete:true});
}
export async function feishuRoute(request:Request){const me=await requireUser(request);const path=new URL(request.url).pathname;const db=env.DB!;
 if(path==='/api/feishu/status'&&request.method==='GET'){
  const value=await setting('feishu_app');const app=value?await unseal<App>(value,'feishu-app'):null;const c=await db.prepare('SELECT name,space_id,space_name,connected_at FROM feishu_connections WHERE user_id=?').bind(me.id).first();
  const days=(await db.prepare('SELECT id,day,url,state,error FROM wiki_days WHERE user_id=? ORDER BY day DESC LIMIT 90').bind(me.id).all()).results;
  const jobs=(await db.prepare('SELECT e.id,e.share_id,e.state,e.error,e.finished_at,s.title,d.url,d.day FROM wiki_exports e JOIN shares s ON e.share_id=s.id JOIN wiki_days d ON e.day_id=d.id WHERE e.user_id=? ORDER BY e.created_at DESC LIMIT 30').bind(me.id).all()).results;
  return json({configured:!!app,appId:me.role==='admin'?app?.id:undefined,connection:c,autoSync:(await setting('feishu_auto_owner'))===me.id,days,jobs,scopes:FEISHU_SCOPES});
 }
 if(path==='/api/feishu/spaces'&&request.method==='GET'){
  const token=await tokenFor(me.id);const page=new URL(request.url).searchParams.get('page')||'';if(page.length>500)throw new HttpError(400,'分页参数无效。');const data=await api('/wiki/v2/spaces?page_size=50'+(page?'&page_token='+encodeURIComponent(page):''),token);return json({spaces:data.items||[],hasMore:!!data.has_more,nextPage:data.page_token||''});
 }
 if(request.method!=='POST')throw new HttpError(405,'请求方式无效。');const input=await body(request,8192);
 if(path==='/api/feishu/flow/poll')return finishFlow(me,input);
 if(path==='/api/feishu/app/start'){
  if(me.role!=='admin')throw new HttpError(403,'需要管理员权限。');if(await setting('feishu_app'))throw new HttpError(409,'飞书应用已配置。');await rateLimit('feishu-register:'+me.id,3);
  const r=await form('/oauth/v1/app/registration',{action:'begin',archetype:'PersonalAgent',auth_method:'client_secret',request_user_info:'open_id tenant_brand'});if(r.error||!r.device_code||!r.user_code)throw new HttpError(502,'无法启动飞书应用创建，请使用手动配置入口。');
  const interval=Math.max(5,Number(r.interval)||5);const expires=Math.min(900,Number(r.expire_in||r.expires_in)||600);const id=await newFlow(me,'register',{code:r.device_code},expires,interval);const url=new URL('https://open.feishu.cn/page/cli');url.searchParams.set('user_code',r.user_code);return json({id,url:url.href,expires,interval});
 }
 if(path==='/api/feishu/app/manual'){
  if(me.role!=='admin')throw new HttpError(403,'需要管理员权限。');if(await setting('feishu_app'))throw new HttpError(409,'应用已配置，不能覆盖现有连接。');const id=String(input.appId||'').trim(),secret=String(input.appSecret||'').trim();if(!/^cli_[a-zA-Z0-9]+$/.test(id)||secret.length<16||secret.length>256)throw new HttpError(400,'应用凭证格式无效。');
  const r=await fetch(OPEN+'/auth/v3/tenant_access_token/internal',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json'},body:JSON.stringify({app_id:id,app_secret:secret}),signal:AbortSignal.timeout(12000)});const result=await r.json() as {code:number};if(!r.ok||result.code!==0)throw new HttpError(400,'飞书未接受此应用凭证。');await db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES('feishu_app',?)").bind(await seal({id,secret},'feishu-app')).run();await auditEvent(me.id,'feishu.app_configured');return json({ok:true});
 }
 if(path==='/api/feishu/connect'){
  await rateLimit('feishu-connect:'+me.id,5);const app=await appConfig();const r=await form('/oauth/v1/device_authorization',{client_id:app.id,scope:FEISHU_SCOPES.join(' ')},app);if(r.error||!r.device_code)throw new HttpError(502,'飞书未能发起授权。请管理员检查应用发布状态及权限。');const interval=Math.max(5,Number(r.interval)||5),expires=Math.min(900,Number(r.expires_in)||240);const id=await newFlow(me,'connect',{code:r.device_code,appId:app.id},expires,interval);return json({id,url:approvedURL(r.verification_uri_complete||r.verification_uri),userCode:r.user_code,expires,interval});
 }
 if(path==='/api/feishu/disconnect'){
  await db.batch([db.prepare('DELETE FROM feishu_connections WHERE user_id=?').bind(me.id),db.prepare('DELETE FROM auth_flows WHERE user_id=?').bind(me.id),db.prepare("UPDATE wiki_exports SET state='cancelled',error='已解除飞书连接' WHERE user_id=? AND state='pending'").bind(me.id),db.prepare("DELETE FROM settings WHERE key='feishu_auto_owner' AND value=?").bind(me.id)]);await auditEvent(me.id,'feishu.disconnected');return json({ok:true});
 }
 if(path==='/api/feishu/spaces/create'){
  await rateLimit('feishu-space:'+me.id,3);const name=String(input.name||'资讯汇集').trim().slice(0,100);const data=await api('/wiki/v2/spaces',await tokenFor(me.id),'POST',{name,description:'按北京时间每日归档的资讯阅读库',open_sharing:'closed'});if(!data.space?.space_id)throw new HttpError(502,'飞书未返回知识库标识，请先检查飞书后再重试。');await db.prepare('UPDATE feishu_connections SET space_id=?,space_name=? WHERE user_id=?').bind(data.space.space_id,name,me.id).run();await auditEvent(me.id,'feishu.space_created',data.space.space_id);return json({space:data.space});
 }
 if(path==='/api/feishu/target'){
  const id=String(input.spaceId||'');if(!/^\d+$/.test(id))throw new HttpError(400,'请选择有效知识库。');const data=await api('/wiki/v2/spaces/'+id,await tokenFor(me.id));await db.prepare('UPDATE feishu_connections SET space_id=?,space_name=? WHERE user_id=?').bind(id,String(data.space?.name||'知识库'),me.id).run();return json({ok:true});
 }
 if(path==='/api/feishu/auto'){
  if(me.role!=='admin')throw new HttpError(403,'需要管理员权限。');const c=await connection(me.id);if(input.enabled&&!c.space_id)throw new HttpError(400,'请先创建或选择知识库。');if(input.enabled){await setSetting('feishu_auto_owner',me.id);await setSetting('feishu_auto_since',new Date().toISOString());await setSetting('site_origin',new URL(request.url).origin);}else await db.prepare("DELETE FROM settings WHERE key='feishu_auto_owner' AND value=?").bind(me.id).run();await auditEvent(me.id,input.enabled?'feishu.auto_enabled':'feishu.auto_disabled');return json({ok:true});
 }
 if(path==='/api/feishu/retry'){
  await rateLimit('feishu-retry:'+me.id,10);const changed=await db.prepare("UPDATE wiki_exports SET state='pending',error='' WHERE id=? AND user_id=? AND state='failed' AND day_id IN(SELECT id FROM wiki_days WHERE state<>'uncertain' AND lock=0) RETURNING id").bind(String(input.jobId||''),me.id).first();if(!changed)throw new HttpError(409,'此任务结果不确定，不能安全重试。请先在飞书核对文档。');return json({ok:true});
 }
 if(path==='/api/feishu/export'){
  await rateLimit('feishu-export:'+me.id,20);const id=String(input.shareId||'');const item=await getDb().select().from(shares).where(eq(shares.id,id)).get();if(!item)throw new HttpError(404,'资讯不存在。');if(item.status!=='ready')throw new HttpError(409,'请等待资讯整理完成。');await setSetting('site_origin',new URL(request.url).origin);const job=await enqueue(me.id,item);if(['failed','uncertain','cancelled'].includes(job.state))throw new HttpError(409,'上次归档未完成，请到账号与飞书查看记录。');return json({job,message:job.state==='done'?'这条资讯已归档':'已加入当天文档的归档队列'},202);
 }
 throw new HttpError(404,'接口不存在。');
}
export async function enqueue(user:string,item:Article){const c=await connection(user);if(!c.space_id)throw new HttpError(409,'请先创建或选择飞书知识库。');const date=item.collectedAt||item.sharedAt;const dayId=dailyKey(user,c.space_id,date);const id=user+':'+item.id;
 await env.DB!.batch([env.DB!.prepare('INSERT OR IGNORE INTO wiki_days(id,user_id,space_id,day) VALUES(?,?,?,?)').bind(dayId,user,c.space_id,dayOf(date)),env.DB!.prepare('INSERT OR IGNORE INTO wiki_exports(id,user_id,share_id,day_id,created_at) VALUES(?,?,?,?,?)').bind(id,user,item.id,dayId,new Date().toISOString())]);return (await env.DB!.prepare('SELECT id,state FROM wiki_exports WHERE id=?').bind(id).first<{id:string;state:string}>())!;
}
async function importImage(token:string,document:string,blockId:string,url:string){
 const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000)});if(!r.ok||!/^image\/(jpeg|png|gif|webp)/.test(r.headers.get('content-type')||'')||Number(r.headers.get('content-length'))>8*1024*1024)throw new Error('配图下载失败');
 const reader=r.body!.getReader();const chunks:Uint8Array[]=[];let size=0;for(;;){const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>8*1024*1024){await reader.cancel();throw new Error('图片过大');}chunks.push(p.value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const data=new FormData();const filename='article-image.'+(r.headers.get('content-type')!.split('/')[1].split(';')[0]);data.set('file_name',filename);data.set('parent_type','docx_image');data.set('parent_node',blockId);data.set('extra',JSON.stringify({drive_route_token:document}));data.set('size',String(size));data.set('file',new Blob([bytes],{type:r.headers.get('content-type')!}),filename);const uploaded=await api('/drive/v1/medias/upload_all',token,'POST',data);if(!uploaded.file_token)throw new Error('图片上传失败');await api(`/docx/v1/documents/${document}/blocks/${blockId}`,token,'PATCH',{replace_image:{token:uploaded.file_token}});
}
async function appendParts(token:string,document:string,parts:Part[],renew:()=>Promise<void>){let warnings=0;for(let i=0;i<parts.length;i+=40){await renew();const batch=parts.slice(i,i+40);const result=await api(`/docx/v1/documents/${document}/blocks/${document}/children`,token,'POST',{index:-1,children:batch.map(p=>p.block)});if(!Array.isArray(result.children)||result.children.length!==batch.length)throw new Error('文档写入结果不完整');for(let n=0;n<batch.length;n++){if(batch[n].image){await renew();try{await importImage(token,document,result.children[n].block_id,batch[n].image!);}catch{warnings++;await api(`/docx/v1/documents/${document}/blocks/${document}/children`,token,'POST',{index:-1,children:[{block_type:2,text:{elements:[{text_run:{content:'配图未能内嵌，点击查看原图',text_element_style:{link:{url:batch[n].image}}}}]}}]});}}}}return warnings;}
export async function syncWiki(){const db=env.DB;if(!db)return;
 // Recover abandoned work conservatively: an unknown upstream outcome must not duplicate text.
 await db.prepare("UPDATE wiki_exports SET state='uncertain',error='上次写入中断，请在飞书核对文档；未自动重复追加。' WHERE state='writing' AND day_id IN (SELECT id FROM wiki_days WHERE lock<?)").bind(Date.now()).run();
 const owner=await setting('feishu_auto_owner');if(owner){const allowed=await db.prepare("SELECT c.user_id FROM feishu_connections c JOIN users u ON u.id=c.user_id WHERE c.user_id=? AND u.active=1 AND u.role='admin' AND u.must_change=0 AND c.space_id<>''").bind(owner).first();if(allowed){const since=await setting('feishu_auto_since');const ready=await db.prepare("SELECT id FROM shares WHERE status='ready' AND translated_at>=? AND id NOT IN(SELECT share_id FROM wiki_exports WHERE user_id=?) ORDER BY COALESCE(NULLIF(collected_at,''),shared_at) LIMIT 10").bind(since,owner).all<{id:string}>();for(const {id} of ready.results){const item=await getDb().select().from(shares).where(eq(shares.id,id)).get();if(item)await enqueue(owner,item);}}}
 const jobs=await db.prepare("SELECT e.* FROM wiki_exports e JOIN users u ON u.id=e.user_id JOIN shares s ON s.id=e.share_id JOIN wiki_days d ON d.id=e.day_id WHERE d.state<>'uncertain' AND d.lock<? AND e.state='pending' AND u.active=1 AND u.must_change=0 ORDER BY COALESCE(NULLIF(s.collected_at,''),s.shared_at) LIMIT 2").bind(Date.now()).all<Job>();
 for(const job of jobs.results){let lease=Date.now()+300000;const day=await db.prepare("UPDATE wiki_days SET lock=? WHERE id=? AND lock<? AND state<>'uncertain' RETURNING *").bind(lease,job.day_id,Date.now()).first<Day>();if(!day)continue;
  const renew=async()=>{const next=Date.now()+300000;const held=await db.prepare("UPDATE wiki_days SET lock=? WHERE id=? AND lock=? AND EXISTS(SELECT 1 FROM feishu_connections c JOIN users u ON c.user_id=u.id WHERE c.user_id=? AND c.space_id=? AND u.active=1 AND u.must_change=0) RETURNING id").bind(next,day.id,lease,job.user_id,day.space_id).first();if(!held)throw new HttpError(409,'归档授权或处理状态已改变，请核对文档。');lease=next;};
  let writing=false;try{
   const c=await connection(job.user_id);if(c.space_id!==day.space_id)throw new HttpError(409,'知识库已更换，旧队列暂不写入。');const token=await tokenFor(job.user_id);
   if(!day.document_id){
    // Mark creation before the request; a timeout can mean the node exists already.
    await db.prepare("UPDATE wiki_days SET state='uncertain',error='正在创建当天文档；若中断请检查飞书，避免重复创建。' WHERE id=?").bind(day.id).run();
    const created=await api(`/wiki/v2/spaces/${day.space_id}/nodes`,token,'POST',{obj_type:'docx',node_type:'origin',title:`${day.day} · 资讯汇集`});const node=created.node;if(!node?.obj_token||!node.node_token)throw new Error('缺少文档标识');day.document_id=node.obj_token;day.node_token=node.node_token;day.url=`https://feishu.cn/wiki/${node.node_token}`;
    await db.prepare("UPDATE wiki_days SET document_id=?,node_token=?,url=?,state='ready',error='' WHERE id=?").bind(day.document_id,day.node_token,day.url,day.id).run();
   }
   const claimed=await db.prepare("UPDATE wiki_exports SET state='writing' WHERE id=? AND state='pending' RETURNING id").bind(job.id).first();if(!claimed)continue;writing=true;
   const item=await getDb().select().from(shares).where(eq(shares.id,job.share_id)).get();if(!item)throw new Error('资讯已不存在');const origin=await setting('site_origin');const parts=markdownParts(archiveMarkdown(item,origin));if(parts.length>850)throw new Error('正文块数量过多，请分段整理后手动归档。');const warnings=await appendParts(token,day.document_id,parts,renew);
   await db.prepare("UPDATE wiki_exports SET state='done',error=?,finished_at=? WHERE id=?").bind(warnings?`${warnings} 张图片保留为原图链接。`:'',new Date().toISOString(),job.id).run();await auditEvent(job.user_id,'feishu.article_archived',job.share_id);
  }catch(e){const message=e instanceof HttpError?e.message:writing?'写入可能未完整完成，请在飞书核对；未自动重复追加。':'飞书归档未完成，请检查账号与知识库权限。';await db.prepare('UPDATE wiki_exports SET state=?,error=? WHERE id=?').bind(writing?'uncertain':'failed',message,job.id).run();}
  finally{await db.prepare('UPDATE wiki_days SET lock=0 WHERE id=? AND lock=?').bind(day.id,lease).run();}
 }
}
