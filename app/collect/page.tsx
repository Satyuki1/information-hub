"use client";
import {useState} from 'react';
import {Layers2,Check,ArrowRight} from 'lucide-react';
import {requestJSON} from '../components/session';
export default function Page(){const[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;setBusy(true);setMessage('');setError('');try{const d=await requestJSON('/api/collect',Object.fromEntries(new FormData(form)));setMessage(d.message||'分享已收到。');form.reset();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <main className="auth-page"><section className="auth-card"><span className="auth-mark"><Layers2 size={30}/></span><span className="eyebrow">资讯汇集 · 公开收录入口</span><h1>好内容，随手留下。</h1><p>无需登录即可分享。阅读整理后的资讯，需要管理员开通账号。</p><form onSubmit={submit}><label>链接或正文<textarea name="input" rows={7} maxLength={12000} required placeholder="粘贴 X 链接或想要保存的文字…"/></label>{error&&<p className="form-error" role="alert">{error}</p>}{message&&<div className="success-note" role="status"><Check size={18}/>{message}</div>}<button className="button primary" disabled={busy}>{busy?'正在提交…':'提交分享'}<ArrowRight size={17}/></button></form><a href="/login" className="text-link">已有账号？登录阅读 →</a><a href="/install.html" className="text-link">安装 iPhone 快捷分享 →</a></section></main>;
}
