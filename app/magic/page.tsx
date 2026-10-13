"use client";
import {useEffect,useState} from 'react';
import {LoaderCircle} from 'lucide-react';
import {requestJSON} from '../components/session';
import {AuthShell} from '../components/login-form';
// Private sign-in links carry the token in the fragment so it never reaches server logs or referrers.
export default function Page(){
 const[error,setError]=useState('');
 useEffect(()=>{const token=new URLSearchParams(location.hash.slice(1)).get('token');history.replaceState(null,'','/magic');if(!token){setError('链接不完整，请从管理员发给你的消息中重新打开。');return;}
  requestJSON('/api/auth/magic',{token}).then(()=>location.replace('/')).catch(e=>setError(e.message));},[]);
 return <AuthShell>{error?<><h1>无法登录</h1><p className="auth-desc">{error}</p><a className="btn btn-primary btn-block" href="/login">使用账号密码登录</a></>:<><h1>正在登录</h1><p className="auth-desc">正在验证你的专属登录链接。</p><LoaderCircle className="spin" size={22}/></>}<p className="fine">专属链接等同于你的账号，请勿转发。</p></AuthShell>;
}
