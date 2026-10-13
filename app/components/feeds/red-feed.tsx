"use client";
import {Search,X,Compass,Radio,Newspaper,Heart,Plus,Smartphone,UserRound,ShieldCheck,RefreshCw,Bookmark} from 'lucide-react';
import {TOPICS,authorOf,coverOf,imagesOf,timeAgo,feedText,type Article} from '../../../lib/content';
import {Photo} from '../media';
import {UserAvatar,StyleSwitch,StyleMenu} from '../x-shell';
import {hueOf} from '../session';
import {ReportCard} from '../report-card';
import {EmptyFeed,FeedSkeleton,MODE_LABEL,type FeedProps} from './shared';
// 小红书-style discovery: channel chips, a masonry of cover-first notes and a light left rail.
const RATIOS=['3/4','4/5','1/1','3/4','4/5'];
const SIDE=[{id:'all',label:'发现',icon:Compass},{id:'subs',label:'订阅',icon:Radio},{id:'reports',label:'日报',icon:Newspaper,href:'/reports'},{id:'favorites',label:'收藏',icon:Bookmark},{id:'mine',label:'我的分享',icon:UserRound}];
export function RedCard({item,onFavorite}:{item:Article;onFavorite:()=>void}){
 const cover=coverOf(item)||imagesOf(item)[0];const a=authorOf(item);const hue=hueOf(item.id);
 return <article className="red-card"><a href={`/read/${item.id}`} className="red-cover" style={{['--ratio' as string]:RATIOS[hue%RATIOS.length]}}>{cover?<Photo src={cover} alt={item.title}/>:<span className="red-textcover" style={{['--hue' as string]:hue}}><span>{item.title}</span><small>{feedText(item.summary).slice(0,60)}</small></span>}{item.source==='subscription'&&<span className="red-badge">订阅</span>}{item.status!=='ready'&&<span className="red-badge pending">整理中</span>}</a><div className="red-meta"><a href={`/read/${item.id}`} className="red-title">{item.title}</a><div className="red-foot"><span className="red-author">{a.avatar?<Photo src={a.avatar} alt="" className="red-avatar"/>:<UserAvatar name={a.name} size={20}/>}<span>{a.name}</span></span><button className={`red-like ${item.favorite?'on':''}`} onClick={onFavorite} aria-label={item.favorite?'取消收藏':'收藏'} aria-pressed={!!item.favorite}><Heart size={15} fill={item.favorite?'currentColor':'none'}/><span>{item.favorite?'已收藏':timeAgo(item.sharedAt)}</span></button></div></div></article>;
}
export default function RedFeed(p:FeedProps){
 const go=(id:string)=>(e:React.MouseEvent)=>{e.preventDefault();p.navigate(id);};
 return <div className="red-app">
  <header className="red-top"><a href="/" className="red-logo" aria-label="资讯汇集首页">资讯汇集</a><label className="red-search"><input placeholder="搜索资讯、作者或关键词" value={p.query} onChange={e=>p.setQuery(e.target.value)} aria-label="搜索资讯"/>{p.query?<button onClick={()=>p.setQuery('')} aria-label="清除搜索"><X size={16}/></button>:<Search size={18}/>}</label><div className="red-top-actions"><span className="desk-only"><StyleSwitch value={p.style} onChange={p.setStyle}/></span><StyleMenu className="mobile-only" value={p.style} onChange={p.setStyle}/><button className="red-publish" onClick={p.compose}><Plus size={18}/><span>收录</span></button><a href="/account" aria-label="我的账号"><UserAvatar name={p.me?.name||'我'} size={34}/></a></div></header>
  <div className="red-body">
   <aside className="red-side"><nav>{SIDE.map(({id,label,icon:Icon})=><a key={id} href={id==='reports'?'/reports':id==='all'?'/':`/?view=${id}`} className={p.mode===id?'active':''} onClick={id==='reports'?undefined:go(id)}><Icon size={20}/><span>{label}</span></a>)}<a href="/shortcut"><Smartphone size={20}/><span>快捷指令</span></a>{p.me?.role==='admin'&&<a href="/admin"><ShieldCheck size={20}/><span>管理后台</span></a>}</nav><ReportCard className="red-side-card"/></aside>
   <main className="red-main">
    <nav className="red-channels" aria-label="资讯主题">{['全部资讯',...TOPICS].map(t=><button key={t} className={p.topic===t?'active':''} onClick={()=>p.choose(t)}>{t==='全部资讯'?'推荐':t}</button>)}<button className="red-refresh" onClick={p.refresh} aria-label="刷新"><RefreshCw size={16} className={p.loading?'spin':''}/></button></nav>
    {p.mode!=='all'&&<div className="red-intro"><h1>{MODE_LABEL[p.mode]}</h1><span>{p.items.length} 篇笔记</span></div>}
    {p.query&&<p className="red-result">找到 {p.items.length} 条与「{p.query}」相关的资讯</p>}
    {p.error&&<div className="form-error" role="alert">{p.error}<button onClick={p.refresh}>重试</button></div>}
    {p.loading&&!p.all.length?<FeedSkeleton kind="red"/>:!p.items.length?<EmptyFeed mode={p.mode} compose={p.compose}/>:<div className="red-masonry">{p.items.map(i=><RedCard key={i.id} item={i} onFavorite={()=>p.favorite(i)}/>)}</div>}
   </main>
  </div>
  <nav className="mobile-nav red-mobile-nav" aria-label="手机导航"><a href="/" onClick={go('all')} aria-current={p.mode==='all'?'page':undefined}>首页</a><a href="/reports">日报</a><button className="red-mobile-plus" onClick={p.compose} aria-label="收录资讯"><Plus size={22}/></button><a href="/?view=favorites" onClick={go('favorites')} aria-current={p.mode==='favorites'?'page':undefined}>收藏</a><a href="/account">我</a></nav>
 </div>;
}
