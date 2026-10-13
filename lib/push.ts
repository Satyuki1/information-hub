import {env} from 'cloudflare:workers';
import {loadConfig,getSecret,siteOrigin,feishuWebhook,wecomWebhook,type AppConfig,type PushTarget} from './config';
import {buildWecomMessage,clipBytes,messageText} from './wecom-message';
export type PushChannel='feishu'|'wecom';
export const CHANNELS:PushChannel[]=['feishu','wecom'];
type Message={title:string;lead:string;body:string;url:string;meta:string};
type Delivery={id:string;channel:PushChannel;kind:'share'|'report';target_id:string;attempts:number};
// Feishu custom bots sign "timestamp\nsecret" as the HMAC key over an empty message.
export async function feishuSign(timestamp:string,secret:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(`${timestamp}\n${secret}`),{name:'HMAC',hash:'SHA-256'},false,['sign']);return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',key,new Uint8Array()))));}
export function feishuCard(m:Message){
 return {msg_type:'interactive',card:{config:{wide_screen_mode:true},header:{template:'blue',title:{tag:'plain_text',content:clipBytes(m.title,200)}},elements:[
  ...(m.meta?[{tag:'note',elements:[{tag:'plain_text',content:clipBytes(m.meta,200)}]}]:[]),
  ...(m.lead?[{tag:'div',text:{tag:'plain_text',content:clipBytes(m.lead,1200)}}]:[]),
  ...(m.body?[{tag:'hr'},{tag:'div',text:{tag:'lark_md',content:clipBytes(m.body,3000)}}]:[]),
  {tag:'action',actions:[{tag:'button',type:'primary',text:{tag:'plain_text',content:'阅读全文'},url:m.url}]}]}};
}
// AI-written text must never create @-mentions or raw markup in a group chat.
const unmark=(t:string)=>t.replace(/[<>]/g,c=>c==='<'?'＜':'＞');
export async function send(channel:PushChannel,raw:Message,wecomFallback?:Record<string,unknown>):Promise<{state:'sent'|'failed'|'retry'|'uncertain';error:string}>{
 const m={...raw,title:unmark(raw.title),lead:unmark(raw.lead),body:unmark(raw.body),meta:unmark(raw.meta)};
 if(channel==='feishu'){
  const hook=feishuWebhook(await getSecret('feishuWebhook'));if(!hook)return {state:'failed',error:'未配置飞书机器人地址。'};
  const secret=await getSecret('feishuSecret');const payload:Record<string,unknown>=feishuCard(m);
  if(secret){const timestamp=String(Math.floor(Date.now()/1000));payload.timestamp=timestamp;payload.sign=await feishuSign(timestamp,secret);}
  try{const r=await fetch(hook.href,{method:'POST',redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json() as {code?:number;StatusCode?:number;msg?:string};const code=d.code??d.StatusCode;
   if(r.ok&&code===0)return {state:'sent',error:''};
   if(code===11232||r.status===429)return {state:'retry',error:'飞书机器人限流，稍后自动重试。'};
   return {state:'failed',error:code===19021?'飞书签名校验失败，请检查签名密钥。':`飞书拒绝推送（${code??r.status}），请检查机器人配置。`};}
  catch{return {state:'uncertain',error:'发送未确认；为避免重复提醒，未自动重发。'};}
 }
 const hook=wecomWebhook(await getSecret('wecomWebhook'));if(!hook)return {state:'failed',error:'未配置企业微信机器人地址。'};
 const content=[`## ${clipBytes(messageText(m.title),240)}`,m.meta?`> ${clipBytes(messageText(m.meta),200)}`:'',m.lead?clipBytes(messageText(m.lead),1500):'',m.body?clipBytes(m.body,1500):'',`[阅读全文](${m.url})`].filter(Boolean).join('\n\n');
 try{const r=await fetch(hook.href,{method:'POST',redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json'},body:JSON.stringify(wecomFallback||{msgtype:'markdown',markdown:{content:clipBytes(content,4000)}})});const d=await r.json() as {errcode?:number};
  if(r.ok&&d.errcode===0)return {state:'sent',error:''};
  if(d.errcode===-1||d.errcode===45009)return {state:'retry',error:'企业微信限流，稍后自动重试。'};
  return {state:'failed',error:`企业微信拒绝推送（${d.errcode??r.status}），请检查机器人配置。`};}
 catch{return {state:'uncertain',error:'发送未确认；为避免重复提醒，未自动重发。'};}
}
async function shareMessage(id:string,channel:PushChannel,origin:string){
 const s=await env.DB!.prepare('SELECT id,title,summary,original,content_kind AS contentKind,original_author AS originalAuthor,sharer,source,analysis,score,category FROM shares WHERE id=?').bind(id).first<{id:string;title:string;summary:string;original:string;contentKind:string;originalAuthor:string;sharer:string;source:string;analysis:string;score:number;category:string}>();
 if(!s)return null;
 const message:Message={title:s.title,lead:s.summary,body:s.analysis?`**定向分析${s.score>=0?` · 相关度 ${s.score}`:''}**\n${s.analysis}`:'',url:`${origin}/read/${encodeURIComponent(s.id)}`,meta:`${s.source==='subscription'?s.sharer:`${s.sharer} 分享`} · ${s.category}${s.originalAuthor?` · 原作者 ${s.originalAuthor}`:''}`};
 return {message,wecom:channel==='wecom'&&!s.analysis?buildWecomMessage(s,origin):undefined};
}
async function reportMessage(day:string,origin:string){
 const r=await env.DB!.prepare("SELECT day,title,lead,content,item_count FROM daily_reports WHERE day=? AND status='ready'").bind(day).first<{day:string;title:string;lead:string;content:string;item_count:number}>();
 if(!r)return null;const highlights=(r.content.split(/\n## /)[1]||'').split('\n').slice(1).join('\n').replace(/\]\(\/read\//g,`](${origin}/read/`).trim();
 return {message:{title:`📰 ${r.title}`,lead:r.lead,body:highlights,url:`${origin}/reports/${r.day}`,meta:`${r.day} · 共 ${r.item_count} 条资讯`} as Message};
}
function wants(t:PushTarget,kind:'share'|'report',source='share',score=-1){if(!t.enabled)return false;if(kind==='report')return t.reports;if(source==='subscription')return t.subscriptions&&(score<0||score>=t.minScore);return t.shares;}
// Enqueue everything that became ready after a channel was switched on, then send a few per run.
export async function deliverPushes(){
 const db=env.DB;if(!db)return;const c=await loadConfig();const now=Date.now();
 await db.prepare("UPDATE deliveries SET state='uncertain',error='发送中断，送达状态待确认；为避免重复提醒，未自动重发。' WHERE state='sending' AND next_at<?").bind(now).run();
 for(const channel of CHANNELS){const t=c.push[channel];if(!t.enabled||!t.since)continue;
  const ready=await db.prepare("SELECT id,source,score FROM shares WHERE status='ready' AND translated_at>=? AND id NOT IN(SELECT target_id FROM deliveries WHERE channel=? AND kind='share') ORDER BY translated_at LIMIT 20").bind(t.since,channel).all<{id:string;source:string;score:number}>();
  for(const s of ready.results)await db.prepare("INSERT OR IGNORE INTO deliveries(id,channel,kind,target_id,state,created_at) VALUES(?,?,'share',?,?,?)").bind(`${channel}:share:${s.id}`,channel,s.id,wants(t,'share',s.source,s.score)?'pending':'skipped',new Date().toISOString()).run();
  const reports=await db.prepare("SELECT day FROM daily_reports WHERE status='ready' AND updated_at>=? AND day NOT IN(SELECT target_id FROM deliveries WHERE channel=? AND kind='report')").bind(t.since,channel).all<{day:string}>();
  for(const r of reports.results)await db.prepare("INSERT OR IGNORE INTO deliveries(id,channel,kind,target_id,state,created_at) VALUES(?,?,'report',?,?,?)").bind(`${channel}:report:${r.day}`,channel,r.day,wants(t,'report')?'pending':'skipped',new Date().toISOString()).run();
 }
 const origin=await siteOrigin();
 const jobs=await db.prepare("SELECT id FROM deliveries WHERE state='pending' AND next_at<=? ORDER BY created_at LIMIT 5").bind(now).all<{id:string}>();
 for(const job of jobs.results){
  const lease=crypto.randomUUID();
  const d=await db.prepare("UPDATE deliveries SET state='sending',attempts=attempts+1,lease=?,next_at=? WHERE id=? AND state='pending' RETURNING id,channel,kind,target_id,attempts").bind(lease,Date.now()+120000,job.id).first<Delivery>();if(!d)continue;
  if(!c.push[d.channel].enabled){await db.prepare("UPDATE deliveries SET state='skipped',error='推送已关闭' WHERE id=?").bind(d.id).run();continue;}
  const built=d.kind==='share'?await shareMessage(d.target_id,d.channel,origin):await reportMessage(d.target_id,origin);
  const result=built?await send(d.channel,built.message,'wecom' in built?built.wecom as Record<string,unknown>|undefined:undefined):{state:'failed' as const,error:'内容已不存在。'};
  const state=result.state==='retry'?(d.attempts<3?'pending':'failed'):result.state;
  await db.prepare('UPDATE deliveries SET state=?,error=?,sent_at=?,next_at=? WHERE id=? AND lease=?').bind(state,result.error,state==='sent'?new Date().toISOString():'',Date.now()+d.attempts*60000,d.id,lease).run();
 }
}
export function applyPushSince(config:AppConfig,previous:AppConfig){for(const ch of CHANNELS){const was=previous.push[ch],now=config.push[ch];now.since=now.enabled?(was.enabled&&was.since?was.since:new Date().toISOString()):'';}return config;}
export async function sendTest(channel:PushChannel){const c=await loadConfig();const origin=await siteOrigin();return send(channel,{title:`${c.site.name} · 推送测试`,lead:'如果你看到这条消息，说明机器人配置正确。新资讯和日报会按后台设置推送到这里。',body:'',url:origin,meta:new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',dateStyle:'medium',timeStyle:'short'}).format(new Date())});}
export async function pushStats(){return (await env.DB!.prepare("SELECT channel,state,count(*) n FROM deliveries GROUP BY channel,state").all<{channel:string;state:string;n:number}>()).results;}
