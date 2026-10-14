import {env} from 'cloudflare:workers';
import {HttpError,type SessionUser} from './auth';
import {loadLibrary} from './library';
// Explicit readable fields: no credentials, operation leases, or other members' favorites.
const FIELDS='s.id,s.title,s.url,s.original,s.translation,s.summary,s.tags,s.category,s.category_source,s.cover_url,s.original_author,s.content_kind,s.source_meta,s.note,s.sharer,s.source,s.subscription_id,s.analysis,s.score,s.status,s.collected_at,s.processing_started_at,s.translated_at,s.notified_at,s.shared_at,s.updated_at';
function markdown(r:Record<string,unknown>){return `# ${r.title}\n\n> ${r.category} · ${r.sharer} · ${r.shared_at}\n\n来源：${r.url||'文字收录'}\n\n收录：${r.collected_at||r.shared_at}  \n翻译：${r.translated_at||'尚未完成'}  \n收藏：${r.favorite?'是':'否'}\n\n## 摘要\n\n${r.summary||'暂无摘要'}\n\n## 原文\n\n${r.original||'尚未取得原文'}\n\n## 中文译文\n\n${r.translation||'尚未翻译'}\n\n${r.analysis?'## 分析\n\n'+r.analysis+'\n\n':''}${r.note?'## 分享备注\n\n'+r.note+'\n\n':''}---\n\n`;}
export async function exportLibrary(req:Request,me:SessionUser){
 if(req.method!=='GET')throw new HttpError(405,'请使用 GET。');
 const p=new URL(req.url).searchParams,format=p.get('format')||'json',scope=p.get('scope')||'all';
 if(!['json','md'].includes(format)||!['all','favorites','mine'].includes(scope))throw new HttpError(400,'导出格式或范围无效。');
 const from=p.get('from')||'',to=p.get('to')||'';
 const valid=(d:string)=>!d||/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d))&&new Date(d).toISOString().startsWith(d);
 if(!valid(from)||!valid(to)||from&&to&&from>to)throw new HttpError(400,'日期范围无效。');
 const db=env.DB!,max=(await db.prepare('SELECT max(rowid) n FROM shares').first<{n:number}>())?.n||0;
 const clauses=['s.rowid>?','s.rowid<=?'],params:unknown[]=[];
 if(scope==='favorites'){clauses.push('EXISTS(SELECT 1 FROM user_favorites WHERE user_id=? AND share_id=s.id)');params.push(me.id);}
 if(scope==='mine'){clauses.push('s.sharer_id=?');params.push(me.id);}
 if(from){clauses.push('s.shared_at>=?');params.push(new Date(from+'T00:00:00+08:00').toISOString());}
 if(to){clauses.push('s.shared_at<?');params.push(new Date(Date.parse(to+'T00:00:00+08:00')+86400000).toISOString());}
 const organization=await loadLibrary(),exportedAt=new Date().toISOString();
 // An async iterator keeps memory bounded and stops fetching when the download is cancelled.
 async function* chunks(){
  yield format==='json'?JSON.stringify({version:1,exportedAt,scope,images:'URLs in Markdown; image binaries are not included',organization}).slice(0,-1)+',"articles":[':`# X to Group · 内容导出\n\n导出于 ${exportedAt}。范围：${scope}。图片保留原始链接。\n\n`;
  let cursor=0,first=true;
  while(true){const rows=(await db.prepare(`SELECT s.rowid cursor,${FIELDS},EXISTS(SELECT 1 FROM user_favorites WHERE user_id=? AND share_id=s.id) favorite FROM shares s WHERE ${clauses.join(' AND ')} ORDER BY s.rowid LIMIT 100`).bind(me.id,cursor,max,...params).all<Record<string,unknown>>()).results;if(!rows.length)break;
   for(const row of rows){cursor=Number(row.cursor);const {cursor:_,...record}=row;yield format==='json'?(first?'':',')+JSON.stringify(record):markdown(record);first=false;}
  }
  yield format==='json'?'],"reports":[':'\n# 每日日报\n\n';
  // Personal subsets contain only articles; reports and source configuration belong to a full export.
  let last='',firstReport=true;
  if(scope==='all')while(true){const rows=(await db.prepare("SELECT day,title,lead,content,status,created_at,updated_at FROM daily_reports WHERE day>? AND (?='' OR day>=?) AND (?='' OR day<=?) ORDER BY day LIMIT 100").bind(last,from,from,to,to).all<Record<string,unknown>>()).results;if(!rows.length)break;for(const r of rows){last=String(r.day);yield format==='json'?(firstReport?'':',')+JSON.stringify(r):`## ${r.day} · ${r.title}\n\n${r.lead}\n\n${r.content}\n\n`;firstReport=false;}}
  yield format==='json'?'],"sources":[':'\n# 订阅信源\n\n';
  let sourceCursor='',firstSource=true;
  if(scope==='all')while(true){const rows=(await db.prepare('SELECT id,handle,name,enabled,include_replies,include_retweets FROM subscriptions WHERE id>? ORDER BY id LIMIT 100').bind(sourceCursor).all<Record<string,unknown>>()).results;if(!rows.length)break;for(const r of rows){sourceCursor=String(r.id);yield format==='json'?(firstSource?'':',')+JSON.stringify(r):`- ${r.name} (@${r.handle})\n`;firstSource=false;}}
  if(format==='json')yield ']}';
 }
 const iterator=chunks(),encoder=new TextEncoder();
 return new Response(new ReadableStream({async pull(controller){try{const next=await iterator.next();if(next.done)controller.close();else controller.enqueue(encoder.encode(next.value));}catch(e){controller.error(e);}},async cancel(){await iterator.return(undefined);}}),{headers:{'Content-Type':format==='json'?'application/json; charset=utf-8':'text/markdown; charset=utf-8','Content-Disposition':`attachment; filename="x-to-group-${scope}-${exportedAt.slice(0,10)}.${format}"`,'Cache-Control':'private, no-store'}});
}
