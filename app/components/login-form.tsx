"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {requestJSON} from './session';
import {LogoMark,Wordmark} from './brand';
import RecoveryCodes from './recovery-codes';
type Mode='login'|'recover'|'setup'|'reset';
// Shared frame for login, first-run setup, password reset, magic links and public collect:
// one centred column, no decoration.
export function AuthShell({children,wide=false}:{children:ReactNode;wide?:boolean}){
 return <main className="auth"><header className="auth-top"><a href="/welcome" className="brand" aria-label="information-hub 产品介绍"><LogoMark size={28}/><Wordmark size={17}/></a><a href="/welcome" className="link-quiet">产品介绍</a></header><div className="auth-center"><section className={`auth-panel ${wide?'wide':''}`}>{children}</section></div><footer className="auth-bottom">由人精选、AI 协助整理的团队私有知识库</footer></main>;
}
function Field({label,children,hint}:{label:string;children:ReactNode;hint?:string}){return <label className="field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>;}
export default function LoginForm({setup=false,reset=false}:{setup?:boolean;reset?:boolean}){
 const[mode,setMode]=useState<Mode>(setup?'setup':reset?'reset':'login'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[token,setToken]=useState(''),[fromLink,setFromLink]=useState(false),[state,setState]=useState<{initialized:boolean;tokenRequired:boolean;tokenExpired:boolean;linkMissing:boolean}|null>(null),[codes,setCodes]=useState<{codes:string[];username:string;next:string}|null>(null),[done,setDone]=useState('');
 useEffect(()=>{if(!setup&&!reset)return;const value=new URLSearchParams(location.hash.slice(1)).get('token');if(value){setToken(value);setFromLink(true);history.replaceState(null,'',setup?'/setup':'/reset');}if(setup)requestJSON('/api/auth/setup').then(setState).catch(()=>{});},[setup,reset]);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const input=Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>;
  if(mode!=='login'&&input.password!==input.confirmPassword){setError('两次输入的密码不一致。');setBusy(false);return;}
  try{const path={login:'/api/auth/login',recover:'/api/auth/recover',setup:'/api/auth/setup',reset:'/api/auth/reset'}[mode];const d=await requestJSON(path,{...input,...(mode==='setup'||mode==='reset'?{token}:{})});
   if(mode==='setup'&&d.recoveryCodes){setCodes({codes:d.recoveryCodes,username:d.user.username,next:'/admin'});setBusy(false);return;}
   if(mode==='recover'||mode==='reset'){setDone('密码已更新，其他设备上的登录已退出。');setTimeout(()=>{location.href='/';},900);return;}
   location.href=d.user.mustChange?'/account':'/';}catch(err){setError((err as Error).message);setBusy(false);}}
 if(codes)return <AuthShell wide><Steps current={2}/><h1>保存恢复码</h1><p className="auth-desc">忘记密码时，用任意一个恢复码就能自己重置。它们只显示这一次。</p><RecoveryCodes codes={codes.codes} username={codes.username} onDone={()=>{location.href=codes.next;}} doneLabel="进入管理后台"/></AuthShell>;
 const titles:Record<Mode,[string,string]>={login:['登录','收到免密链接的成员，直接点开链接即可。'],recover:['用恢复码重置密码','输入用户名、一个未使用的恢复码和新密码。'],setup:['创建超级管理员','设置管理员账号和密码。创建后会生成 20 个恢复码。'],reset:['设置新密码','这是为你生成的一次性重置链接。']};
 const blocked=mode==='setup'&&(state?.initialized||state?.linkMissing||(state?.tokenExpired&&!fromLink));
 return <AuthShell>{mode==='setup'&&<Steps current={1}/>}<h1>{titles[mode][0]}</h1><p className="auth-desc">{titles[mode][1]}</p>
  {mode==='setup'&&state?.initialized?<div className="notice"><strong>系统已经初始化</strong><p>管理员账号已存在，请直接登录。</p><a className="btn btn-primary btn-block" href="/login">去登录</a></div>:
   mode==='setup'&&state?.linkMissing?<div className="notice warn"><strong>等待部署者生成初始化链接</strong><p>请在项目目录运行 <code>npm run setup-link</code>，再打开生成的私有链接创建管理员。</p></div>:
   mode==='setup'&&state?.tokenExpired&&!fromLink?<div className="notice warn"><strong>初始化链接已过期</strong><p>请部署者运行 <code>npm run setup-link</code> 生成新链接，再用新链接打开本页。</p></div>:null}
  {!blocked&&<form onSubmit={submit} className="stack-form">
   {mode==='setup'&&state?.tokenRequired&&!fromLink&&<Field label="初始化凭证" hint="部署时生成的初始化链接中的凭证"><input type="password" className="input" value={token} onChange={e=>setToken(e.target.value)} required autoComplete="off"/></Field>}
   {mode==='setup'&&<Field label="显示名称"><input name="name" className="input" required maxLength={40} autoComplete="name"/></Field>}
   {mode!=='reset'&&<Field label="用户名" hint={mode==='setup'?'英文字母、数字或下划线':undefined}><input name="username" className="input" required minLength={3} maxLength={32} autoComplete="username" autoCapitalize="none" spellCheck={false}/></Field>}
   {mode==='recover'&&<Field label="恢复码"><input name="code" className="input mono" required autoComplete="one-time-code" placeholder="XXXX-XXXX-XXXX" autoCapitalize="characters" spellCheck={false}/></Field>}
   <Field label={mode==='login'?'密码':'新密码'} hint={mode==='login'?undefined:'至少 12 个字符'}><input name="password" type="password" className="input" required minLength={mode==='login'?1:12} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'}/></Field>
   {mode!=='login'&&<Field label="确认密码"><input name="confirmPassword" type="password" className="input" required minLength={12} maxLength={128} autoComplete="new-password"/></Field>}
   {error&&<p className="alert error" role="alert">{error}</p>}{done&&<p className="alert ok" role="status">{done}</p>}
   <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy?'正在处理…':{login:'登录',recover:'重置并登录',setup:'创建超级管理员',reset:'保存并登录'}[mode]}</button>
  </form>}
  {(mode==='login'||mode==='recover')&&<div className="auth-links">{mode==='login'?<button className="link" onClick={()=>{setMode('recover');setError('');}}>忘记密码？</button>:<button className="link" onClick={()=>{setMode('login');setError('');}}>返回登录</button>}<a className="link-quiet" href="/collect">无需登录，直接收录</a></div>}
  {mode!=='login'&&<p className="fine">{mode==='setup'?'只保存密码哈希，任何人都无法查看明文。':'恢复码也丢失时，请联系管理员生成重置链接。'}</p>}
 </AuthShell>;
}
function Steps({current}:{current:number}){return <ol className="steps">{['创建账号','保存恢复码','开始使用'].map((s,n)=><li key={s} className={n+1<current?'done':n+1===current?'on':''}><span>{n+1}</span>{s}</li>)}</ol>;}
