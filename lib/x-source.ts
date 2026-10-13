import {env} from 'cloudflare:workers';
import {loadConfig,getSecret,consume,type AppConfig,type XMode} from './config';
import {composeXContent,contentFromTweet,fetchXContent,twitterApi,type Tweet,type XContent} from './x-content';
import {fetchXPreview,xPostUrl} from './x-preview';
import {safeImageUrl} from './content';
// One entry point for every X data channel: TwitterAPI.io, the official X API v2,
// or the public oEmbed preview that needs no credentials.
export type Channel={mode:XMode;key:string;config:AppConfig};
export const CHANNEL_LABELS:Record<XMode,string>={twitterapi_io:'TwitterAPI.io',x_official:'X 官方 API',public_preview:'仅公开预览'};
export async function channel(config?:AppConfig):Promise<Channel>{
 const c=config||await loadConfig();
 if(c.x.mode==='twitterapi_io'){const key=await getSecret('twitterapi');if(key)return {mode:'twitterapi_io',key,config:c};}
 if(c.x.mode==='x_official'){const key=await getSecret('xBearer');if(key)return {mode:'x_official',key,config:c};}
 return {mode:'public_preview',key:'',config:c};
}
export type Profile={id:string;name:string;handle:string;avatar:string};
const X_API='https://api.x.com/2';
const TWEET_FIELDS='tweet.fields=created_at,entities,attachments,note_tweet,referenced_tweets,in_reply_to_user_id,author_id&expansions=attachments.media_keys,author_id,referenced_tweets.id,referenced_tweets.id.author_id&media.fields=url,preview_image_url,type,alt_text&user.fields=name,username,profile_image_url';
type V2Tweet={id:string;text?:string;note_tweet?:{text?:string};created_at?:string;author_id?:string;in_reply_to_user_id?:string;entities?:{urls?:{url?:string;expanded_url?:string}[]};attachments?:{media_keys?:string[]};referenced_tweets?:{type:string;id:string}[]};
type V2Includes={media?:{media_key:string;type?:string;url?:string;preview_image_url?:string;alt_text?:string}[];users?:{id:string;name?:string;username?:string;profile_image_url?:string}[];tweets?:V2Tweet[]};
async function xApi(path:string,token:string,c:AppConfig){
 if(!await consume('xapi',c.site.xDailyLimit))throw new Error('今日 X 接口额度已用完。');
 const r=await fetch(X_API+path,{headers:{Authorization:'Bearer '+token},redirect:'manual',signal:AbortSignal.timeout(18000)});
 if(r.status===401||r.status===403)throw new Error('X 官方 API 令牌无效或权限不足。');
 if(r.status===429)throw new Error('X 官方 API 已限流，请稍后重试。');
 if(!r.ok)throw new Error(`X 官方 API 暂不可用（${r.status}）。`);
 const data=await r.json() as {data?:unknown;includes?:V2Includes;errors?:{detail?:string}[];meta?:Record<string,unknown>};
 if(!data.data&&data.errors?.length)throw new Error(data.errors[0].detail?.slice(0,120)||'X 官方 API 未返回内容。');
 return data;
}
// Map v2 objects onto the TwitterAPI.io tweet shape so Markdown composition stays identical.
export function fromV2(t:V2Tweet,includes:V2Includes={}):Tweet{
 const user=includes.users?.find(u=>u.id===t.author_id);
 const media=(t.attachments?.media_keys||[]).map(k=>includes.media?.find(m=>m.media_key===k)).filter(Boolean).map(m=>({type:m!.type==='photo'?'photo':'video',media_url_https:m!.url||m!.preview_image_url||'',ext_alt_text:m!.alt_text}));
 const quoted=t.referenced_tweets?.find(r=>r.type==='quoted');const quotedTweet=quoted&&includes.tweets?.find(x=>x.id===quoted.id);
 return {id:t.id,text:t.note_tweet?.text||t.text||'',author:{name:user?.name,userName:user?.username,profilePicture:user?.profile_image_url?.replace('_normal.','_400x400.'),id:t.author_id},createdAt:t.created_at,isReply:!!t.in_reply_to_user_id||!!t.referenced_tweets?.some(r=>r.type==='replied_to'),entities:{urls:(t.entities?.urls||[]).map(u=>({url:u.url,expanded_url:u.expanded_url}))},extendedEntities:{media},quoted_tweet:quotedTweet?fromV2(quotedTweet,includes):undefined,retweeted_tweet:t.referenced_tweets?.some(r=>r.type==='retweeted')?{id:t.referenced_tweets.find(r=>r.type==='retweeted')!.id}:undefined};
}
export type PostResult={content:XContent;mode:XMode}|{preview:{text:string;author:string};mode:'public_preview'};
export async function fetchPost(url:string,ch?:Channel):Promise<PostResult>{
 const c=ch||await channel();const id=xPostUrl(url)?.match(/\/status\/(\d+)/)?.[1];
 try{
  if(c.mode==='twitterapi_io')return {content:await fetchXContent(url,c.key,env.DB,c.config.site.xDailyLimit),mode:c.mode};
  if(c.mode==='x_official'&&id){const data=await xApi(`/tweets/${id}?${TWEET_FIELDS}`,c.key,c.config);return {content:composeXContent(fromV2(data.data as V2Tweet,data.includes)),mode:c.mode};}
 }catch(error){if(!c.config.x.fallbackPreview)throw error;}
 return {preview:await fetchXPreview(url),mode:'public_preview'};
}
export function normalizeHandle(value:string){const v=value.trim().replace(/^@/,'').replace(/^https?:\/\/(www\.|mobile\.)?(x|twitter)\.com\//i,'').split(/[/?#]/)[0];if(!/^[A-Za-z0-9_]{1,15}$/.test(v))throw new Error('请输入有效的 X 账号，例如 @OpenAI。');return v;}
export async function fetchProfile(handle:string,ch?:Channel):Promise<Profile>{
 const c=ch||await channel();
 if(c.mode==='twitterapi_io'){const data=await twitterApi('/twitter/user/info?userName='+encodeURIComponent(handle),c.key,env.DB,c.config.site.xDailyLimit);const u=data.data||{};if(!u.userName&&!u.id)throw new Error('没有找到这个 X 账号。');return {id:String(u.id||''),name:String(u.name||handle),handle:String(u.userName||handle),avatar:safeImageUrl(String(u.profilePicture||'').replace('_normal.','_400x400.'))};}
 if(c.mode==='x_official'){const data=await xApi(`/users/by/username/${encodeURIComponent(handle)}?user.fields=profile_image_url,name`,c.key,c.config);const u=data.data as {id:string;name?:string;username?:string;profile_image_url?:string};return {id:u.id,name:u.name||handle,handle:u.username||handle,avatar:safeImageUrl((u.profile_image_url||'').replace('_normal.','_400x400.'))};}
 throw new Error('订阅抓取需要 TwitterAPI.io 或 X 官方 API，请先在“抓取与模型”中配置。');
}
export type TimelineQuery={handle:string;userId:string;sinceId:string;includeReplies:boolean};
// Newest first. Callers filter by id; ids are compared as big integers.
export async function fetchTimeline(q:TimelineQuery,ch?:Channel):Promise<{tweets:Tweet[];userId:string}>{
 const c=ch||await channel();
 if(c.mode==='twitterapi_io'){const params=new URLSearchParams(q.userId?{userId:q.userId}:{userName:q.handle});if(q.includeReplies)params.set('includeReplies','true');const data=await twitterApi('/twitter/user/last_tweets?'+params,c.key,env.DB,c.config.site.xDailyLimit);const tweets=(data.tweets||data.data?.tweets||[]) as Tweet[];return {tweets,userId:q.userId||String(tweets[0]?.author?.id||'')};}
 if(c.mode==='x_official'){let userId=q.userId;if(!userId)userId=(await fetchProfile(q.handle,c)).id;const exclude=['retweets',...(q.includeReplies?[]:['replies'])].join(',');const data=await xApi(`/users/${userId}/tweets?max_results=10&exclude=${exclude}${q.sinceId?'&since_id='+q.sinceId:''}&${TWEET_FIELDS}`,c.key,c.config);return {tweets:((data.data||[]) as V2Tweet[]).map(t=>fromV2(t,data.includes)),userId};}
 throw new Error('订阅抓取需要 TwitterAPI.io 或 X 官方 API，请先在“抓取与模型”中配置。');
}
export async function tweetContent(tweet:Tweet,c:Channel):Promise<XContent>{
 if(c.mode==='twitterapi_io')try{return await contentFromTweet(tweet,c.key,env.DB,c.config.site.xDailyLimit);}catch{}
 return composeXContent(tweet);
}
export function newer(a:string,b:string){try{return BigInt(a)>BigInt(b||'0');}catch{return false;}}
