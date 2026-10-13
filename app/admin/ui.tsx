"use client";
import {useState,type ReactNode} from 'react';
import {LoaderCircle,MoreHorizontal} from 'lucide-react';
import {requestJSON} from '../components/session';
export {Switch} from '../components/ui';
export type SecretInfo={configured:boolean;source:string;hint:string};
// Secrets are write-only: the server returns only whether one is set, its source and a short hint.
export function SecretField({name,info,value,onChange,placeholder,link}:{name:string;info?:SecretInfo;value:string|null|undefined;onChange:(name:string,v:string|null|undefined)=>void;placeholder?:string;link?:ReactNode}){
 const cleared=value===null;
 return <div className="secret"><input type="password" className="input mono" autoComplete="off" spellCheck={false} value={typeof value==='string'?value:''} onChange={e=>onChange(name,e.target.value||undefined)} placeholder={cleared?'保存后清除':info?.configured?`已配置 ${info.hint}（输入新值以替换）`:placeholder||'未配置'}/><small className="secret-meta">{cleared?<>将在保存后清除 · <button type="button" className="link" onClick={()=>onChange(name,undefined)}>撤销</button></>:info?.configured?<>{info.source}{info.source==='后台设置'&&<> · <button type="button" className="link" onClick={()=>onChange(name,null)}>清除</button></>}</>:'未配置'}{link&&<> · {link}</>}</small></div>;
}
export function TestButton({target,label='测试',disabled}:{target:string;label?:string;disabled?:boolean}){
 const[state,setState]=useState<{busy?:boolean;ok?:boolean;message?:string}>({});
 return <span className="test"><button type="button" className="btn btn-secondary btn-sm" disabled={disabled||state.busy} title={disabled?'请先保存设置':undefined} onClick={async()=>{setState({busy:true});try{const r=await requestJSON('/api/admin/config/test',{target});setState({ok:r.ok,message:r.message});}catch(e){setState({ok:false,message:(e as Error).message});}}}>{state.busy&&<LoaderCircle size={14} className="spin"/>}{label}</button>{state.message&&<small className={state.ok?'ok':'bad'} role="status">{state.message}</small>}</span>;
}
export function SaveBar({dirty,busy,onSave,onReset}:{dirty:boolean;busy:boolean;onSave:()=>void;onReset:()=>void}){return <div className={`save-bar ${dirty?'show':''}`} aria-hidden={!dirty}><span>有未保存的修改</span><button type="button" className="btn btn-ghost btn-sm" onClick={onReset} disabled={busy}>放弃</button><button type="button" className="btn btn-primary btn-sm" onClick={onSave} disabled={busy}>{busy&&<LoaderCircle size={14} className="spin"/>}保存</button></div>;}
export function Meter({value,max}:{value:number;max:number}){const pct=Math.min(100,Math.round(value/Math.max(1,max)*100));return <span className="meter" title={`${value} / ${max}`}><span className="meter-track"><span style={{width:pct+'%'}} className={pct>85?'warn':''}/></span><small>{value} / {max}</small></span>;}
// Row action menu for tables.
export function RowMenu({label,children}:{label:string;children:ReactNode}){return <details className="row-menu"><summary className="icon-btn" aria-label={label}><MoreHorizontal size={18}/></summary><div className="menu">{children}</div></details>;}
