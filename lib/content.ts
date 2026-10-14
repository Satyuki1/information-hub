import type { shares } from "../db/schema";
export type Article = typeof shares.$inferSelect;
export const TOPICS = ["新资讯", "人工智能", "科技数码", "商业财经", "产品设计", "行业观察"] as const;
export type Topic = typeof TOPICS[number];
export function isTopic(value: unknown): value is Topic { return typeof value === "string" && (TOPICS as readonly string[]).includes(value); }
export function inferTopic(text: string): Topic {
  const rules: [Topic, RegExp][] = [
    ["人工智能", /\b(ai|llm|gpt|grok|claude|codex|openai|cursor|deepseek|agent)\b|人工智能|大模型|大语言模型|智能体|提示词/i],
    ["商业财经", /\b(finance|economy|investment|stock)\b|财经|金融|商业|经济|投资|融资|股票|养老|社保|保险/i],
    ["产品设计", /\b(design|figma|ux|ui)\b|产品设计|用户体验|交互设计|设计系统/i],
    ["科技数码", /\b(apple|iphone|android|software|hardware)\b|科技|数码|芯片|软件|硬件|编程|开源|开发者/i],
    ["行业观察", /\b(industry|research|policy)\b|行业|政策|趋势|产业|市场研究|研究报告/i],
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0] || "新资讯";
}
export function topicOf(item: Pick<Article,"category"|"categorySource"|"title"|"tags">): string {
  return item.category || inferTopic(`${item.title} ${item.tags}`);
}
export function tagsOf(item: Pick<Article,"tags">): string[] { try { const tags=JSON.parse(item.tags); return Array.isArray(tags)?tags.filter(t=>typeof t==="string"):[]; } catch { return []; } }
export function safeImageUrl(value: string): string {
  if (/^\/media\/[a-zA-Z0-9/_\-.]+$/.test(value)) return value;
  try { const u=new URL(value); if(u.protocol!=="https:" || u.username || u.password || u.hostname.includes(":") || !u.hostname.includes(".") || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname) || u.hostname.endsWith(".local") || u.hostname.endsWith(".internal")) return ""; return u.toString(); } catch { return ""; }
}
export function firstImage(text: string) { const match=text.match(/!\[[^\]]*\]\(\s*(https:\/\/[^\s)]+|\/media\/[^\s)]+)(?:\s+"[^"]*")?\s*\)/); return match?safeImageUrl(match[1]):""; }
export function coverOf(item: Pick<Article,"coverUrl"|"original">) { return safeImageUrl(item.coverUrl)||firstImage(item.original); }
export function dayOf(value: string|Date) { return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value)); }
export function dateLabel(value:string, time=false) { if(!value)return "尚未记录"; return new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",month:"long",day:"numeric",...(time?{hour:"2-digit",minute:"2-digit"}: {})}).format(new Date(value)); }
export function sourceOf(item:Pick<Article,"url">) { try{return new URL(item.url).hostname.replace(/^www\./,"");}catch{return "文字分享";} }
export const STATUS:Record<string,string>={ready:"已整理",pending:"等待整理",processing:"正在翻译",needs_content:"待补充正文",failed:"整理未完成"};
export function timelineOf(item: Article) {
  return [
    {title:"资讯收录",time:item.collectedAt||item.sharedAt,detail:item.source==="subscription"?`${item.sharer.replace(/^订阅 · /,"订阅 ")} 自动抓取`:item.collectedAt?`${item.sharer} 分享至 X to Group`:"历史分享时间",state:"done"},
    {title:"中文整理",time:item.translatedAt,detail:item.status==="ready"?(item.translatedAt?"摘要与译文已生成":"已完成 · 历史记录未保存完成时间"):item.error||STATUS[item.status]||"等待处理",state:item.status==="ready"?"done":item.status==="failed"?"error":"waiting"},
    {title:"历史企业微信推送",time:item.notifiedAt,detail:item.notifyStatus==="sent"?"已发送至机器人群":item.notifyStatus==="skipped"?"历史资讯补全，不重复群发":item.notifyError||(item.notifyStatus==="pending"||item.notifyStatus==="sending"?"推送已停用":"推送已停用"),state:item.notifyStatus==="sent"?"done":["failed","uncertain"].includes(item.notifyStatus)?"error":"waiting"}
  ];
}

export function imageSrc(value:string){const safe=safeImageUrl(value);if(!safe)return "";try{const u=new URL(safe);if(u.hostname==="pbs.twimg.com")return "/api/media?url="+encodeURIComponent(safe);}catch{}return safe;}
export function imagesOf(item:Pick<Article,"original"|"coverUrl">){const urls=[safeImageUrl(item.coverUrl),...Array.from(item.original.matchAll(/!\[[^\]]*\]\(\s*(https:\/\/[^\s)]+|\/media\/[^\s)]+)(?:\s+"[^"]*")?\s*\)/g),m=>safeImageUrl(m[1]))];return [...new Set(urls.filter(Boolean))];}

export function authorOf(item:Pick<Article,'sourceMeta'|'url'|'originalAuthor'|'sharer'>){
 let meta:Record<string,unknown>={};try{const parsed=JSON.parse(item.sourceMeta||'{}');if(parsed&&typeof parsed==='object')meta=parsed;}catch{}
 let handle='';try{const u=new URL(item.url);if(/^(www\.)?(x|twitter)\.com$/.test(u.hostname)&&!['i','intent'].includes(u.pathname.split('/')[1]))handle=u.pathname.split('/')[1];}catch{}
 return {name:typeof meta.name==='string'&&meta.name?meta.name:item.originalAuthor||item.sharer,handle:typeof meta.handle==='string'&&meta.handle?meta.handle:handle,avatar:typeof meta.avatar==='string'?safeImageUrl(meta.avatar):'',publishedAt:typeof meta.publishedAt==='string'&&!Number.isNaN(Date.parse(meta.publishedAt))?meta.publishedAt:'',text:typeof meta.text==='string'?meta.text:''};
}
export function feedText(text:string){return text.replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/https:\/\/t\.co\/\w+/g,'').replace(/https:\/\/(?:x|twitter)\.com\/i\/article\/\d+/g,'').replace(/^#{1,6}\s+/gm,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/\n{3,}/g,'\n\n').trim();}
export function timeAgo(value:string,now=Date.now()){if(!value)return '';const diff=now-new Date(value).getTime();if(diff<60000)return '刚刚';if(diff<3600000)return `${Math.floor(diff/60000)} 分钟前`;if(diff<86400000)return `${Math.floor(diff/3600000)} 小时前`;if(diff<172800000)return '昨天';return dateLabel(value);}
export function sourceLabel(item:Pick<Article,'source'|'sharer'>){return item.source==='subscription'?item.sharer.replace(/^订阅 · /,''):`${item.sharer} 分享`;}
export function hotOf(items:Article[],limit=10,now=Date.now()){return [...items].filter(i=>i.status==='ready').map(i=>({item:i,rank:(i.score>=0?i.score:50)+(i.favorite?15:0)-Math.min(60,(now-new Date(i.sharedAt).getTime())/3600000)})).sort((a,b)=>b.rank-a.rank).slice(0,limit).map(x=>x.item);}
export function dayParts(day:string){const d=new Date(day+'T12:00:00+08:00');return {month:new Intl.DateTimeFormat('zh-CN',{month:'short',timeZone:'Asia/Shanghai'}).format(d),date:day.slice(8),week:new Intl.DateTimeFormat('zh-CN',{weekday:'short',timeZone:'Asia/Shanghai'}).format(d)};}
