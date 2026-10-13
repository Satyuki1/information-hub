"use client";
import {useCallback,useEffect,useState} from 'react';
import {Plus,RefreshCw,Trash2,Radio,Check,AlertTriangle,Target,ExternalLink} from 'lucide-react';
import {requestJSON} from '../components/session';
import {Photo} from '../components/media';
import {UserAvatar} from '../components/x-shell';
import {dateLabel,timeAgo} from '../../lib/content';
import {Card,Field,Switch} from './ui';
type Sub={id:string;handle:string;name:string;avatar:string;enabled:number;include_replies:number;include_retweets:number;focus:string;last_checked_at:string;last_error:string;item_count:number;recent:number;created_at:string};
export default function Subscriptions({openSettings}:{openSettings:()=>void}){
 const[data,setData]=useState<{subscriptions:Sub[];channel:string;pollMinutes:number}|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(''),[editing,setEditing]=useState('');
 const refresh=useCallback(()=>requestJSON('/api/admin/subscriptions').then(setData).catch(e=>setError(e.message)),[]);useEffect(()=>{refresh();},[refresh]);
 async function run(key:string,fn:()=>Promise<unknown>,ok?:string){setBusy(key);setError('');setMessage('');try{const r=await fn();if(ok)setMessage(ok);await refresh();return r;}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 const preview=data?.channel==='public_preview';
 return <div className="admin-subs">
  {error&&<p className="form-error" role="alert">{error}</p>}{message&&<p className="success-note" role="status"><Check size={16}/>{message}</p>}
  {preview&&<div className="notice warn-notice"><AlertTriangle size={18}/><div><strong>订阅抓取需要 API 渠道</strong><p>当前使用“仅公开预览”，无法读取账号时间线。请在「抓取与模型」中配置 TwitterAPI.io 或 X 官方 API。</p><button className="button secondary" onClick={openSettings}>去配置</button></div></div>}
  <Card title="订阅 X 账号" icon={<Radio size={19}/>} desc={data?`每 ${data.pollMinutes} 分钟检查一次新帖，自动翻译；开启定向分析后还会给出相关度和要点。`:''}>
   <form className="admin-form" onSubmit={async e=>{e.preventDefault();const f=e.currentTarget;const input=Object.fromEntries(new FormData(f));await run('add',()=>requestJSON('/api/admin/subscriptions',{handle:input.handle,focus:input.focus,includeReplies:input.includeReplies==='on',includeRetweets:input.includeRetweets==='on'}),'订阅已添加，首次抓取会在一分钟内完成。');f.reset();}}>
    <div className="field-grid"><Field label="X 账号" hint="填写 @用户名 或主页链接"><input name="handle" required placeholder="@OpenAI 或 https://x.com/OpenAI" autoCapitalize="none" spellCheck={false}/></Field><Field label="这个账号的关注点（选填）" hint="会叠加到全局的定向分析方向"><input name="focus" maxLength={1000} placeholder="例如：新模型发布、API 价格变化"/></Field></div>
    <div className="check-row"><label className="check"><input type="checkbox" name="includeReplies"/>包含回复</label><label className="check"><input type="checkbox" name="includeRetweets"/>包含转帖</label><button className="button primary" disabled={!!busy||preview}><Plus size={16}/>添加订阅</button></div>
   </form>
  </Card>
  {!data?<div className="admin-loading">正在读取订阅…</div>:!data.subscriptions.length?<div className="empty-state compact"><h2>还没有订阅</h2><p>添加你想持续关注的 X 账号，例如行业媒体、公司官方号或关键人物。</p></div>:
  <div className="sub-grid">{data.subscriptions.map(s=><article key={s.id} className={`sub-card ${s.enabled?'':'paused'}`}>
   <header><span className="sub-avatar">{s.avatar?<Photo src={s.avatar} alt=""/>:<UserAvatar name={s.name||s.handle} size={44}/>}</span><div><strong>{s.name||s.handle}</strong><a href={`https://x.com/${s.handle}`} target="_blank" rel="noopener noreferrer">@{s.handle}<ExternalLink size={11}/></a></div><Switch checked={!!s.enabled} label={`${s.enabled?'暂停':'恢复'}订阅 @${s.handle}`} disabled={!!busy} onChange={v=>run(s.id,()=>requestJSON('/api/admin/subscriptions/'+s.id,{enabled:v},'PATCH'))}/></header>
   <div className="sub-stats"><span><strong>{s.item_count}</strong>累计收录</span><span><strong>{s.recent}</strong>近 7 天</span><span><strong>{s.last_checked_at?timeAgo(s.last_checked_at):'—'}</strong>上次检查</span></div>
   {s.last_error&&<p className="sub-error"><AlertTriangle size={14}/>{s.last_error}</p>}
   {editing===s.id?<form className="inline-form" onSubmit={async e=>{e.preventDefault();await run(s.id,()=>requestJSON('/api/admin/subscriptions/'+s.id,{focus:new FormData(e.currentTarget).get('focus')},'PATCH'),'关注点已更新。');setEditing('');}}><input name="focus" defaultValue={s.focus} maxLength={1000} placeholder="这个账号的关注点" autoFocus/><button className="button secondary">保存</button></form>:<button className="sub-focus" onClick={()=>setEditing(s.id)}><Target size={14}/>{s.focus||'添加关注点'}</button>}
   <footer><small>{s.include_replies?'含回复':'不含回复'} · {s.include_retweets?'含转帖':'不含转帖'} · 添加于 {dateLabel(s.created_at)}</small><div><button className="icon-button" title="立即检查" aria-label={`立即检查 @${s.handle}`} disabled={!!busy||preview} onClick={async()=>{const r=await run(s.id,()=>requestJSON(`/api/admin/subscriptions/${s.id}/check`,{})) as {ok?:boolean;added?:number;error?:string}|undefined;if(r)r.ok?setMessage(r.added?`抓取到 ${r.added} 条新动态，正在翻译整理。`:'没有新动态。'):setError(r.error||'抓取失败');}}><RefreshCw size={16} className={busy===s.id?'spin':''}/></button><button className="icon-button danger-text" title="删除订阅" aria-label={`删除订阅 @${s.handle}`} disabled={!!busy} onClick={()=>{if(confirm(`删除对 @${s.handle} 的订阅？已收录的资讯会保留。`))run(s.id,()=>requestJSON('/api/admin/subscriptions/'+s.id,{},'DELETE'),'订阅已删除。');}}><Trash2 size={16}/></button></div></footer>
  </article>)}</div>}
 </div>;
}
