"use client";
import {UserRound,Smartphone,ShieldCheck,LogOut,MoreHorizontal,Settings,BookOpen} from 'lucide-react';
import {useSession,requestJSON} from './session';
import {Avatar,PopMenu} from './ui';
export default function AccountMenu({variant='avatar'}:{variant?:'avatar'|'nav'}){
 const me=useSession();const name=me?.name||'我';
 const trigger=<><Avatar name={name} size={variant==='nav'?40:32}/>{variant==='nav'&&<><span className="account-names"><strong>{name}</strong><small>@{me?.username||''}</small></span><MoreHorizontal size={18}/></>}</>;
 return <div className={`account-menu ${variant}`}><PopMenu label="账号菜单" trigger={trigger} triggerClass="account-trigger" className={`account-pop pop-${variant}`} side={variant==='nav'?'top':'bottom'} align={variant==='nav'?'start':'end'} sheet>
  <div className="menu-head"><Avatar name={name} size={40}/><span><strong>{name}</strong><small>@{me?.username||''}</small></span></div>
  <a role="menuitem" href="/account"><UserRound size={18}/>我的账号</a>
  <a role="menuitem" href="/shortcut"><Smartphone size={18}/>快捷指令</a>
  <a role="menuitem" href="/settings"><Settings size={18}/>设置与导出</a>
  <a role="menuitem" href="/docs/zh/start"><BookOpen size={18}/>使用文档</a>
  {me?.role==='admin'&&<a role="menuitem" href="/admin"><ShieldCheck size={18}/>管理后台</a>}
  <button role="menuitem" onClick={async()=>{await requestJSON('/api/auth/logout',{});location.href='/login';}}><LogOut size={18}/>退出登录</button>
 </PopMenu></div>;
}
