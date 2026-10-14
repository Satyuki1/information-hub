"use client";
import {useEffect,useState} from 'react';
import {Copy,Check,Eye,EyeOff,LoaderCircle} from 'lucide-react';
import {requestJSON,type CurrentUser} from './session';
import RecoveryCodes from './recovery-codes';
import {Section} from './ui';
import {dateLabel} from '../../lib/content';
export function RecoveryPanel({me}:{me:CurrentUser}){
 const[info,setInfo]=useState<{total:number;remaining:number;created_at:string}|null>(null),[codes,setCodes]=useState<string[]|null>(null),[asking,setAsking]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{requestJSON('/api/me/recovery-codes').then(setInfo).catch(()=>{});},[]);
 async function generate(e?:React.FormEvent<HTMLFormElement>){e?.preventDefault();setBusy(true);setError('');try{const d=await requestJSON('/api/me/recovery-codes',e?Object.fromEntries(new FormData(e.currentTarget)):{});setCodes(d.codes);setAsking(false);setInfo({total:20,remaining:20,created_at:new Date().toISOString()});}catch(err){setError((err as Error).message);}finally{setBusy(false);}}
 const needsPassword=me.loginType!=='link';const status=info?.total?`剩余 ${info.remaining??0} / ${info.total} 个 · 生成于 ${dateLabel(info.created_at,true)}`:'尚未生成';
 return <Section title="密码恢复码" desc={<>忘记密码时，在登录页用任意一个恢复码自己重置，每个只能用一次。<br/>{status}</>} actions={!codes&&!asking?<button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>needsPassword?setAsking(true):generate()}>{info?.total?'重新生成':'生成'}</button>:undefined}>
  {codes&&<RecoveryCodes codes={codes} username={me.username}/>}
  {asking&&<form className="inline-form" onSubmit={generate}><input name="currentPassword" type="password" required autoComplete="current-password" placeholder="输入当前密码确认" aria-label="当前密码" className="input"/><button className="btn btn-primary btn-sm" disabled={busy}>{busy&&<LoaderCircle size={14} className="spin"/>}生成 20 个新恢复码</button><button type="button" className="btn btn-ghost btn-sm" onClick={()=>setAsking(false)}>取消</button></form>}
  {asking&&!!info?.total&&<p className="fine">重新生成后，旧的恢复码全部作废。</p>}
  {error&&<p className="alert error" role="alert">{error}</p>}
 </Section>;
}
const CLIENTS=['Claude Code','Codex','Cursor'] as const;
export function McpPanel(){
 const[data,setData]=useState<{token:string|null;createdAt?:string;lastUsedAt?:string}|null>(null),[show,setShow]=useState(false),[client,setClient]=useState<typeof CLIENTS[number]>('Claude Code'),[copied,setCopied]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{requestJSON('/api/me/mcp').then(setData).catch(e=>setError(e.message));},[]);
 async function act(body:Record<string,unknown>){setBusy(true);setError('');try{setData(await requestJSON('/api/me/mcp',body));setShow(!body.revoke);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function copy(text:string,key:string){try{await navigator.clipboard.writeText(text);setCopied(key);setTimeout(()=>setCopied(''),2000);}catch{}}
 const endpoint=typeof location==='undefined'?'/mcp':`${location.origin}/mcp`;const token=data?.token||'';
 const snippet=!token?'':client==='Claude Code'?`claude mcp add --transport http x-to-group ${endpoint} \\\n  --header "Authorization: Bearer ${token}"`:client==='Codex'?`# ~/.codex/config.toml\n[mcp_servers.x-to-group]\nurl = "${endpoint}"\nbearer_token_env_var = "IHUB_MCP_TOKEN"\n\n# 终端中\nexport IHUB_MCP_TOKEN=${token}`:JSON.stringify({mcpServers:{'x-to-group':{url:endpoint,headers:{Authorization:`Bearer ${token}`}}}},null,2);
 const shown=show?snippet:snippet.replaceAll(token,token.slice(0,10)+'••••••••'+token.slice(-4));
 return <Section title="AI 接入（MCP）" desc="在 Claude Code、Codex、Cursor 等 AI 助手里搜索资讯、阅读全文、查看日报和收录链接。令牌代表你本人。" actions={data&&!token?<button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>act({})}>生成令牌</button>:undefined}>
  {token&&<div className="mcp">
   <div className="kv"><span>服务地址</span><code>{endpoint}</code><button className="icon-btn" onClick={()=>copy(endpoint,'endpoint')} aria-label="复制服务地址">{copied==='endpoint'?<Check size={16}/>:<Copy size={16}/>}</button></div>
   <div className="segmented" role="tablist">{CLIENTS.map(c=><button key={c} role="tab" aria-selected={client===c} className={client===c?'on':''} onClick={()=>setClient(c)}>{c}</button>)}</div>
   <div className="code"><div className="code-bar"><span>{client==='Claude Code'?'终端':client==='Codex'?'config.toml':'mcp.json'}</span><button className="icon-btn" onClick={()=>setShow(!show)} aria-label={show?'隐藏令牌':'显示令牌'}>{show?<EyeOff size={15}/>:<Eye size={15}/>}</button><button className="icon-btn" onClick={()=>copy(snippet,'snippet')} aria-label="复制">{copied==='snippet'?<Check size={15}/>:<Copy size={15}/>}</button></div><pre><code>{shown}</code></pre></div>
   <div className="row-actions spread"><small className="fine">创建于 {dateLabel(data?.createdAt||'',true)} · {data?.lastUsedAt?`最近使用 ${dateLabel(data.lastUsedAt,true)}`:'尚未使用'}</small><span><button className="btn btn-ghost btn-sm" disabled={busy} onClick={()=>act({})}>重新生成</button><button className="btn btn-ghost btn-sm danger" disabled={busy} onClick={()=>act({revoke:true})}>撤销</button></span></div>
  </div>}
  {error&&<p className="alert error" role="alert">{error}</p>}
 </Section>;
}
