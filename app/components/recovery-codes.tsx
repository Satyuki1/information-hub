"use client";
import {useState} from 'react';
import {Download,Copy,Check,ShieldCheck} from 'lucide-react';
// Shown exactly once after the codes are generated; the server keeps only hashes.
export default function RecoveryCodes({codes,username,onDone,doneLabel='我已保存，继续'}:{codes:string[];username:string;onDone?:()=>void;doneLabel?:string}){
 const[saved,setSaved]=useState(false),[copied,setCopied]=useState(false);
 const text=`information-hub 密码恢复码\n账号：@${username}\n生成时间：${new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}\n站点：${typeof location==='undefined'?'':location.origin}\n\n每个恢复码只能使用一次。忘记密码时，在登录页点“用恢复码重置密码”。\n请把本文件保存在密码管理器或安全的地方，不要发给他人。\n\n${codes.map((c,n)=>`${String(n+1).padStart(2,'0')}. ${c}`).join('\n')}\n`;
 function download(){const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`information-hub-恢复码-${username}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setSaved(true);}
 async function copy(){try{await navigator.clipboard.writeText(text);setCopied(true);setSaved(true);setTimeout(()=>setCopied(false),2000);}catch{}}
 return <div className="recovery"><div className="recovery-head"><ShieldCheck size={20}/><div><strong>20 个密码恢复码</strong><small>每个只能用一次。只显示这一次，请立即下载保存。</small></div></div><ol className="recovery-grid">{codes.map(c=><li key={c}><code>{c}</code></li>)}</ol><div className="recovery-actions"><button type="button" className="button primary" onClick={download}><Download size={16}/>下载恢复码（.txt）</button><button type="button" className="button secondary" onClick={copy}>{copied?<Check size={16}/>:<Copy size={16}/>}{copied?'已复制':'复制全部'}</button></div>{onDone&&<label className="recovery-confirm"><input type="checkbox" checked={saved} onChange={e=>setSaved(e.target.checked)}/>我已把恢复码保存在安全的地方</label>}{onDone&&<button type="button" className="button primary wide" disabled={!saved} onClick={onDone}>{doneLabel}</button>}</div>;
}
