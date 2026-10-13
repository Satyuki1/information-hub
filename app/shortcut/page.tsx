"use client";
import {useEffect,useState} from 'react';
import {Copy,Eye,EyeOff,Download,Check,RotateCcw} from 'lucide-react';
import AppFrame from '../components/app-frame';
import {requestJSON} from '../components/session';
import {PageHeader,Section} from '../components/ui';
import {dateLabel} from '../../lib/content';
import ShortcutTutorial from '../components/iphone-tutorial';
type Token={token:string;createdAt:string;lastUsedAt:string;name:string};
const FILE='/shortcuts/分享到资讯汇集.shortcut';
export default function Page(){
 const[data,setData]=useState<Token|null>(null),[show,setShow]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);
 useEffect(()=>{requestJSON('/api/me/shortcut').then(setData).catch(e=>setError(e.message));},[]);
 useEffect(()=>{if(!message)return;const t=setTimeout(()=>setMessage(''),3500);return()=>clearTimeout(t);},[message]);
 const connection=data&&typeof location!=='undefined'?`${location.origin}/api/collect?token=${data.token}`:'';
 async function copy(){if(!data)return false;try{await navigator.clipboard.writeText(connection);setMessage('连接地址已复制');return true;}catch{setShow(true);setMessage('无法自动复制，请长按地址手动复制');return false;}}
 async function install(){await copy();setTimeout(()=>{location.href=FILE;},300);}
 async function reset(){setBusy(true);setError('');try{setData(await requestJSON('/api/me/shortcut/reset',{}));setConfirm(false);setShow(true);setMessage('已重置，旧地址立即失效。请在快捷指令里换成新地址。');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const masked=data?connection.replace(data.token,data.token.slice(0,9)+'••••••••'+data.token.slice(-4)):'';
 return <AppFrame active="shortcut">
  <PageHeader title="快捷指令" sub="在 iPhone 的 X 里点分享，一步收录" back="/account"/>
  {error&&<p className="alert error" role="alert">{error}</p>}
  <Section title="1. 复制连接地址并安装" desc={`连接地址包含 ${data?.name||'你'} 的个人口令，用它分享的内容会记在你的名下。请在 iPhone 的 Safari 中打开本页。`}>
   {data&&<div className="kv"><code>{show?connection:masked}</code><button className="icon-btn" onClick={()=>setShow(!show)} aria-label={show?'隐藏':'显示'}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button><button className="icon-btn" onClick={copy} aria-label="复制"><Copy size={16}/></button></div>}
   <div className="row-actions"><button className="btn btn-primary" disabled={!data} onClick={install}><Download size={16}/>复制并安装快捷指令</button></div>
   {data&&<p className="fine">创建于 {dateLabel(data.createdAt,true)} · {data.lastUsedAt?`最近使用 ${dateLabel(data.lastUsedAt,true)}`:'尚未使用'}</p>}
  </Section>
  <Section title="2. 添加时粘贴一次" desc="iPhone 会弹出“设置此快捷指令”，在输入框粘贴刚才复制的地址，点“添加快捷指令”。之后在 X 中点 分享 → 分享到资讯汇集。">
   <ShortcutTutorial name={data?.name} compact/>
  </Section>
  <Section title="安全" desc="地址泄露时可以重置，旧地址会立即失效，需要在快捷指令里换成新地址。">
   {confirm?<div className="row-actions"><button className="btn btn-danger btn-sm" disabled={busy} onClick={reset}><RotateCcw size={14}/>确认重置</button><button className="btn btn-ghost btn-sm" onClick={()=>setConfirm(false)}>取消</button></div>:<div className="row-actions"><button className="btn btn-secondary btn-sm" onClick={()=>setConfirm(true)}>重置口令</button><a className="link" href={FILE}>只下载安装文件</a><a className="link" href="/guide">完整教程</a></div>}
  </Section>
  {message&&<div className="toast" role="status"><Check size={16}/>{message}</div>}
 </AppFrame>;
}
