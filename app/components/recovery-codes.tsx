"use client";
import {useState} from 'react';
import {Download,Copy,Check} from 'lucide-react';
// Shown exactly once after the codes are generated; the server keeps only hashes.
export default function RecoveryCodes({codes,username,onDone,doneLabel='我已保存，继续'}:{codes:string[];username:string;onDone?:()=>void;doneLabel?:string}){
 const[saved,setSaved]=useState(false),[copied,setCopied]=useState(false);
 const text=`information-hub 密码恢复码\n账号：@${username}\n生成时间：${new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}\n站点：${typeof location==='undefined'?'':location.origin}\n\n每个恢复码只能使用一次。忘记密码时，在登录页点“忘记密码？”。\n请把本文件保存在密码管理器或安全的地方，不要发给他人。\n\n${codes.map((c,n)=>`${String(n+1).padStart(2,'0')}. ${c}`).join('\n')}\n`;
 function download(){const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`information-hub-恢复码-${username}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setSaved(true);}
 async function copy(){try{await navigator.clipboard.writeText(text);setCopied(true);setSaved(true);setTimeout(()=>setCopied(false),2000);}catch{}}
 return <div className="recovery"><p className="notice warn">每个恢复码只能用一次，只显示这一次。请下载或复制后保存在密码管理器里。</p><ol className="codes">{codes.map(c=><li key={c}><code>{c}</code></li>)}</ol><div className="row-actions"><button type="button" className="btn btn-secondary" onClick={download}><Download size={15}/>下载 .txt</button><button type="button" className="btn btn-secondary" onClick={copy}>{copied?<Check size={15}/>:<Copy size={15}/>}{copied?'已复制':'复制全部'}</button></div>{onDone&&<label className="check"><input type="checkbox" checked={saved} onChange={e=>setSaved(e.target.checked)}/>我已保存恢复码</label>}{onDone&&<button type="button" className="btn btn-primary btn-lg btn-block" disabled={!saved} onClick={onDone}>{doneLabel}</button>}</div>;
}
