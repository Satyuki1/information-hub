"use client";
import {useEffect,useState} from 'react';
import {SHORTCUT_PATH,SHORTCUT_VERSION} from '../../lib/brand';
import {Copy,Eye,EyeOff,Download,Check,RotateCcw} from 'lucide-react';
import AppFrame from '../components/app-frame';
import {requestJSON} from '../components/session';
import {PageHeader,Section} from '../components/ui';
import {dateLabel} from '../../lib/content';
import ShortcutTutorial from '../components/iphone-tutorial';
type Token={token:string;createdAt:string;lastUsedAt:string;name:string};
const FILE=SHORTCUT_PATH;
export default function Page(){
 const[data,setData]=useState<Token|null>(null),[show,setShow]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false),[copied,setCopied]=useState(false);
 useEffect(()=>{requestJSON('/api/me/shortcut').then(setData).catch(e=>setError(e.message));},[]);
 useEffect(()=>{if(!message)return;const t=setTimeout(()=>setMessage(''),3500);return()=>clearTimeout(t);},[message]);
 const connection=data&&typeof location!=='undefined'?`${location.origin}/api/collect?token=${data.token}`:'';
 async function copy(){if(!data)return false;try{await navigator.clipboard.writeText(connection);setCopied(true);setMessage('个人连接地址已复制。安装时请粘贴，不要留空。');return true;}catch{setShow(true);setMessage('无法自动复制，请长按地址手动复制');return false;}}
 function install(){location.href=FILE;}
 async function reset(){setBusy(true);setError('');try{setData(await requestJSON('/api/me/shortcut/reset',{}));setConfirm(false);setShow(true);setMessage('已重置，旧地址立即失效。请在快捷指令里换成新地址。');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const masked=data?connection.replace(data.token,data.token.slice(0,9)+'••••••••'+data.token.slice(-4)):'';
 return <AppFrame active="shortcut">
  <PageHeader title="快捷指令" sub="在 iPhone 的 X 里点分享，一步收录" back="/"/>
  {error&&<p className="alert error" role="alert">{error}</p>}
  <div className="shortcut-hero"><span className="personal-badge">{data?.name||'我的'} · 专属快捷指令</span><h1>从 X 分享，整个 Group 一起读。</h1><p>先复制个人地址，再下载；安装时粘贴到“个人连接地址”。这里填本站地址，不是 X 帖子链接。</p></div>
  {typeof location!=='undefined'&&['localhost','127.0.0.1'].includes(location.hostname)&&<p className="alert warn">当前是本机地址，iPhone 无法访问电脑上的 localhost。请部署到 Cloudflare 或带 HTTPS 域名的服务器后，在正式站点重新登录并安装个人快捷指令。</p>}
  <Section title="1. 复制连接地址并安装" desc={`连接地址包含 ${data?.name||'你'} 的个人口令，用它分享的内容会记在你的名下。请在 iPhone 的 Safari 中打开本页。`}>
   {data&&<div className="kv"><code>{show?connection:masked}</code><button className="icon-btn" onClick={()=>setShow(!show)} aria-label={show?'隐藏':'显示'}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button><button className="icon-btn" onClick={copy} aria-label="复制"><Copy size={16}/></button></div>}
   <div className="row-actions"><button className="btn btn-primary" disabled={!data} onClick={copy}>{copied?<Check size={16}/>:<Copy size={16}/>}1. {copied?'地址已复制':'复制个人连接地址'}</button><button className="btn btn-secondary" disabled={!data} onClick={install}><Download size={16}/>2. 下载并安装新版</button></div><p className="fine">版本 {SHORTCUT_VERSION} · 安装时不要跳过地址填写。新版会检查地址，漏填时提示补填。</p>
   {data&&<p className="fine">创建于 {dateLabel(data.createdAt,true)} · {data.lastUsedAt?`最近使用 ${dateLabel(data.lastUsedAt,true)}`:'尚未使用'}</p>}
  </Section>
  <Section title="2. 添加时粘贴一次" desc="如果出现“设置此快捷指令”，粘贴刚复制的完整个人地址再添加。如果未出现设置问题，打开快捷指令 App，点这条指令右上角的“…”编辑，在第二个“文本”（个人连接地址）里粘贴。之后在 X 中点 分享 → 分享到 X to Group。">
   <ShortcutTutorial name={data?.name} compact/>
  </Section>
  <Section title="遇到“未指定 URL”？" desc="这是快捷指令的连接地址未填好，不是 X 抓取或 API 余额问题。"><ol className="repair-steps"><li>点击上面的“复制个人连接地址”。</li><li>打开苹果“快捷指令”App，找到“分享到资讯汇集”或“分享到 X to Group”，点“…”进入编辑。</li><li>把完整地址粘贴到第二个“文本”中；第一个“文本”保留“快捷指令输入”。返回保存后，再从 X 分享。</li></ol><p className="fine">也可下载安装新版。旧指令不会因网站更新而自动替换，请在分享菜单中选择新安装的那条。运行时临时补填不会永久保存，需要保存到第二个“文本”。</p></Section>
  <Section title="安全" desc="地址泄露时可以重置，旧地址会立即失效，需要在快捷指令里换成新地址。">
   {confirm?<div className="row-actions"><button className="btn btn-danger btn-sm" disabled={busy} onClick={reset}><RotateCcw size={14}/>确认重置</button><button className="btn btn-ghost btn-sm" onClick={()=>setConfirm(false)}>取消</button></div>:<div className="row-actions"><button className="btn btn-secondary btn-sm" onClick={()=>setConfirm(true)}>重置口令</button><a className="link" href={FILE}>只下载安装文件</a><a className="link" href="/docs/zh/shortcut">完整教程</a></div>}
  </Section>
  {message&&<div className="toast" role="status"><Check size={16}/>{message}</div>}
 </AppFrame>;
}
