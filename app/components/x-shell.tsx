"use client";
import {useState,type ReactNode} from 'react';
import {Home,Search,Bookmark,Radio,Newspaper,UserRound,ShieldCheck,Plus} from 'lucide-react';
import {useSession} from './session';
import Compose from './compose';
import AccountMenu from './account-menu';
import {LogoMark} from './brand';
import type {Article} from '../../lib/content';
export const NAV=[{id:'all',label:'首页',icon:Home,href:'/'},{id:'explore',label:'探索',icon:Search,href:'/?view=explore'},{id:'subs',label:'订阅',icon:Radio,href:'/?view=subs'},{id:'reports',label:'日报',icon:Newspaper,href:'/reports'},{id:'favorites',label:'收藏',icon:Bookmark,href:'/?view=favorites'},{id:'account',label:'我的',icon:UserRound,href:'/account'}];
// X layout: left navigation, one centre column, a quiet right column. Phones get a
// top bar (avatar menu + logo), a bottom tab bar and, on feeds, a single “+” button.
export default function XShell({children,aside,active='all',onNavigate,onCompose,topbar=false}:{children:ReactNode;aside?:ReactNode;active?:string;onNavigate?:(mode:string)=>void;onCompose?:()=>void;topbar?:boolean}){
 const me=useSession();const[open,setOpen]=useState(false);const compose=()=>onCompose?onCompose():setOpen(true);
 const nav=[...NAV,...(me?.role==='admin'?[{id:'admin',label:'管理',icon:ShieldCheck,href:'/admin'}]:[])];
 const go=(href:string,id:string)=>onNavigate&&href.startsWith('/?')||onNavigate&&href==='/'?(e:React.MouseEvent)=>{e.preventDefault();onNavigate(id);}:undefined;
 return <div className={`x-app ${aside?'':'no-aside'}`}>
  <header className="x-nav"><div className="x-nav-inner"><a href="/" className="x-logo" aria-label="information-hub 首页"><LogoMark size={30}/></a><nav aria-label="主要导航">{nav.map(({id,label,icon:Icon,href})=><a key={id} href={href} className={active===id?'active':''} aria-current={active===id?'page':undefined} onClick={go(href,id)}><Icon size={26} strokeWidth={active===id?2.5:1.75}/><span>{label}</span></a>)}</nav><button className="x-compose" onClick={compose} aria-label="收录"><Plus size={22} strokeWidth={2.5}/><span>收录</span></button><div className="x-nav-account"><AccountMenu variant="nav"/></div></div></header>
  <main className="x-main">{topbar&&<div className="x-topbar"><AccountMenu/><a href="/" aria-label="information-hub 首页"><LogoMark size={26}/></a><span/></div>}{children}</main>
  {aside&&<aside className="x-aside"><div className="x-aside-inner">{aside}</div></aside>}
  <nav className="x-tabbar" aria-label="手机导航">{NAV.slice(0,5).map(({id,label,icon:Icon,href})=><a key={id} href={href} aria-label={label} aria-current={active===id?'page':undefined} onClick={go(href,id)}><Icon size={24} strokeWidth={active===id?2.5:1.75}/></a>)}</nav>
  {onCompose&&<button className="x-fab" onClick={compose} aria-label="收录"><Plus size={26} strokeWidth={2.4}/></button>}
  {!onCompose&&<Compose open={open} onClose={()=>setOpen(false)} onSaved={(item:Article)=>{location.href=`/read/${item.id}`;}}/>}
 </div>;
}
