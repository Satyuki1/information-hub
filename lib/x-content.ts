import { safeImageUrl } from './content';
import { xPostUrl } from './x-preview';

type Media = { type?: string; media_url_https?: string; ext_alt_text?: string };
type Link = { url?: string; expanded_url?: string };
export type Tweet = { id: string; text?: string; url?: string; author?: { name?: string; userName?: string; profilePicture?: string }; createdAt?: string; entities?: { urls?: Link[] }; extendedEntities?: { media?: Media[] }; quoted_tweet?: Tweet; retweeted_tweet?: Tweet };
type Block = { type?: string; text?: string; url?: string; previewUrl?: string; inlineStyleRanges?: {offset:number;length:number;style:string}[] };
export type XArticle = { title?: string; author?: {name?:string;userName?:string}; cover_media_img_url?: string; contents?: Block[] };
export type XContent = { text: string; author: string; cover: string; kind: 'x_post'|'x_article'; sourceMeta: string };
const authorOf=(x:{author?:{name?:string;userName?:string}})=>x.author?.name||x.author?.userName||'X';
const alt=(s:string)=>s.replace(/[\[\]\\\r\n]/g,' ').slice(0,160);
export function tweetMarkdown(tweet:Tweet) {
 let text=tweet.text||'';
 for(const link of tweet.entities?.urls||[]) if(link.url&&link.expanded_url&&/^https?:\/\//.test(link.expanded_url)) text=text.split(link.url).join(link.expanded_url);
 for(const m of tweet.extendedEntities?.media||[]){const url=safeImageUrl(m.media_url_https||'');if(url)text+=`\n\n![${alt(m.ext_alt_text|| (m.type==='photo'?'原帖配图':'视频封面（未转写视频内容）'))}](${url})`;}
 return text.trim();
}
export function articleMarkdown(article:XArticle){
 if(!Array.isArray(article.contents)||!article.contents.some(b=>b.text?.trim()))throw new Error('长文章正文暂未返回。');
 return article.contents.map(b=>{
  const text=b.text||'';
  if(b.type==='image'){const url=safeImageUrl(b.url||b.previewUrl||'');return url?`![${alt(text||'原文插图')}](${url})`:'';}
  if(b.type==='divider')return '---';
  if(b.type==='header-one')return `## ${text}`;
  if(b.type==='header-two')return `### ${text}`;
  if(b.type==='header-three')return `#### ${text}`;
  if(b.type==='unordered-list-item')return `- ${text}`;
  if(b.type==='ordered-list-item')return `1. ${text}`;
  if(b.type==='blockquote')return text.split('\n').map(s=>'> '+s).join('\n');
  return text;
 }).filter(Boolean).join('\n\n');
}
export function articleTweet(tweet:Tweet):Tweet|undefined {
 const candidates=[tweet,tweet.quoted_tweet,tweet.retweeted_tweet].filter(Boolean) as Tweet[];
 return candidates.find(t=>(t.entities?.urls||[]).some(l=>{try{const u=new URL(l.expanded_url||'');return ['x.com','twitter.com','www.x.com'].includes(u.hostname)&&/^\/i\/article\/\d+/.test(u.pathname);}catch{return false;}}));
}
export function composeXContent(tweet:Tweet,article?:XArticle):XContent {
 const target=articleTweet(tweet);
 let text=tweetMarkdown(tweet);let cover=safeImageUrl(tweet.extendedEntities?.media?.[0]?.media_url_https||'');let author=authorOf(tweet);
 if(article&&target){
  const prefix=target.id===tweet.id?'':`## 分享帖\n\n${text}\n\n---\n\n`;
  text=prefix+`# ${article.title||'引用长文章'}\n\n原作者：${authorOf(article)}\n\n[查看文章来源](https://x.com/i/status/${target.id})\n\n`+articleMarkdown(article);
  cover=safeImageUrl(article.cover_media_img_url||'')||cover;author=authorOf(article);
 }else if(tweet.quoted_tweet&&tweetMarkdown(tweet.quoted_tweet))text+=`\n\n---\n\n## 引用帖子 · ${authorOf(tweet.quoted_tweet)}\n\n${tweetMarkdown(tweet.quoted_tweet)}`;
 if(!text.trim())throw new Error('帖子未返回可阅读的正文。');
 if(text.length>60000)throw new Error('文章过长，请分段收录。');
 return {text,author,cover,kind:article&&target?'x_article':'x_post',sourceMeta:JSON.stringify({name:authorOf(tweet),handle:tweet.author?.userName||'',avatar:safeImageUrl(tweet.author?.profilePicture||''),publishedAt:tweet.createdAt||'',text:tweet.text||''})};
}
export async function fetchXContent(value:string,key:string,db?:D1Database):Promise<XContent>{
 const canonical=xPostUrl(value);const id=canonical?.match(/\/status\/(\d+)/)?.[1];if(!id)throw new Error('请使用包含 /status/ 的帖子链接。');
 async function request(path:string){
  if(db){
   const day=new Date(Date.now()+8*3600000).toISOString().slice(0,10);
   const budget=await db.prepare('INSERT INTO usage_windows (key,count) VALUES (?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<300 RETURNING count').bind('xapi:'+day).first();
   if(!budget)throw new Error('今日图文获取额度已用完。');
   let claimed=false;
   for(let n=0;n<4;n++){
    const now=Date.now();
    const slot=await db.prepare('INSERT INTO usage_windows (key,count) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET count=excluded.count WHERE count<? RETURNING count').bind('xapi:slot',now,now-5500).first();
    if(slot){claimed=true;break;}await new Promise(r=>setTimeout(r,5600));
   }
   if(!claimed)throw new Error('图文获取繁忙，请稍后重试。');
  }
  const r=await fetch('https://api.twitterapi.io'+path,{headers:{'X-API-Key':key},redirect:'manual',signal:AbortSignal.timeout(18000)});
  if(!r.ok)throw new Error(`图文服务暂不可用（${r.status}）。`);
  const raw=await r.text();if(raw.length>3000000)throw new Error('图文响应过大。');
  const data=JSON.parse(raw);if(data.status!=='success')throw new Error('这条内容暂时无法通过图文接口获取。');return data;
 }
 const result=await request('/twitter/tweets?tweet_ids='+id);const tweet=(result.tweets as Tweet[]|undefined)?.find(t=>t.id===id);if(!tweet)throw new Error('没有找到这条公开帖子。');
 const target=articleTweet(tweet);
 if(target){const result=await request('/twitter/article?tweet_id='+target.id);if(!result.article)throw new Error('长文章正文暂不可用。');return composeXContent(tweet,result.article);}
 return composeXContent(tweet);
}
