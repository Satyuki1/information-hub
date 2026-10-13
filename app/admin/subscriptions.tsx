"use client";
import {useCallback,useEffect,useState} from 'react';
import {Plus,RefreshCw,Pencil,Trash2,ExternalLink,LoaderCircle} from 'lucide-react';
import {requestJSON} from '../components/session';
import {Avatar,Dialog,Switch} from '../components/ui';
import {timeAgo} from '../../lib/content';
type Sub={id:string;handle:string;name:string;avatar:string;enabled:number;include_replies:number;include_retweets:number;focus:string;last_checked_at:string;last_error:string;item_count:number;recent:number;created_at:string};
export default function Subscriptions({openSettings}:{openSettings:()=>void}){
 const[data,setData]=useState<{subscriptions:Sub[];channel:string;pollMinutes:number}|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(''),[edit,setEdit]=useState<Sub|'new'|null>(null),[flags,setFlags]=useState({replies:false,retweets:false});
 const refresh=useCallback(()=>requestJSON('/api/admin/subscriptions').then(setData).catch(e=>setError(e.message)),[]);useEffect(()=>{refresh();},[refresh]);
 async function run(key:string,fn:()=>Promise<unknown>,ok?:string){setBusy(key);setError('');setMessage('');try{const r=await fn();if(ok)setMessage(ok);await refresh();return r??true;}catch(e){setError((e as Error).message);return false;}finally{setBusy('');}}
 function open(s:Sub|'new'){setEdit(s);setFlags(s==='new'?{replies:false,retweets:false}:{replies:!!s.include_replies,retweets:!!s.include_retweets});}
 async function save(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const input=Object.fromEntries(new FormData(e.currentTarget));const body={focus:input.focus,includeReplies:flags.replies,includeRetweets:flags.retweets};
  const ok=edit==='new'?await run('save',()=>requestJSON('/api/admin/subscriptions',{...body,handle:input.handle}),'已添加，一分钟内完成首次抓取。'):edit&&await run('save',()=>requestJSON('/api/admin/subscriptions/'+edit.id,body,'PATCH'),'已保存。');if(ok)setEdit(null);}
 async function check(s:Sub){const r=await run(s.id,()=>requestJSON(`/api/admin/subscriptions/${s.id}/check`,{})) as {ok?:boolean;added?:number;error?:string}|false;if(r&&typeof r==='object')r.ok?setMessage(r.added?`@${s.handle}：抓取到 ${r.added} 条新动态。`:`@${s.handle}：没有新动态。`):setError(r.error||'抓取失败');}
 const preview=data?.channel==='public_preview';
 return <div className="admin-pane">
  <div className="toolbar"><p>{data?`${data.subscriptions.length} 个账号 · 每 ${data.pollMinutes} 分钟检查一次`:' '}</p><button className="btn btn-primary btn-sm" disabled={preview} onClick={()=>open('new')}><Plus size={15}/>添加订阅</button></div>
  {preview&&<p className="alert warn">当前抓取渠道是“仅公开预览”，无法读取账号时间线。请先在 <button className="link" onClick={openSettings}>抓取与模型</button> 中配置 TwitterAPI.io 或 X 官方 API。</p>}
  {error&&<p className="alert error" role="alert">{error}</p>}{message&&<p className="alert ok" role="status">{message}</p>}
  <div className="table-wrap"><table className="table responsive"><thead><tr><th>账号</th><th>关注点</th><th className="num">累计</th><th className="num">近 7 天</th><th>上次检查</th><th>启用</th><th aria-label="操作"/></tr></thead>
   <tbody>{(data?.subscriptions||[]).map(s=><tr key={s.id} className={s.enabled?'':'muted-row'}>
    <td data-label="账号"><span className="cell-user"><Avatar name={s.name||s.handle} src={s.avatar} size={36}/><span><strong>{s.name||s.handle}</strong><a className="sub link-quiet" href={`https://x.com/${s.handle}`} target="_blank" rel="noopener noreferrer">@{s.handle}<ExternalLink size={11}/></a>{s.last_error&&<small className="bad">{s.last_error}</small>}</span></span></td>
    <td data-label="关注点" className="cell-wrap"><span className="cell-stack">{s.focus||<span className="muted">—</span>}{(!!s.include_replies||!!s.include_retweets)&&<small className="sub">{[s.include_replies?'含回复':'',s.include_retweets?'含转帖':''].filter(Boolean).join(' · ')}</small>}</span></td>
    <td data-label="累计" className="num">{s.item_count}</td>
    <td data-label="近 7 天" className="num">{s.recent}</td>
    <td data-label="上次检查">{s.last_checked_at?timeAgo(s.last_checked_at):<span className="muted">未检查</span>}</td>
    <td data-label="启用"><Switch checked={!!s.enabled} label={`${s.enabled?'暂停':'启用'} @${s.handle}`} disabled={!!busy} onChange={v=>run(s.id,()=>requestJSON('/api/admin/subscriptions/'+s.id,{enabled:v},'PATCH'))}/></td>
    <td className="cell-actions"><span className="icon-row"><button className="icon-btn" title="立即检查" aria-label={`立即检查 @${s.handle}`} disabled={!!busy||preview} onClick={()=>check(s)}><RefreshCw size={16} className={busy===s.id?'spin':''}/></button><button className="icon-btn" title="编辑" aria-label={`编辑 @${s.handle}`} onClick={()=>open(s)}><Pencil size={16}/></button><button className="icon-btn" title="删除" aria-label={`删除 @${s.handle}`} disabled={!!busy} onClick={()=>{if(confirm(`删除对 @${s.handle} 的订阅？已收录的资讯会保留。`))run(s.id,()=>requestJSON('/api/admin/subscriptions/'+s.id,{},'DELETE'),'已删除。');}}><Trash2 size={16}/></button></span></td>
   </tr>)}</tbody></table>{!data?<p className="table-empty">正在读取…</p>:!data.subscriptions.length&&<p className="table-empty">还没有订阅。添加想持续关注的 X 账号，例如行业媒体、公司官方号或关键人物。</p>}</div>
  <Dialog open={!!edit} onClose={()=>setEdit(null)} title={edit==='new'?'添加订阅':`编辑 @${edit?.handle||''}`} footer={<><button className="btn btn-ghost" onClick={()=>setEdit(null)}>取消</button><button className="btn btn-primary" form="sub-form" disabled={busy==='save'}>{busy==='save'&&<LoaderCircle size={15} className="spin"/>}{edit==='new'?'添加':'保存'}</button></>}>
   {edit&&<form id="sub-form" className="stack-form" onSubmit={save} key={edit==='new'?'new':edit.id}>
    {edit==='new'&&<label className="field"><span>X 账号</span><input name="handle" required className="input" placeholder="@OpenAI 或 https://x.com/OpenAI" autoCapitalize="none" spellCheck={false}/></label>}
    <label className="field"><span>关注点（选填）</span><textarea name="focus" rows={3} maxLength={1000} className="textarea" defaultValue={edit==='new'?'':edit.focus} placeholder="例如：新模型发布、API 价格变化"/><small>会叠加到全局的定向分析方向。</small></label>
    <div className="check-list"><label><Switch checked={flags.replies} label="包含回复" onChange={v=>setFlags(f=>({...f,replies:v}))}/>包含回复</label><label><Switch checked={flags.retweets} label="包含转帖" onChange={v=>setFlags(f=>({...f,retweets:v}))}/>包含转帖</label></div>
   </form>}
  </Dialog>
 </div>;
}
