"use client";
import {useEffect,useRef,useState} from 'react';
import {UserRound,Smartphone,ShieldCheck,LogOut,MoreHorizontal,Rows3,LayoutGrid,Newspaper} from 'lucide-react';
import {useSession,useReadingStyle,requestJSON,type ReadingStyle} from './session';
import {Avatar} from './ui';
export const STYLES:[ReadingStyle,string,typeof Rows3][]=[['x','X',Rows3],['red','小红书',LayoutGrid],['news','头条',Newspaper]];
export function StyleSwitch({value,onChange}:{value:ReadingStyle;onChange:(s:ReadingStyle)=>void}){
 return <div className="segmented" role="radiogroup" aria-label="阅读风格">{STYLES.map(([id,label,Icon])=><button key={id} type="button" role="radio" aria-checked={value===id} className={value===id?'on':''} onClick={()=>onChange(id)}><Icon size={14}/>{label}</button>)}</div>;
}
// The one place to switch reading style, shared by every layout: avatar → menu (a sheet on phones).
export default function AccountMenu({variant='avatar'}:{variant?:'avatar'|'nav'}){
 const me=useSession();const[style,setStyle]=useReadingStyle(me);const[open,setOpen]=useState(false);const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!open)return;const close=(e:PointerEvent)=>{if(!ref.current?.contains(e.target as Node))setOpen(false);};const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};document.addEventListener('pointerdown',close);document.addEventListener('keydown',esc);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',esc);};},[open]);
 const name=me?.name||'我';
 return <div className={`account-menu ${variant}`} ref={ref}>
  <button className="account-trigger" onClick={()=>setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label="账号菜单"><Avatar name={name} size={variant==='nav'?40:32}/>{variant==='nav'&&<><span className="account-names"><strong>{name}</strong><small>@{me?.username||''}</small></span><MoreHorizontal size={18}/></>}</button>
  {open&&<><div className="menu-scrim" onClick={()=>setOpen(false)}/><div className="menu account-pop" role="menu">
   <div className="menu-head"><Avatar name={name} size={40}/><span><strong>{name}</strong><small>@{me?.username||''}</small></span></div>
   <a role="menuitem" href="/account"><UserRound size={18}/>我的账号</a>
   <a role="menuitem" href="/shortcut"><Smartphone size={18}/>快捷指令</a>
   {me?.role==='admin'&&<a role="menuitem" href="/admin"><ShieldCheck size={18}/>管理后台</a>}
   <div className="menu-group"><span>阅读风格</span><StyleSwitch value={style} onChange={s=>{setStyle(s);setOpen(false);}}/></div>
   <button role="menuitem" onClick={async()=>{await requestJSON('/api/auth/logout',{});location.href='/login';}}><LogOut size={18}/>退出登录</button>
  </div></>}
 </div>;
}
