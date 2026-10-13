export const PUBLIC_ORIGIN = "https://zeng-daily-shares.tangcheng475899188.workers.dev";
export type MessageShare = { id:string; title:string; summary:string; original:string; contentKind:string; originalAuthor:string; sharer:string };
export function clipBytes(value:string, max:number) {
  if(new TextEncoder().encode(value).length<=max) return value;
  let result="", length=0;
  for(const char of value) { const size=new TextEncoder().encode(char).length; if(length+size>max-3) break; result+=char; length+=size; }
  return result+"…";
}
// Source text must not create mentions, links, or formatting in a group message.
export function messageText(value:string) {
  return value.replace(/[\r\n]+/g," ").replace(/[<>\[\]*`#\\]/g,c=>({"<":"＜",">":"＞","[":"［","]":"］","*":"＊","`":"｀","#":"＃","\\":"＼"}[c]!));
}
export function buildWecomMessage(item:MessageShare) {
  const excerpt=item.contentKind==="x_preview";
  const content=[
    `## ${clipBytes(messageText(item.title),240)}`,
    `> ${clipBytes(messageText(item.sharer),90)} 分享 · 资讯汇集`,
    `**中文摘要**\n${clipBytes(messageText(item.summary),1500)}`,
    `**原文摘录${item.originalAuthor?` · ${clipBytes(messageText(item.originalAuthor),120)}`:""}**\n> ${clipBytes(messageText(item.original),800)}`,
    excerpt?"仅基于 X 公开预览，可能不含完整长文、线程、图片或视频。":"阅读页保留收到的原文，并提供中文译文。",
    `[阅读全文 · 原文与中文译文](${PUBLIC_ORIGIN}/read/${encodeURIComponent(item.id)})`
  ].join("\n\n");
  return {msgtype:"markdown",markdown:{content}};
}
