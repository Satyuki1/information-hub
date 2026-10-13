"use client";
import {useEffect,useState} from 'react';
import {LifeBuoy,PlugZap,Copy,Check,Eye,EyeOff,RotateCcw,Trash2,LoaderCircle} from 'lucide-react';
import {requestJSON,type CurrentUser} from './session';
import RecoveryCodes from './recovery-codes';
import {dateLabel} from '../../lib/content';
export function RecoveryPanel({me}:{me:CurrentUser}){
 const[info,setInfo]=useState<{total:number;remaining:number;created_at:string}|null>(null),[codes,setCodes]=useState<string[]|null>(null),[asking,setAsking]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{requestJSON('/api/me/recovery-codes').then(setInfo).catch(()=>{});},[]);
 async function generate(e?:React.FormEvent<HTMLFormElement>){e?.preventDefault();setBusy(true);setError('');try{const d=await requestJSON('/api/me/recovery-codes',e?Object.fromEntries(new FormData(e.currentTarget)):{});setCodes(d.codes);setAsking(false);setInfo({total:20,remaining:20,created_at:new Date().toISOString()});}catch(err){setError((err as Error).message);}finally{setBusy(false);}}
 const needsPassword=me.loginType!=='link';
 return <section className="settings-section"><h2><LifeBuoy size={19}/>密码恢复码</h2><p>忘记密码时，在登录页用任意一个恢复码即可自己重置。每个只能用一次。</p>
  {info&&<div className="recovery-status"><strong>{info.total?`剩余 ${info.remaining??0} / ${info.total}`:'尚未生成'}</strong>{info.created_at&&<small>生成于 {dateLabel(info.created_at,true)}</small>}{!!info.total&&(info.remaining??0)<=5&&<span className="badge warn">即将用完</span>}</div>}
  {codes?<RecoveryCodes codes={codes} username={me.username}/>:asking&&needsPassword?<form className="inline-form" onSubmit={generate}><input name="currentPassword" type="password" required autoComplete="current-password" placeholder="输入当前密码以确认" aria-label="当前密码"/><button className="button primary" disabled={busy}>{busy?<LoaderCircle size={15} className="spin"/>:null}生成新的恢复码</button><button type="button" className="text-link" onClick={()=>setAsking(false)}>取消</button></form>:<button className="button secondary" onClick={()=>needsPassword?setAsking(true):generate()} disabled={busy}><RotateCcw size={15}/>{info?.total?'重新生成（旧的全部作废）':'生成 20 个恢复码'}</button>}
  {error&&<p className="form-error" role="alert">{error}</p>}
 </section>;
}
const CLIENTS=['Claude Code','Codex','Cursor 等'] as const;
export function McpPanel(){
 const[data,setData]=useState<{token:string|null;createdAt?:string;lastUsedAt?:string}|null>(null),[show,setShow]=useState(false),[client,setClient]=useState<typeof CLIENTS[number]>('Claude Code'),[copied,setCopied]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{requestJSON('/api/me/mcp').then(setData).catch(e=>setError(e.message));},[]);
 async function act(body:Record<string,unknown>){setBusy(true);setError('');try{setData(await requestJSON('/api/me/mcp',body));setShow(!body.revoke);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function copy(text:string,key:string){try{await navigator.clipboard.writeText(text);setCopied(key);setTimeout(()=>setCopied(''),2000);}catch{}}
 const endpoint=typeof location==='undefined'?'/mcp':`${location.origin}/mcp`;const token=data?.token||'';
 const snippet=!token?'':client==='Claude Code'?`claude mcp add --transport http information-hub ${endpoint} \\\n  --header "Authorization: Bearer ${token}"`:client==='Codex'?`# ~/.codex/config.toml\n[mcp_servers.information-hub]\nurl = "${endpoint}"\nbearer_token_env_var = "IHUB_MCP_TOKEN"\n\n# 终端中：\nexport IHUB_MCP_TOKEN=${token}`:JSON.stringify({mcpServers:{'information-hub':{url:endpoint,headers:{Authorization:`Bearer ${token}`}}}},null,2);
 const shown=show?snippet:snippet.replaceAll(token,token.slice(0,10)+'•'.repeat(12)+token.slice(-4));
 return <section className="settings-section mcp-panel"><h2><PlugZap size={19}/>AI 接入（MCP）</h2><p>在 Claude、Codex、Cursor 等 AI 助手里连接资讯库：搜索资讯、阅读全文、查看日报、提问，或让 AI 帮你收录链接。令牌代表你本人，请勿分享。</p>
  {!data?null:!token?<button className="button primary" disabled={busy} onClick={()=>act({})}><PlugZap size={15}/>生成 MCP 令牌</button>:<>
   <div className="mcp-endpoint"><span>服务地址</span><code>{endpoint}</code><button className="icon-button" onClick={()=>copy(endpoint,'endpoint')} aria-label="复制服务地址">{copied==='endpoint'?<Check size={15}/>:<Copy size={15}/>}</button></div>
   <div className="segmented mcp-tabs" role="tablist">{CLIENTS.map(c=><button key={c} role="tab" aria-selected={client===c} className={client===c?'active':''} onClick={()=>setClient(c)}>{c}</button>)}</div>
   <div className="code-block"><pre><code>{shown}</code></pre><div><button className="icon-button" onClick={()=>setShow(!show)} aria-label={show?'隐藏令牌':'显示令牌'}>{show?<EyeOff size={15}/>:<Eye size={15}/>}</button><button className="icon-button" onClick={()=>copy(snippet,'snippet')} aria-label="复制配置">{copied==='snippet'?<Check size={15}/>:<Copy size={15}/>}</button></div></div>
   <p className="token-meta">创建于 {dateLabel(data.createdAt||'',true)} · {data.lastUsedAt?`最近使用 ${dateLabel(data.lastUsedAt,true)}`:'尚未使用'} · 可用工具：search_articles、get_article、get_daily_report、ask、share_link 等</p>
   <div className="setting-actions"><button className="button secondary" disabled={busy} onClick={()=>act({})}><RotateCcw size={15}/>重新生成</button><button className="text-link danger-text" disabled={busy} onClick={()=>act({revoke:true})}><Trash2 size={14}/>撤销令牌</button></div>
  </>}
  {error&&<p className="form-error" role="alert">{error}</p>}
 </section>;
}
