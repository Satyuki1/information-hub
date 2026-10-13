"use client";
import {UserRound,Smartphone,ShieldCheck,LogOut,MoreHorizontal,Rows3,LayoutGrid,Newspaper} from 'lucide-react';
import {useSession,useReadingStyle,requestJSON,type ReadingStyle} from './session';
import {Avatar,PopMenu} from './ui';
export const STYLES:[ReadingStyle,string,typeof Rows3][]=[['x','X',Rows3],['red','小红书',LayoutGrid],['news','头条',Newspaper]];
export function StyleSwitch({value,onChange}:{value:ReadingStyle;onChange:(s:ReadingStyle)=>void}){
 return <div className="segmented" role="radiogroup" aria-label="阅读风格">{STYLES.map(([id,label,Icon])=><button key={id} type="button" role="radio" aria-checked={value===id} className={value===id?'on':''} onClick={()=>onChange(id)}><Icon size={14}/>{label}</button>)}</div>;
}
// The one place to switch reading style, shared by every layout: avatar → menu (a sheet on phones).
export default function AccountMenu({variant='avatar'}:{variant?:'avatar'|'nav'}){
 const me=useSession();const[style,setStyle]=useReadingStyle(me);const name=me?.name||'我';
 const trigger=<><Avatar name={name} size={variant==='nav'?40:32}/>{variant==='nav'&&<><span className="account-names"><strong>{name}</strong><small>@{me?.username||''}</small></span><MoreHorizontal size={18}/></>}</>;
 return <div className={`account-menu ${variant}`}><PopMenu label="账号菜单" trigger={trigger} triggerClass="account-trigger" className={`account-pop pop-${variant}`} side={variant==='nav'?'top':'bottom'} align={variant==='nav'?'start':'end'} sheet>
  <div className="menu-head"><Avatar name={name} size={40}/><span><strong>{name}</strong><small>@{me?.username||''}</small></span></div>
  <a role="menuitem" href="/account"><UserRound size={18}/>我的账号</a>
  <a role="menuitem" href="/shortcut"><Smartphone size={18}/>快捷指令</a>
  {me?.role==='admin'&&<a role="menuitem" href="/admin"><ShieldCheck size={18}/>管理后台</a>}
  <div className="menu-group"><span>阅读风格</span><StyleSwitch value={style} onChange={setStyle}/></div>
  <button role="menuitem" onClick={async()=>{await requestJSON('/api/auth/logout',{});location.href='/login';}}><LogOut size={18}/>退出登录</button>
 </PopMenu></div>;
}
