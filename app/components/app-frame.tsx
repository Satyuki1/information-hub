"use client";
import {useEffect,type ReactNode} from 'react';
import {Home,Newspaper,Radio,UserRound,Plus} from 'lucide-react';
import XShell from './x-shell';
import AccountMenu from './account-menu';
import {useSession,useReadingStyle} from './session';
// Secondary pages keep the chosen layout: the X shell, or the 小红书 / 头条 top bar with the
// same page content underneath. Pages render their own PageHeader inside.
const LINKS=[{id:'all',href:'/',label:'首页',icon:Home},{id:'subs',href:'/?view=subs',label:'订阅',icon:Radio},{id:'reports',href:'/reports',label:'日报',icon:Newspaper},{id:'account',href:'/account',label:'我的',icon:UserRound}];
const TITLES:Record<string,string>={reports:'每日日报',shortcut:'快捷指令',account:'我的账号',admin:'管理后台'};
export default function AppFrame({active,aside,children}:{active:string;aside?:ReactNode;children:ReactNode}){
 const me=useSession();const[style]=useReadingStyle(me);
 useEffect(()=>{if(TITLES[active])document.title=`${TITLES[active]} · information-hub`;},[active]);
 if(style==='x')return <XShell active={active} aside={aside}>{children}</XShell>;
 const links=[...LINKS,...(me?.role==='admin'?[{id:'admin',href:'/admin',label:'管理',icon:UserRound}]:[])];
 return <div className={`plain-app plain-${style}`}>
  <header className="plain-top"><div className="plain-top-inner"><a href="/" className={style==='red'?'red-logo':'news-logo'} aria-label="首页">{style==='red'?'资讯汇集':<><span>资讯</span>汇集</>}</a><nav aria-label="主要导航">{links.map(l=><a key={l.id} href={l.href} className={active===l.id?'active':''} aria-current={active===l.id?'page':undefined}>{l.label}</a>)}</nav><AccountMenu/></div></header>
  <div className={`plain-body ${aside?'with-aside':''}`}><main className="plain-main">{children}</main>{aside&&<aside className="plain-aside">{aside}</aside>}</div>
  <nav className="plain-tabbar" aria-label="手机导航">{LINKS.slice(0,2).map(l=><a key={l.id} href={l.href} aria-current={active===l.id?'page':undefined}><l.icon size={22}/><span>{l.label}</span></a>)}<a href="/" className="plain-plus" aria-label="回到首页收录"><Plus size={22}/></a>{LINKS.slice(2).map(l=><a key={l.id} href={l.href} aria-current={active===l.id?'page':undefined}><l.icon size={22}/><span>{l.label}</span></a>)}</nav>
 </div>;
}
