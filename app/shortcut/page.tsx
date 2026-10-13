"use client";
import {useEffect,useState} from 'react';
import {Smartphone,Copy,Eye,EyeOff,Download,Check,RotateCcw,ShieldCheck,ArrowUpRight,KeyRound} from 'lucide-react';
import AppFrame from '../components/app-frame';
import {requestJSON} from '../components/session';
import {dateLabel} from '../../lib/content';
import ShortcutTutorial,{Phone,ShareSheetScreen} from '../components/iphone-tutorial';
type Token={token:string;createdAt:string;lastUsedAt:string;name:string};
const FILE='/shortcuts/分享到资讯汇集.shortcut';
export default function Page(){
 const[data,setData]=useState<Token|null>(null),[show,setShow]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);
 useEffect(()=>{requestJSON('/api/me/shortcut').then(setData).catch(e=>setError(e.message));},[]);
 useEffect(()=>{if(!message)return;const t=setTimeout(()=>setMessage(''),4000);return()=>clearTimeout(t);},[message]);
 const connection=data&&typeof location!=='undefined'?`${location.origin}/api/collect?token=${data.token}`:'';
 async function copy(){if(!data)return false;try{await navigator.clipboard.writeText(connection);setMessage('连接地址已复制');return true;}catch{setShow(true);setMessage('无法自动复制，请长按连接地址手动复制');return false;}}
 async function install(){await copy();setTimeout(()=>{location.href=FILE;},350);}
 async function reset(){setBusy(true);setError('');try{setData(await requestJSON('/api/me/shortcut/reset',{}));setConfirm(false);setShow(true);setMessage('口令已重置，旧口令立即失效。请在快捷指令里换成新口令。');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const masked=data?connection.replace(data.token,data.token.slice(0,9)+'•'.repeat(14)+data.token.slice(-4)):'';
 return <AppFrame active="shortcut" aside={<section className="x-panel shortcut-faq"><h2>常见问题</h2><details open><summary>为什么要粘贴连接地址？</summary><p>iPhone 只允许安装经过 Apple 签名的快捷指令，服务器无法为每个人单独签名。所以大家安装同一份快捷指令，添加时粘贴自己的连接地址（含站点和口令），系统就知道分享来自谁。</p></details><details><summary>连接地址泄露了怎么办？</summary><p>在本页点击“重置口令”，旧地址立即失效。再把新地址填进快捷指令即可。</p></details><details><summary>在电脑上怎么收录？</summary><p>直接在首页输入框粘贴 X 链接，或使用 <a className="text-link" href="/collect">公开收录页</a>。</p></details></section>}>
  <header className="detail-header page-header"><h1><Smartphone size={21}/>我的快捷指令</h1></header>
  <section className="page-hero shortcut-hero"><div className="hero-phone-small" aria-hidden="true"><Phone><ShareSheetScreen/></Phone></div><div><span className="eyebrow">iPhone · 开箱即用</span><h2>在 X 里点分享，一步收录。</h2><p>{data?`这是 ${data.name} 的专属快捷指令。收录的内容会自动翻译整理，并显示为你的分享。`:'正在准备你的专属口令…'}</p><button className="button primary big" disabled={!data} onClick={install}><Download size={18}/>复制连接地址并安装快捷指令</button><small className="hero-note">请在 iPhone 的 Safari 中打开本页。添加快捷指令时，在输入框里粘贴刚复制的连接地址。</small></div></section>
  {error&&<p className="form-error" role="alert">{error}</p>}
  <div className="settings-content">
   <section className="settings-section"><h2><KeyRound size={19}/>我的连接地址</h2><p>地址里包含只代表你本人的口令，请勿分享给他人。</p>{data&&<><div className="token-box"><code>{show?data.token:masked}</code><button className="icon-button" onClick={()=>setShow(!show)} aria-label={show?'隐藏口令':'显示口令'}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button><button className="button secondary" onClick={copy}><Copy size={15}/>复制</button></div><p className="token-meta">创建于 {dateLabel(data.createdAt,true)} · {data.lastUsedAt?`最近使用 ${dateLabel(data.lastUsedAt,true)}`:'尚未使用'}</p></>}</section>
   <section className="settings-section tutorial-section"><h2>图文教程</h2><p>左右滑动查看每一步，安装后在 X 中点分享即可收录。</p><ShortcutTutorial name={data?.name} compact/><a className="text-link" href="/?view=mine">查看我分享的资讯 →</a></section>
   <section className="settings-section danger-zone"><h2><ShieldCheck size={19}/>安全</h2><p>重置后，所有使用旧口令的快捷指令都会停止工作，需要重新粘贴新口令。</p>{confirm?<div className="setting-actions"><button className="button danger" disabled={busy} onClick={reset}><RotateCcw size={15}/>确认重置</button><button className="text-link" onClick={()=>setConfirm(false)}>取消</button></div>:<button className="button secondary" onClick={()=>setConfirm(true)}><RotateCcw size={15}/>重置口令</button>}<a className="text-link block-link" href={FILE}>只下载快捷指令文件<ArrowUpRight size={13}/></a></section>
  </div>
  {message&&<div className="toast" role="status"><Check size={16}/>{message}</div>}
 </AppFrame>;
}
