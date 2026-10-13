import {env} from 'cloudflare:workers';
import {HttpError,body,json,auditEvent,setSetting,type SessionUser} from './auth';
import {AI_PROVIDERS,loadConfig,saveConfig,saveSecrets,secretStatus,normalizeConfig,publicHttps,provider,usage,getSecret,beijingDay} from './config';
import {CHANNEL_LABELS,channel,fetchProfile} from './x-source';
import {generate,parseJSON} from './ai';
import {applyPushSince,sendTest,pushStats,type PushChannel} from './push';
import {subscriptionRoute} from './subscriptions';
function merge(base:unknown,patch:unknown):unknown{if(!patch||typeof patch!=='object'||Array.isArray(patch)||!base||typeof base!=='object')return patch===undefined?base:patch;const out:Record<string,unknown>={...base as Record<string,unknown>};for(const [k,v] of Object.entries(patch))out[k]=merge(out[k],v);return out;}
async function configView(request:Request){
 const config=await loadConfig();const p=provider(config);
 return {config,secrets:await secretStatus(),providers:AI_PROVIDERS,channels:CHANNEL_LABELS,activeModel:p.model,activeChannel:(await channel(config)).mode,usage:{ai:await usage('ai'),xapi:await usage('xapi')},origin:new URL(request.url).origin};
}
// Admin-only endpoints added with the configuration center. The gateway has already checked the role.
export async function adminApi(request:Request,me:SessionUser):Promise<Response|null>{
 const path=new URL(request.url).pathname;
 if(path.startsWith('/api/admin/subscriptions'))return subscriptionRoute(request,me);
 if(path==='/api/admin/config'&&request.method==='GET'){await setSetting('site_origin',new URL(request.url).origin);return json(await configView(request));}
 if(path==='/api/admin/config'&&request.method==='PUT'){
  const input=await body(request,32000);const previous=await loadConfig();
  const next=normalizeConfig(merge(previous,input.config));
  if(next.ai.baseUrl&&!publicHttps(next.ai.baseUrl))throw new HttpError(400,'模型接口地址需为公开的 HTTPS 地址。');
  if(next.site.origin&&!publicHttps(next.site.origin))throw new HttpError(400,'站点地址需为 https:// 开头的公开地址。');
  if(next.ai.provider==='custom'&&!next.ai.baseUrl)throw new HttpError(400,'自定义模型需要填写接口地址。');
  await saveConfig(applyPushSince(next,previous));
  if(input.secrets&&typeof input.secrets==='object')await saveSecrets(input.secrets as Record<string,unknown>);
  await auditEvent(me.id,'config.updated',[input.config?Object.keys(input.config as object).join(','):'',input.secrets?'secrets:'+Object.keys(input.secrets as object).join(','):''].filter(Boolean).join(' '));
  return json(await configView(request));
 }
 if(path==='/api/admin/config/test'&&request.method==='POST'){
  const input=await body(request,2048);const target=String(input.target||'');
  try{
   if(target==='ai'){const started=Date.now();const r=await generate({system:'你是连接测试助手。只输出 JSON：{"ok":true,"reply":"不超过20字的中文问候"}',user:'请回复连接测试。',json:true,schema:{type:'object',properties:{ok:{type:'boolean'},reply:{type:'string'}},required:['ok','reply'],additionalProperties:false},maxTokens:2000,purpose:'test'});const d=parseJSON<{reply?:string}>(r.text);return json({ok:true,message:`${r.provider} · ${r.model} 连接正常（${((Date.now()-started)/1000).toFixed(1)} 秒）：${String(d.reply||'已响应').slice(0,40)}`});}
   if(target==='x'){const c=await channel();if(c.mode==='public_preview')return json({ok:true,message:'当前使用公开预览：无需密钥，但只能获取单条帖子的可见文字，无法订阅账号。'});const p=await fetchProfile('X',c);return json({ok:true,message:`${CHANNEL_LABELS[c.mode]} 连接正常，已读取 @${p.handle}（${p.name}）。`});}
   if(target==='feishu'||target==='wecom'){const r=await sendTest(target as PushChannel);if(r.state!=='sent')throw new Error(r.error);return json({ok:true,message:'测试消息已发送，请到群里查看。'});}
  }catch(e){return json({ok:false,message:e instanceof Error?e.message:'测试未通过。'});}
  throw new HttpError(400,'未知的测试项。');
 }
 if(path==='/api/admin/overview'&&request.method==='GET'){
  const db=env.DB!;const config=await loadConfig();const today=new Date(new Date(beijingDay()+'T00:00:00+08:00').getTime()).toISOString();
  const count=async(q:string,...a:unknown[])=>(await db.prepare(q).bind(...a).first<{n:number}>())?.n||0;
  const states=(await db.prepare('SELECT status,count(*) n FROM shares GROUP BY status').all<{status:string;n:number}>()).results;
  const days=(await db.prepare("SELECT substr(datetime(COALESCE(NULLIF(collected_at,''),shared_at),'+8 hours'),1,10) day,count(*) n,sum(source='subscription') subs FROM shares WHERE COALESCE(NULLIF(collected_at,''),shared_at)>=? GROUP BY day ORDER BY day").bind(new Date(Date.now()-14*86400000).toISOString()).all<{day:string;n:number;subs:number}>()).results;
  const p=provider(config);const c=await channel(config);
  return json({
   total:await count('SELECT count(*) n FROM shares'),today:await count("SELECT count(*) n FROM shares WHERE COALESCE(NULLIF(collected_at,''),shared_at)>=?",today),states,days,
   users:await count('SELECT count(*) n FROM users WHERE active=1'),subscriptions:await count('SELECT count(*) n FROM subscriptions WHERE enabled=1'),
   sharers:(await db.prepare("SELECT sharer,count(*) n FROM shares WHERE source='share' GROUP BY sharer ORDER BY n DESC LIMIT 6").all()).results,
   report:await db.prepare('SELECT day,title,status,error FROM daily_reports ORDER BY day DESC LIMIT 1').first(),
   usage:{ai:await usage('ai'),aiLimit:config.site.aiDailyLimit,xapi:await usage('xapi'),xapiLimit:config.site.xDailyLimit},
   health:{ai:{ok:!!await getSecret(`ai:${p.id}` as const)&&!!p.model,label:`${p.label} · ${p.model||'未设置模型'}`},x:{ok:c.mode!=='public_preview',label:CHANNEL_LABELS[c.mode]},feishu:{ok:config.push.feishu.enabled,label:config.push.feishu.enabled?'已开启':'未开启'},wecom:{ok:config.push.wecom.enabled,label:config.push.wecom.enabled?'已开启':'未开启'},report:{ok:config.report.enabled,label:config.report.enabled?`每天 ${config.report.hour}:00 生成`:'未开启'},analysis:{ok:config.analysis.enabled&&!!config.analysis.focus,label:config.analysis.enabled?(config.analysis.focus?'已开启':'缺少关注方向'):'未开启'}},
   push:await pushStats(),
  });
 }
 return null;
}
