"use client";
import {useEffect,type ReactNode} from 'react';
import {Home,Newspaper,Smartphone,UserRound,ShieldCheck,Plus} from 'lucide-react';
import XShell,{UserAvatar} from './x-shell';
import {useSession,useReadingStyle} from './session';
// Secondary pages keep the reader's chosen frame: the X three-column shell, or a
// 小红书 / 头条 style top bar with the page content and side panels below it.
const LINKS=[{id:'all',href:'/',label:'首页',icon:Home},{id:'reports',href:'/reports',label:'日报',icon:Newspaper},{id:'shortcut',href:'/shortcut',label:'快捷指令',icon:Smartphone},{id:'account',href:'/account',label:'我的',icon:UserRound}];
const TITLES:Record<string,string>={reports:'每日日报',shortcut:'我的快捷指令',account:'我的账号',admin:'管理后台'};
export default function AppFrame({active,aside,children}:{active:string;aside?:ReactNode;children:ReactNode}){
 const me=useSession();const[style]=useReadingStyle(me);
 useEffect(()=>{if(TITLES[active])document.title=`${TITLES[active]} · 资讯汇集`;},[active]);
 if(style==='x')return <XShell active={active} aside={aside}>{children}</XShell>;
 const links=[...LINKS,...(me?.role==='admin'?[{id:'admin',href:'/admin',label:'后台',icon:ShieldCheck}]:[])];
 return <div className={`plain-app plain-${style}`}>
  <header className="plain-top"><div className="plain-top-inner"><a href="/" className={style==='red'?'red-logo':'news-logo'} aria-label="资讯汇集首页">{style==='red'?'资讯汇集':<><span>资讯</span>汇集</>}</a><nav aria-label="主要导航">{links.map(l=><a key={l.id} href={l.href} className={active===l.id?'active':''} aria-current={active===l.id?'page':undefined}>{l.label}</a>)}</nav><a href="/account" className="plain-avatar" aria-label="我的账号"><UserAvatar name={me?.name||'我'} size={32}/></a></div></header>
  <div className={`plain-body ${aside?'with-aside':''}`}><main className="plain-main">{children}</main>{aside&&<aside className="plain-aside">{aside}</aside>}</div>
  <nav className="mobile-nav plain-mobile-nav" aria-label="手机导航">{links.slice(0,2).map(l=><a key={l.id} href={l.href} aria-current={active===l.id?'page':undefined}><l.icon size={22}/><span>{l.label}</span></a>)}<a href="/" className="plain-plus" aria-label="回到首页收录"><Plus size={22}/></a>{links.slice(2,4).map(l=><a key={l.id} href={l.href} aria-current={active===l.id?'page':undefined}><l.icon size={22}/><span>{l.label}</span></a>)}</nav>
 </div>;
}
