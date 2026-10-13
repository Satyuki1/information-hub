"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {ArrowRight,LockKeyhole,Languages,Radio,Newspaper,Send,User,KeyRound,LifeBuoy,ArrowLeft,Sparkles,Target,Check} from 'lucide-react';
import {requestJSON} from './session';
import {LogoMark,Wordmark} from './brand';
import RecoveryCodes from './recovery-codes';
type Mode='login'|'recover'|'setup'|'reset';
// Shared frame for login, first-run setup, password reset, magic links and public collect.
export function AuthShell({children,wide=false}:{children:ReactNode;wide?:boolean}){
 return <main className="auth-shell"><div className="auth-bg" aria-hidden="true"/><header className="auth-top"><a href="/welcome" className="site-logo" aria-label="information-hub 产品介绍"><LogoMark size={30}/><Wordmark size={18}/></a><a href="/welcome" className="auth-top-link">了解产品<ArrowRight size={14}/></a></header><div className={`auth-layout ${wide?'wide':''}`}><AuthBrand/><section className="auth-panel">{children}</section></div></main>;
}
export function AuthBrand(){return <aside className="auth-intro" aria-hidden="true"><span className="site-eyebrow"><Sparkles size={14}/>由人精选 · AI 协助整理</span><h2>团队的私有资讯库。</h2><p>把 X 上的好内容分享进来，原文、图片与中文译文一起保存，团队在同一个地方阅读、查找和积累。</p><ul><li><Languages size={18}/>原文与中文译文并存</li><li><Radio size={18}/>订阅关键账号，按关注方向分析</li><li><Newspaper size={18}/>每天一份 AI 日报</li><li><Send size={18}/>推送到飞书与企业微信</li></ul><div className="auth-float"><div className="float-card a"><Target size={13}/><span><b>定向分析</b><small>相关度 92 · 与关注方向高度相关</small></span></div><div className="float-card b"><Newspaper size={13}/><span><b>今日日报已生成</b><small>10 条资讯 · 3 个趋势</small></span></div><div className="float-card c"><Check size={13}/><span><b>唐成 分享了 1 条</b><small>翻译整理完成</small></span></div></div></aside>;}
function Field({icon,label,children}:{icon?:ReactNode;label:string;children:ReactNode}){return <label className="auth-field"><span>{label}</span><div>{icon}{children}</div></label>;}
export default function LoginForm({setup=false,reset=false}:{setup?:boolean;reset?:boolean}){
 const[mode,setMode]=useState<Mode>(setup?'setup':reset?'reset':'login'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[token,setToken]=useState(''),[fromLink,setFromLink]=useState(false),[state,setState]=useState<{initialized:boolean;tokenRequired:boolean;tokenExpired:boolean;linkMissing:boolean}|null>(null),[codes,setCodes]=useState<{codes:string[];username:string;next:string}|null>(null),[done,setDone]=useState('');
 useEffect(()=>{if(!setup&&!reset)return;const value=new URLSearchParams(location.hash.slice(1)).get('token');if(value){setToken(value);setFromLink(true);history.replaceState(null,'',setup?'/setup':'/reset');}if(setup)requestJSON('/api/auth/setup').then(setState).catch(()=>{});},[setup,reset]);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const input=Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>;
  if(mode!=='login'&&input.password!==input.confirmPassword){setError('两次输入的密码不一致。');setBusy(false);return;}
  try{const path={login:'/api/auth/login',recover:'/api/auth/recover',setup:'/api/auth/setup',reset:'/api/auth/reset'}[mode];const d=await requestJSON(path,{...input,...(mode==='setup'||mode==='reset'?{token}:{})});
   if(mode==='setup'&&d.recoveryCodes){setCodes({codes:d.recoveryCodes,username:d.user.username,next:'/admin'});setBusy(false);return;}
   if(mode==='recover'||mode==='reset'){setDone('密码已更新，其他设备上的登录已退出。');setTimeout(()=>{location.href='/';},900);return;}
   location.href=d.user.mustChange?'/account':'/';}catch(e){setError((e as Error).message);setBusy(false);}}
 if(codes)return <AuthShell wide><Steps current={2}/><h1>保存你的恢复码</h1><p className="auth-desc">忘记密码时，用任意一个恢复码就能自己重置。它们只显示这一次。</p><RecoveryCodes codes={codes.codes} username={codes.username} onDone={()=>{location.href=codes.next;}} doneLabel="进入管理后台"/></AuthShell>;
 const titles:Record<Mode,[string,string]>={login:['欢迎回来','登录后继续阅读团队的资讯。收到免密链接的成员，直接点开链接即可。'],recover:['用恢复码重置密码','输入用户名、任意一个未使用的恢复码和新密码。每个恢复码只能用一次。'],setup:['创建超级管理员','首次使用，请设置管理员账号和密码。创建后会生成 20 个恢复码，用于找回密码。'],reset:['设置新密码','这是管理员或运维为你生成的一次性重置链接。']};
 const initialized=mode==='setup'&&state?.initialized;
 return <AuthShell>{mode==='setup'&&<Steps current={1}/>}<h1>{titles[mode][0]}</h1><p className="auth-desc">{titles[mode][1]}</p>
  {initialized?<div className="auth-notice"><strong>系统已经初始化</strong><p>管理员账号已存在，请直接登录。</p><a className="button primary wide" href="/login">去登录<ArrowRight size={16}/></a></div>:
  mode==='setup'&&state?.linkMissing?<div className="auth-notice warn"><strong>等待部署者生成初始化链接</strong><p>请在项目目录运行 <code>npm run setup-link</code>，再打开生成的私有链接创建管理员。</p></div>:
  mode==='setup'&&state?.tokenExpired&&!fromLink?<div className="auth-notice warn"><strong>初始化链接已过期</strong><p>请部署者在项目目录运行 <code>npm run setup-link</code> 生成新的链接，再用新链接打开本页。</p></div>:
  <form onSubmit={submit} className="auth-form">
   {mode==='setup'&&state?.tokenRequired&&!fromLink&&<Field label="初始化凭证" icon={<KeyRound size={17}/>}><input type="password" value={token} onChange={e=>setToken(e.target.value)} required autoComplete="off" placeholder="部署时生成的初始化链接中的凭证"/></Field>}
   {mode==='setup'&&<Field label="显示名称" icon={<User size={17}/>}><input name="name" required maxLength={40} placeholder="你的名字" autoComplete="name"/></Field>}
   {mode!=='reset'&&<Field label="用户名" icon={<User size={17}/>}><input name="username" required minLength={3} maxLength={32} autoComplete="username" placeholder={mode==='setup'?'英文字母、数字或下划线，如 admin':'输入用户名'} autoCapitalize="none" spellCheck={false}/></Field>}
   {mode==='recover'&&<Field label="恢复码" icon={<LifeBuoy size={17}/>}><input name="code" required autoComplete="one-time-code" placeholder="XXXX-XXXX-XXXX" autoCapitalize="characters" spellCheck={false}/></Field>}
   <Field label={mode==='login'?'密码':'新密码'} icon={<LockKeyhole size={17}/>}><input name="password" type="password" required minLength={mode==='login'?1:12} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'} placeholder={mode==='login'?'输入密码':'至少 12 个字符'}/></Field>
   {mode!=='login'&&<Field label="确认密码" icon={<LockKeyhole size={17}/>}><input name="confirmPassword" type="password" required minLength={12} maxLength={128} autoComplete="new-password" placeholder="再输入一次"/></Field>}
   {error&&<p className="form-error" role="alert">{error}</p>}{done&&<p className="success-note" role="status"><Check size={16}/>{done}</p>}
   <button className="button primary wide big" disabled={busy}>{busy?'正在处理…':{login:'登录',recover:'重置密码并登录',setup:'创建超级管理员',reset:'保存新密码并登录'}[mode]}<ArrowRight size={17}/></button>
  </form>}
  <div className="auth-links">{mode==='login'&&<button className="text-link" onClick={()=>{setMode('recover');setError('');}}><LifeBuoy size={14}/>忘记密码？用恢复码重置</button>}{mode==='recover'&&<button className="text-link" onClick={()=>{setMode('login');setError('');}}><ArrowLeft size={14}/>返回登录</button>}{(mode==='login'||mode==='recover')&&<a className="text-link" href="/collect">只想分享？无需登录即可收录</a>}</div>
  <p className="auth-foot"><LockKeyhole size={13}/>{mode==='setup'?'只保存密码哈希，后台无法查看明文。':'账号由管理员创建。恢复码也丢失时，请联系管理员生成重置链接。'}</p>
 </AuthShell>;
}
function Steps({current}:{current:number}){return <ol className="auth-steps">{['创建账号','保存恢复码','开始使用'].map((s,n)=><li key={s} className={n+1<current?'done':n+1===current?'on':''}><span>{n+1<current?<Check size={12}/>:n+1}</span>{s}</li>)}</ol>;}
