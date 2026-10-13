"use client";
import {useState} from 'react';
import {LogOut,ArrowRight} from 'lucide-react';
import AppFrame from '../components/app-frame';
import {useSession,useReadingStyle,requestJSON} from '../components/session';
import {StyleSwitch} from '../components/account-menu';
import {Avatar,PageHeader,Section} from '../components/ui';
import FeishuPanel from '../components/feishu-panel';
import {RecoveryPanel,McpPanel} from '../components/account-panels';
const STYLE_HINT={x:'X 风格：单列信息流，克制、专注文字。',red:'小红书风格：瀑布流卡片，图片优先。',news:'今日头条风格：新闻列表，信息密度高。'};
export default function Page(){
 const me=useSession();const[style,setStyle]=useReadingStyle(me);const[editing,setEditing]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function password(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');setMessage('');const f=e.currentTarget;const input=Object.fromEntries(new FormData(f));if(input.password!==input.confirmPassword){setError('两次输入的新密码不一致。');setBusy(false);return;}try{await requestJSON('/api/auth/password',input);if(me?.mustChange){location.href='/';return;}setMessage('密码已更新，其他设备已退出登录。');f.reset();setEditing(false);}catch(err){setError((err as Error).message);}finally{setBusy(false);}}
 const role=me?.owner?'超级管理员':me?.role==='admin'?'管理员':'成员';const showForm=editing||!!me?.mustChange;
 return <AppFrame active="account">
  <PageHeader title="我的账号"/>
  {me?.mustChange&&<p className="alert warn">这是首次登录或管理员重置后的密码，请先设置自己的新密码。</p>}
  <Section><div className="profile"><Avatar name={me?.name||'我'} size={56}/><div><strong>{me?.name}</strong><small>@{me?.username}</small><small>{role} · {me?.loginType==='link'?'免密链接登录':'密码登录'}</small></div><button className="btn btn-secondary btn-sm" onClick={async()=>{await requestJSON('/api/auth/logout',{});location.href='/login';}}><LogOut size={15}/>退出</button></div></Section>
  {!me?.mustChange&&<Section title="阅读风格" desc={STYLE_HINT[style]}><StyleSwitch value={style} onChange={setStyle}/></Section>}
  {!me?.mustChange&&<Section title="快捷指令" desc="在 iPhone 的 X 里点分享即可收录，记在你的名下。" actions={<a className="btn btn-secondary btn-sm" href="/shortcut">安装<ArrowRight size={14}/></a>}><></></Section>}
  <Section title="登录密码" desc={me?.loginType==='link'&&!me.mustChange?'你通过专属链接登录，不需要密码。可以用恢复码设置一个密码。':undefined} actions={me?.loginType!=='link'&&!showForm?<button className="btn btn-secondary btn-sm" onClick={()=>setEditing(true)}>修改密码</button>:undefined}>
   {showForm&&me?.loginType!=='link'&&<form onSubmit={password} className="stack-form"><label className="field"><span>当前密码</span><input name="currentPassword" type="password" required autoComplete="current-password" maxLength={128} className="input"/></label><label className="field"><span>新密码</span><input name="password" type="password" minLength={12} maxLength={128} required autoComplete="new-password" placeholder="至少 12 个字符" className="input"/></label><label className="field"><span>确认新密码</span><input name="confirmPassword" type="password" required minLength={12} maxLength={128} autoComplete="new-password" className="input"/></label><div className="row-actions">{!me?.mustChange&&<button type="button" className="btn btn-ghost" onClick={()=>setEditing(false)}>取消</button>}<button className="btn btn-primary" disabled={busy}>更新密码</button></div></form>}
   {error&&<p className="alert error" role="alert">{error}</p>}{message&&<p className="alert ok" role="status">{message}</p>}
  </Section>
  {me&&!me.mustChange&&<><RecoveryPanel me={me}/><McpPanel/><FeishuPanel admin={me.role==='admin'}/></>}
 </AppFrame>;
}
