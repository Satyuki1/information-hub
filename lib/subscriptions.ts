import {env} from 'cloudflare:workers';
import {HttpError,body,json,auditEvent,type SessionUser} from './auth';
import {loadConfig} from './config';
import {channel,fetchProfile,fetchTimeline,tweetContent,normalizeHandle,newer,type Channel} from './x-source';
import {createShare} from './shares';
import {getDb} from '../db';
import {shares} from '../db/schema';
import {eq} from 'drizzle-orm';
import type {Tweet} from './x-content';
type Subscription={id:string;handle:string;name:string;avatar:string;x_user_id:string;enabled:number;include_replies:number;include_retweets:number;focus:string;last_tweet_id:string;last_checked_at:string;next_check_at:number;last_error:string;item_count:number;created_at:string};
export async function subscriptionRoute(request:Request,me:SessionUser){
 const db=env.DB!;const path=new URL(request.url).pathname;const id=path.match(/^\/api\/admin\/subscriptions\/([\w-]+)/)?.[1];
 if(path==='/api/admin/subscriptions'&&request.method==='GET'){
  const rows=(await db.prepare('SELECT s.*,(SELECT count(*) FROM shares WHERE subscription_id=s.id AND shared_at>=?) recent FROM subscriptions s ORDER BY s.created_at DESC').bind(new Date(Date.now()-7*86400000).toISOString()).all()).results;
  const c=await channel();return json({subscriptions:rows,channel:c.mode,pollMinutes:c.config.x.pollMinutes});
 }
 if(path==='/api/admin/subscriptions'&&request.method==='POST'){
  const input=await body(request,8192);let handle:string;try{handle=normalizeHandle(String(input.handle||''));}catch(e){throw new HttpError(400,(e as Error).message);}
  if(await db.prepare('SELECT id FROM subscriptions WHERE handle=?').bind(handle.toLowerCase()).first())throw new HttpError(409,'已经订阅了这个账号。');
  let profile;try{profile=await fetchProfile(handle);}catch(e){throw new HttpError(400,(e as Error).message);}
  const sid=crypto.randomUUID();
  await db.prepare('INSERT INTO subscriptions(id,handle,name,avatar,x_user_id,include_replies,include_retweets,focus,created_at,created_by) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(sid,profile.handle.toLowerCase(),profile.name.slice(0,80),profile.avatar,profile.id,input.includeReplies?1:0,input.includeRetweets?1:0,String(input.focus||'').trim().slice(0,1000),new Date().toISOString(),me.id).run();
  await auditEvent(me.id,'subscription.created',sid);return json({ok:true,id:sid},201);
 }
 if(!id)throw new HttpError(404,'接口不存在。');
 const sub=await db.prepare('SELECT * FROM subscriptions WHERE id=?').bind(id).first<Subscription>();if(!sub)throw new HttpError(404,'订阅不存在。');
 if(request.method==='DELETE'){await db.prepare('DELETE FROM subscriptions WHERE id=?').bind(id).run();await auditEvent(me.id,'subscription.deleted',id);return json({ok:true});}
 if(request.method==='PATCH'){
  const input=await body(request,8192);const sets:string[]=[],values:unknown[]=[];
  if(typeof input.enabled==='boolean'){sets.push('enabled=?','next_check_at=0');values.push(input.enabled?1:0);}
  if(typeof input.includeReplies==='boolean'){sets.push('include_replies=?');values.push(input.includeReplies?1:0);}
  if(typeof input.includeRetweets==='boolean'){sets.push('include_retweets=?');values.push(input.includeRetweets?1:0);}
  if(typeof input.focus==='string'){sets.push('focus=?');values.push(input.focus.trim().slice(0,1000));}
  if(!sets.length)throw new HttpError(400,'没有可更新的内容。');
  await db.prepare(`UPDATE subscriptions SET ${sets.join(',')} WHERE id=?`).bind(...values,id).run();await auditEvent(me.id,'subscription.updated',id);return json({ok:true});
 }
 if(path.endsWith('/check')&&request.method==='POST'){const result=await pollOne(sub,await channel());return json(result);}
 throw new HttpError(404,'接口不存在。');
}
function isRetweet(t:Tweet){return !!t.retweeted_tweet||/^RT @\w+:/.test(t.text||'');}
async function pollOne(sub:Subscription,c:Channel){
 const db=env.DB!;const now=new Date().toISOString();
 try{
  const {tweets,userId}=await fetchTimeline({handle:sub.handle,userId:sub.x_user_id,sinceId:sub.last_tweet_id,includeReplies:!!sub.include_replies},c);
  const sorted=[...tweets].filter(t=>t?.id).sort((a,b)=>newer(a.id,b.id)?-1:1);
  const newest=sorted[0]?.id||sub.last_tweet_id;
  let fresh=sorted.filter(t=>newer(t.id,sub.last_tweet_id)).filter(t=>sub.include_replies||!t.isReply).filter(t=>sub.include_retweets||!isRetweet(t));
  // The first check only imports the latest few posts so a new subscription does not flood the feed.
  if(!sub.last_tweet_id)fresh=fresh.slice(0,c.config.x.initialCount);
  let added=0;
  for(const tweet of fresh.reverse()){
   const target=isRetweet(tweet)&&tweet.retweeted_tweet?.text?tweet.retweeted_tweet:tweet;const handle=target.author?.userName||sub.handle;
   const url=`https://x.com/${handle}/status/${target.id}`;
   const content=await tweetContent(target,c);
   const saved=await createShare({url,original:content.text},{sharer:`订阅 · @${sub.handle}`,sharerId:'',source:'subscription',subscriptionId:sub.id});
   if(!saved.duplicate){await getDb().update(shares).set({contentKind:content.kind,originalAuthor:content.author,sourceMeta:content.sourceMeta,coverUrl:content.cover,title:(content.text.split('\n').find(Boolean)||'订阅动态').replace(/^#+\s*/,'').slice(0,55)}).where(eq(shares.id,saved.item.id));added++;}
  }
  await db.prepare("UPDATE subscriptions SET last_tweet_id=?,x_user_id=CASE WHEN x_user_id='' THEN ? ELSE x_user_id END,last_checked_at=?,last_error='',item_count=item_count+? WHERE id=?").bind(newest,userId||'',now,added,sub.id).run();
  return {ok:true,added};
 }catch(e){
  const message=(e instanceof Error?e.message:'抓取失败').slice(0,200);
  await db.prepare('UPDATE subscriptions SET last_checked_at=?,last_error=? WHERE id=?').bind(now,message,sub.id).run();
  return {ok:false,added:0,error:message};
 }
}
// Called every minute by the scheduler; each subscription is leased so overlapping runs never double-fetch.
export async function pollSubscriptions(max=2){
 const db=env.DB;if(!db)return;const config=await loadConfig();const c=await channel(config);if(c.mode==='public_preview')return;
 const due=await db.prepare('SELECT * FROM subscriptions WHERE enabled=1 AND next_check_at<=? ORDER BY next_check_at LIMIT ?').bind(Date.now(),max).all<Subscription>();
 for(const sub of due.results){
  const claimed=await db.prepare('UPDATE subscriptions SET next_check_at=? WHERE id=? AND next_check_at=? RETURNING id').bind(Date.now()+config.x.pollMinutes*60000,sub.id,sub.next_check_at).first();
  if(claimed)await pollOne(sub,c);
 }
}
// Read-only list for every signed-in member: drives the avatar strip on the subscriptions feed.
export async function memberSubscriptions(){
 const rows=(await env.DB!.prepare("SELECT s.id,s.handle,s.name,s.avatar,s.enabled,(SELECT count(*) FROM shares WHERE subscription_id=s.id AND status='ready') items,(SELECT max(shared_at) FROM shares WHERE subscription_id=s.id) latest FROM subscriptions s ORDER BY latest IS NULL, latest DESC, s.created_at").all()).results;
 return json({subscriptions:rows});
}
