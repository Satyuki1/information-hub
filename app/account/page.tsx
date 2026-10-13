"use client";
import {useState} from 'react';
import {KeyRound,LogOut,ShieldCheck,Smartphone,UserRound,Newspaper,Palette,Link2,ArrowRight} from 'lucide-react';
import AppFrame from '../components/app-frame';
import {ShortcutCard,StylePicker,UserAvatar} from '../components/x-shell';
import {useSession,useReadingStyle,requestJSON} from '../components/session';
import FeishuPanel from '../components/feishu-panel';
import {RecoveryPanel,McpPanel} from '../components/account-panels';
export default function Page(){const me=useSession();const[style,setStyle]=useReadingStyle(me);const[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function password(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');setMessage('');const f=e.currentTarget;const input=Object.fromEntries(new FormData(f));if(input.password!==input.confirmPassword){setError('两次输入的新密码不一致。');setBusy(false);return;}try{await requestJSON('/api/auth/password',input);if(me?.mustChange){location.href='/account';return;}setMessage('密码已更新，其他设备已退出登录。');f.reset();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const role=me?.owner?'超级管理员':me?.role==='admin'?'管理员':'阅读成员';
 return <AppFrame active="account" aside={<ShortcutCard/>}><header className="detail-header page-header"><h1><UserRound size={21}/>我的账号</h1></header><div className="settings-content">
  <section className="profile-card"><UserAvatar name={me?.name||'我'} size={64}/><div><h2>{me?.name||'我的账号'}</h2><p>@{me?.username}</p><div className="badges"><span className={`badge ${me?.role==='admin'?'accent':''}`}>{role}</span><span className="badge">{me?.loginType==='link'?'免密链接登录':'密码登录'}</span></div></div><button className="button secondary" onClick={async()=>{await requestJSON('/api/auth/logout',{});location.href='/login';}}><LogOut size={16}/>退出</button></section>
  {me?.mustChange&&<div className="notice">这是首次登录或管理员重置后的密码，请先设置自己的新密码。</div>}
  {!me?.mustChange&&<nav className="quick-links"><a href="/shortcut"><Smartphone size={20}/><span><strong>我的快捷指令</strong><small>专属口令 · 一键收录</small></span><ArrowRight size={16}/></a><a href="/?view=mine"><Link2 size={20}/><span><strong>我的分享</strong><small>我收录过的资讯</small></span><ArrowRight size={16}/></a><a href="/reports"><Newspaper size={20}/><span><strong>每日日报</strong><small>AI 汇总当天重点</small></span><ArrowRight size={16}/></a>{me?.role==='admin'&&<a href="/admin"><ShieldCheck size={20}/><span><strong>管理后台</strong><small>用户、订阅、模型与推送</small></span><ArrowRight size={16}/></a>}</nav>}
  {!me?.mustChange&&<section className="settings-section"><h2><Palette size={19}/>阅读风格</h2><p>选择你喜欢的首页样式，仅对你的账号生效，换设备也会保留。</p><StylePicker value={style} onChange={setStyle} compact/></section>}
  <section className="settings-section"><h2><KeyRound size={19}/>登录密码</h2>{me?.loginType==='link'&&!me.mustChange?<p>你通过管理员发送的专属链接登录，无需密码。如需使用密码登录，请联系管理员为你设置初始密码。</p>:<details open={!!me?.mustChange}><summary>修改密码</summary><form onSubmit={password}><label>当前密码<input name="currentPassword" type="password" required autoComplete="current-password" maxLength={128}/></label><label>新密码<input name="password" type="password" minLength={12} maxLength={128} required autoComplete="new-password" placeholder="至少 12 个字符"/></label><label>再次输入新密码<input name="confirmPassword" type="password" required minLength={12} maxLength={128} autoComplete="new-password"/></label><button className="button primary" disabled={busy}>更新密码</button></form></details>}{error&&<p className="form-error" role="alert">{error}</p>}{message&&<p className="success-note" role="status">{message}</p>}</section>
  {me&&!me.mustChange&&<RecoveryPanel me={me}/>}
  {me&&!me.mustChange&&<McpPanel/>}
  {me&&!me.mustChange&&<FeishuPanel admin={me.role==='admin'}/>}
 </div></AppFrame>;
}
