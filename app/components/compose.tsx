"use client";
import {useState} from "react";
import {LoaderCircle} from "lucide-react";
import {TOPICS,type Article} from "../../lib/content";
import {api} from "./common";
import {useSession} from "./session";
import {Dialog} from "./ui";
// The only way to add something on the web: paste a link or some text.
export default function Compose({open,onClose,onSaved}:{open:boolean;onClose:()=>void;onSaved:(item:Article,duplicate:boolean)=>void}){
 const me=useSession();const[text,setText]=useState(""),[more,setMore]=useState(false),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function save(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const raw=text.trim();if(!raw)return;setBusy(true);setError("");const form=Object.fromEntries(new FormData(e.currentTarget));const isLink=/^https?:\/\/\S+$/.test(raw);
  try{const data=await api('/api/shares',{...form,url:isLink?raw:'',original:isLink?'':raw});if(!data.item)throw new Error("已收到，请重新登录后查看。");onSaved(data.item,!!data.duplicate);setText("");setMore(false);onClose();}catch(err){setError((err as Error).message);}finally{setBusy(false);}}
 return <Dialog open={open} onClose={onClose} title="收录"><form onSubmit={save} className="compose">
  <textarea autoFocus value={text} onChange={e=>setText(e.target.value)} maxLength={12000} rows={5} placeholder="粘贴 X 链接，或输入要保存的正文" aria-label="链接或正文" className="compose-input"/>
  <p className="compose-hint">X 链接会自动获取原文、图片并翻译整理{me?`，记在 ${me.name} 名下`:''}。</p>
  {more&&<div className="compose-more"><label className="field"><span>主题</span><select name="category" defaultValue="" className="select"><option value="">自动识别</option>{TOPICS.map(t=><option key={t}>{t}</option>)}</select></label>{me?.role==='admin'&&<label className="field"><span>分享人</span><input name="sharer" defaultValue={me.name} key={me.name} maxLength={40} className="input"/></label>}<label className="field wide"><span>备注</span><input name="note" maxLength={2000} placeholder="为什么值得一读（选填）" className="input"/></label></div>}
  {error&&<p className="alert error" role="alert">{error}</p>}
  <div className="compose-foot"><button type="button" className="link" onClick={()=>setMore(!more)}>{more?'收起选项':'更多选项'}</button><span>{text.length>0&&`${text.length.toLocaleString()} / 12,000`}</span><button className="btn btn-primary" disabled={busy||!text.trim()}>{busy&&<LoaderCircle size={16} className="spin"/>}收录</button></div>
 </form></Dialog>;
}
