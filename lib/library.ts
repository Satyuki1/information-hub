import {env} from 'cloudflare:workers';
import {body,HttpError,json,type SessionUser} from './auth';
import {TOPICS,inferTopic} from './content';
export type Column={id:string;name:string};
export type SourceGroup=Column&{subscriptions:string[]};
export type Library={topics:Column[];groups:SourceGroup[];revision:string};
const KEY='library_organization';
const defaults=()=>({topics:TOPICS.map((name,i)=>({id:`topic-${i}`,name})),groups:[] as SourceGroup[],revision:'initial'});
export async function loadLibrary():Promise<Library>{const row=await env.DB!.prepare('SELECT value FROM settings WHERE key=?').bind(KEY).first<{value:string}>();return row?JSON.parse(row.value):defaults();}
export async function topicNames(){return (await loadLibrary()).topics.map(t=>t.name);}
export function classify(text:string,topics:string[]){const inferred=inferTopic(text);return topics.includes(inferred)?inferred:topics[0];}
function columns(value:unknown,groups=false):Column[]{
 if(!Array.isArray(value)||value.length>(groups?40:20)||(!groups&&!value.length))throw new HttpError(400,'请保留 1–20 个主题，分组最多 40 个。');
 const out=value.map(v=>{if(!v||typeof v!=='object'||typeof v.id!=='string'||!/^[-\w]{1,80}$/.test(v.id)||typeof v.name!=='string'||!v.name.trim()||v.name.trim().length>24||/[\u0000-\u001f]/.test(v.name)||(!groups&&v.name.trim()==='全部资讯'))throw new HttpError(400,'名称需为 1–24 个字符。');return {id:v.id,name:v.name.trim()};});
 if(new Set(out.map(v=>v.id)).size!==out.length||new Set(out.map(v=>v.name)).size!==out.length)throw new HttpError(400,'名称和标识不能重复。');
 return out;
}
export async function libraryRoute(req:Request,me:SessionUser){
 const previous=await loadLibrary();if(req.method==='GET')return json(previous);
 if(me.role!=='admin')throw new HttpError(403,'只有管理员可以修改栏目和分组。');
 if(req.method!=='PUT')throw new HttpError(405,'不支持此方法。');
 const input=await body(req,32000);if(input.revision!==previous.revision)throw new HttpError(409,'设置已被更新，请刷新后重新编辑。');
 const topics=columns(input.topics),groupColumns=columns(input.groups,true);
 // A single CASE remaps names atomically, including swaps and deleted topics.
 const mappings=previous.topics.map(old=>[old.name,topics.find(t=>t.id===old.id)?.name||topics[0].name]);
 const ids=new Set((await env.DB!.prepare('SELECT id FROM subscriptions').all<{id:string}>()).results.map(s=>s.id));
 const groups=groupColumns.map((g,i)=>{const values=(input.groups as SourceGroup[])[i].subscriptions;if(!Array.isArray(values)||values.length>500||values.some(id=>typeof id!=='string'||!ids.has(id)))throw new HttpError(400,'分组包含不存在的订阅，请刷新。');return {...g,subscriptions:[...new Set(values)]};});
 const next={topics,groups,revision:crypto.randomUUID()};
 // Compare-and-swap protects concurrent editors; category updates use the same revision guard.
 await env.DB!.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)').bind(KEY,JSON.stringify(previous)).run();
 const before=JSON.stringify(previous),after=JSON.stringify(next);
 const result=await env.DB!.batch([
  env.DB!.prepare(`UPDATE shares SET category=CASE category ${mappings.map(()=> 'WHEN ? THEN ?').join(' ')} ELSE category END WHERE (SELECT value FROM settings WHERE key=?)=?`).bind(...mappings.flat(),KEY,before),
  env.DB!.prepare('UPDATE settings SET value=? WHERE key=? AND value=?').bind(after,KEY,before),
 ]);
 if(!result[1].meta.changes)throw new HttpError(409,'设置已被更新，请刷新后重新编辑。');
 return json(next);
}
