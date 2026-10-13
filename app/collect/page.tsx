"use client";
import {useState} from 'react';
import {Check,ArrowRight} from 'lucide-react';
import {requestJSON} from '../components/session';
import {AuthShell} from '../components/login-form';
export default function Page(){const[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;setBusy(true);setMessage('');setError('');try{const d=await requestJSON('/api/collect',Object.fromEntries(new FormData(form)));setMessage(d.message||'分享已收到。');form.reset();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <AuthShell><h1>好内容，随手留下。</h1><p className="auth-desc">无需登录即可分享。阅读整理后的资讯，需要管理员开通账号。</p><form onSubmit={submit} className="auth-form"><label className="auth-field"><span>链接或正文</span><div><textarea name="input" rows={6} maxLength={12000} required placeholder="粘贴 X 链接或想要保存的文字…"/></div></label>{error&&<p className="form-error" role="alert">{error}</p>}{message&&<div className="success-note" role="status"><Check size={18}/>{message}</div>}<button className="button primary wide big" disabled={busy}>{busy?'正在提交…':'提交分享'}<ArrowRight size={17}/></button></form><div className="auth-links"><a href="/login" className="text-link">已有账号？登录阅读</a><a href="/guide" className="text-link">iPhone 快捷指令教程</a></div></AuthShell>;
}
