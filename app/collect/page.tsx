"use client";
import {useState} from 'react';
import {requestJSON} from '../components/session';
import {AuthShell} from '../components/login-form';
export default function Page(){const[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;setBusy(true);setMessage('');setError('');try{const d=await requestJSON('/api/collect',Object.fromEntries(new FormData(form)));setMessage(d.message||'已收到。');form.reset();}catch(err){setError((err as Error).message);}finally{setBusy(false);}}
 return <AuthShell><h1>收录</h1><p className="auth-desc">无需登录即可提交。阅读整理后的内容需要账号。</p><form onSubmit={submit} className="stack-form"><label className="field"><span>链接或正文</span><textarea name="input" rows={6} maxLength={12000} required className="textarea" placeholder="粘贴 X 链接，或输入要保存的文字"/></label>{error&&<p className="alert error" role="alert">{error}</p>}{message&&<p className="alert ok" role="status">{message}</p>}<button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy?'正在提交…':'提交'}</button></form><div className="auth-links"><a href="/login" className="link">登录</a><a href="/guide" className="link-quiet">iPhone 快捷指令</a></div></AuthShell>;
}
