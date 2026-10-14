"use client";
import {useCallback,useEffect,useState} from 'react';
import {UserPlus,Copy,Check,LoaderCircle} from 'lucide-react';
import {requestJSON,type CurrentUser} from '../components/session';
import {Avatar,Dialog} from '../components/ui';
import {dateLabel} from '../../lib/content';
import {RowMenu} from './ui';
type User={id:string;username:string;name:string;role:string;active:number;must_change:number;created_at:string;owner:number;login_type:string;magic_expires:number|null;magic_used:string|null;magic_created:string|null;share_count:number;shortcut_used:string|null};
const EXPIRY=[[7,'7 天'],[30,'30 天'],[90,'90 天'],[365,'1 年'],[0,'长期有效']] as const;
type Panel={kind:'add'}|{kind:'link';user?:User;url:string;reset:boolean}|{kind:'magic';user:User}|{kind:'password';user:User}|null;
export default function Users({me}:{me:CurrentUser|null}){
 const[users,setUsers]=useState<User[]|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[panel,setPanel]=useState<Panel>(null),[loginType,setLoginType]=useState('link'),[days,setDays]=useState(30),[copied,setCopied]=useState(false);
 const refresh=useCallback(()=>requestJSON('/api/admin/users').then(d=>setUsers(d.users)).catch(e=>setError(e.message)),[]);useEffect(()=>{refresh();},[refresh]);
 async function run(fn:()=>Promise<unknown>,ok?:string){setBusy(true);setError('');setMessage('');try{await fn();if(ok)setMessage(ok);await refresh();return true;}catch(e){setError((e as Error).message);return false;}finally{setBusy(false);}}
 async function create(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const input=Object.fromEntries(new FormData(e.currentTarget));await run(async()=>{const d=await requestJSON('/api/admin/users',{...input,loginType,days});setPanel(d.magicUrl?{kind:'link',url:d.magicUrl,reset:false}:null);},loginType==='password'?'已添加，首次登录需修改初始密码。':undefined);}
 async function copy(url:string){try{await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{}}
 const close=()=>{setPanel(null);setCopied(false);};
 return <div className="admin-pane">
  <div className="toolbar"><p>{users?`${users.filter(u=>u.active).length} 位启用 · 共 ${users.length} 位`:' '}</p><button className="btn btn-primary btn-sm" onClick={()=>setPanel({kind:'add'})}><UserPlus size={15}/>添加成员</button></div>
  {error&&<p className="alert error" role="alert">{error}</p>}{message&&<p className="alert ok" role="status">{message}</p>}
  <div className="table-wrap"><table className="table responsive"><thead><tr><th>成员</th><th>角色</th><th>登录方式</th><th className="num">分享</th><th>快捷指令</th><th>状态</th><th aria-label="操作"/></tr></thead>
   <tbody>{(users||[]).map(u=>{const self=u.id===me?.id;const locked=!!u.owner&&!me?.owner;return <tr key={u.id} className={u.active?'':'muted-row'}>
    <td data-label="成员"><span className="cell-user"><Avatar name={u.name} size={36}/><span><strong>{u.name}{self&&<em>（我）</em>}</strong><small>@{u.username}</small></span></span></td>
    <td data-label="角色" className="nowrap">{u.owner?'超级管理员':u.role==='admin'?'管理员':'成员'}</td>
    <td data-label="登录方式" className="nowrap"><span className="cell-stack">{u.login_type==='link'?<>免密链接<small className="sub">{u.magic_expires?`${dateLabel(new Date(u.magic_expires).toISOString())} 到期`:u.magic_created?'长期有效':'未生成'}</small></>:'密码'}{!!u.must_change&&<small className="sub">待改密</small>}</span></td>
    <td data-label="分享" className="num">{u.share_count}</td>
    <td data-label="快捷指令">{u.shortcut_used?dateLabel(u.shortcut_used):<span className="muted">未使用</span>}</td>
    <td data-label="状态"><span className={`badge ${u.active?'ok':''}`}>{u.active?'启用':'已停用'}</span></td>
    <td className="cell-actions">{!self&&!locked&&<RowMenu label={`${u.name} 的操作`}>
     <button onClick={()=>setPanel({kind:'magic',user:u})}>{u.magic_created?'重新生成登录链接':'生成登录链接'}</button>
     {u.magic_created&&<button onClick={()=>run(()=>requestJSON(`/api/admin/users/${u.id}/magic`,{},'DELETE'),'登录链接已撤销。')}>撤销登录链接</button>}
     <button onClick={()=>run(async()=>{const d=await requestJSON(`/api/admin/users/${u.id}/reset-link`,{});setPanel({kind:'link',user:u,url:d.resetUrl,reset:true});})}>生成密码重置链接</button>
     <button onClick={()=>setPanel({kind:'password',user:u})}>设置临时密码</button>
     {!u.owner&&<button onClick={()=>run(()=>requestJSON('/api/admin/users/'+u.id,{role:u.role==='admin'?'member':'admin'},'PATCH'),'权限已更新。')}>{u.role==='admin'?'设为成员':'设为管理员'}</button>}
     <button className="danger" onClick={()=>run(()=>requestJSON('/api/admin/users/'+u.id,{active:!u.active},'PATCH'),u.active?'已停用，登录全部失效。':'已启用。')}>{u.active?'停用':'启用'}</button>
    </RowMenu>}</td></tr>;})}</tbody></table>{!users&&<p className="table-empty">正在读取…</p>}</div>
  <Dialog open={panel?.kind==='add'} onClose={close} title="添加成员" footer={<><button className="btn btn-ghost" onClick={close}>取消</button><button className="btn btn-primary" form="add-user" disabled={busy}>{busy&&<LoaderCircle size={15} className="spin"/>}{loginType==='link'?'添加并生成链接':'添加'}</button></>}>
   <form id="add-user" onSubmit={create} className="stack-form">
    <div className="segmented" role="radiogroup" aria-label="登录方式">{([['link','免密链接'],['password','账号密码']] as const).map(([v,l])=><button type="button" role="radio" aria-checked={loginType===v} key={v} className={loginType===v?'on':''} onClick={()=>setLoginType(v)}>{l}</button>)}</div>
    <p className="fine">{loginType==='link'?'对方点开专属链接即可阅读，无需密码。':'首次登录时需要修改初始密码。'}</p>
    <label className="field"><span>显示名称</span><input name="name" required maxLength={40} className="input" placeholder="张三"/></label>
    <label className="field"><span>用户名或邮箱</span><input name="username" required minLength={3} maxLength={64} autoCapitalize="none" className="input" placeholder="zhangsan"/><small>普通用户名（3–32 位）或邮箱地址（最多 64 位）</small></label>
    {loginType==='password'?<label className="field"><span>初始密码</span><input name="password" type="password" minLength={12} maxLength={128} required autoComplete="new-password" className="input" placeholder="至少 12 个字符"/></label>:<label className="field"><span>链接有效期</span><select className="select" value={days} onChange={e=>setDays(Number(e.target.value))}>{EXPIRY.map(([d,l])=><option key={d} value={d}>{l}</option>)}</select></label>}
    <label className="field"><span>权限</span><select name="role" className="select"><option value="member">成员：阅读、收藏、分享</option><option value="admin">管理员：成员、订阅与系统设置</option></select></label>
   </form>
  </Dialog>
  <Dialog open={panel?.kind==='magic'} onClose={close} title="生成登录链接" footer={<><button className="btn btn-ghost" onClick={close}>取消</button><button className="btn btn-primary" disabled={busy} onClick={()=>panel?.kind==='magic'&&run(async()=>{const d=await requestJSON(`/api/admin/users/${panel.user.id}/magic`,{days});setPanel({kind:'link',user:panel.user,url:d.magicUrl,reset:false});})}>生成</button></>}>
   {panel?.kind==='magic'&&<div className="stack-form"><p className="fine">为 {panel.user.name} 生成专属登录链接。{panel.user.magic_created?'旧链接会立即失效。':''}</p><label className="field"><span>有效期</span><select className="select" value={days} onChange={e=>setDays(Number(e.target.value))}>{EXPIRY.map(([d,l])=><option key={d} value={d}>{l}</option>)}</select></label></div>}
  </Dialog>
  <Dialog open={panel?.kind==='password'} onClose={close} title="设置临时密码" footer={<><button className="btn btn-ghost" onClick={close}>取消</button><button className="btn btn-primary" form="temp-password" disabled={busy}>确认</button></>}>
   {panel?.kind==='password'&&<form id="temp-password" className="stack-form" onSubmit={async e=>{e.preventDefault();const pw=new FormData(e.currentTarget).get('password');if(await run(()=>requestJSON('/api/admin/users/'+panel.user.id,{password:pw},'PATCH'),'已设置临时密码，下次登录需修改。'))close();}}><p className="fine">通常更推荐发送重置链接，让 {panel.user.name} 自己设置。</p><label className="field"><span>临时密码</span><input name="password" type="password" minLength={12} maxLength={128} required autoComplete="new-password" className="input" placeholder="至少 12 个字符"/></label></form>}
  </Dialog>
  <Dialog open={panel?.kind==='link'} onClose={close} title={panel?.kind==='link'&&panel.reset?'密码重置链接':'专属登录链接'} footer={<button className="btn btn-primary" onClick={close}>完成</button>}>
   {panel?.kind==='link'&&<div className="stack-form"><p className="fine">{panel.reset?'24 小时内有效，对方打开后设置新密码。':'打开即可登录，等同账号本身。'}请通过私聊发给{panel.user?` ${panel.user.name} `:'本人'}，链接只显示这一次。</p><div className="kv"><code>{panel.url}</code><button className="btn btn-secondary btn-sm" onClick={()=>copy(panel.url)}>{copied?<Check size={14}/>:<Copy size={14}/>}{copied?'已复制':'复制'}</button></div></div>}
  </Dialog>
 </div>;
}
