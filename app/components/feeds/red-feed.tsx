"use client";
import {Search,X,Compass,Radio,Newspaper,Heart,Plus,Bookmark,UserRound,ShieldCheck,RefreshCw} from 'lucide-react';
import {TOPICS,authorOf,coverOf,imagesOf,timeAgo,feedText,type Article} from '../../../lib/content';
import {Photo} from '../media';
import {Avatar} from '../ui';
import {hueOf} from '../session';
import AccountMenu from '../account-menu';
import SubsStrip from '../subs-strip';
import {EmptyFeed,FeedSkeleton,MODE_LABEL,type FeedProps} from './shared';
// 小红书-style discovery: channel chips, a masonry of cover-first notes and a light left rail.
const RATIOS=['3/4','4/5','1/1','3/4','4/5'];
const SIDE=[{id:'all',label:'发现',icon:Compass},{id:'subs',label:'订阅',icon:Radio},{id:'reports',label:'日报',icon:Newspaper},{id:'favorites',label:'收藏',icon:Bookmark},{id:'mine',label:'我的分享',icon:UserRound}];
export function RedCard({item,onFavorite}:{item:Article;onFavorite:()=>void}){
 const cover=coverOf(item)||imagesOf(item)[0];const a=authorOf(item);const hue=hueOf(item.id);
 return <article className="red-card"><a href={`/read/${item.id}`} className="red-cover" style={{['--ratio' as string]:RATIOS[hue%RATIOS.length]}}>{cover?<Photo src={cover} alt={item.title}/>:<span className="red-textcover" style={{['--hue' as string]:hue}}><span>{item.title}</span><small>{feedText(item.summary).slice(0,60)}</small></span>}{item.status!=='ready'&&<span className="red-badge">整理中</span>}</a><div className="red-meta"><a href={`/read/${item.id}`} className="red-title">{item.title}</a><div className="red-foot"><span className="red-author"><Avatar name={a.name} src={a.avatar} size={20}/><span>{a.name}</span></span><button className={`red-like ${item.favorite?'on':''}`} onClick={onFavorite} aria-label={item.favorite?'取消收藏':'收藏'} aria-pressed={!!item.favorite}><Heart size={14} fill={item.favorite?'currentColor':'none'}/><span>{timeAgo(item.sharedAt)}</span></button></div></div></article>;
}
export default function RedFeed(p:FeedProps){
 const go=(id:string)=>(e:React.MouseEvent)=>{if(id==='reports')return;e.preventDefault();p.navigate(id);};
 const href=(id:string)=>id==='reports'?'/reports':id==='all'?'/':`/?view=${id}`;
 return <div className="red-app">
  <header className="red-top"><a href="/" className="red-logo" aria-label="首页">资讯汇集</a><label className="red-search"><Search size={17}/><input placeholder="搜索" value={p.query} onChange={e=>p.setQuery(e.target.value)} aria-label="搜索资讯"/>{p.query&&<button onClick={()=>p.setQuery('')} aria-label="清除"><X size={15}/></button>}</label><div className="red-actions"><button className="red-publish" onClick={p.compose}><Plus size={18}/><span>收录</span></button><AccountMenu/></div></header>
  <div className="red-body">
   <aside className="red-side"><nav>{SIDE.map(({id,label,icon:Icon})=><a key={id} href={href(id)} className={p.mode===id?'active':''} onClick={go(id)}><Icon size={20}/><span>{label}</span></a>)}{p.me?.role==='admin'&&<a href="/admin"><ShieldCheck size={20}/><span>管理后台</span></a>}</nav></aside>
   <main className="red-main">
    {p.mode==='subs'?<div className="red-subs"><h1>订阅</h1><SubsStrip subs={p.subs} value={p.account} onChange={p.setAccount}/></div>:<nav className="red-channels" aria-label="资讯主题">{['全部资讯',...TOPICS].map(t=><button key={t} className={p.topic===t?'active':''} onClick={()=>p.choose(t)}>{t==='全部资讯'?'推荐':t}</button>)}<button className="red-refresh" onClick={p.refresh} aria-label="刷新"><RefreshCw size={16} className={p.loading?'spin':''}/></button></nav>}
    {p.mode!=='all'&&p.mode!=='subs'&&<h1 className="red-title-bar">{MODE_LABEL[p.mode]}</h1>}
    {p.error&&<p className="alert error" role="alert">{p.error}</p>}
    {p.loading&&!p.all.length?<FeedSkeleton kind="red"/>:!p.items.length?<EmptyFeed mode={p.mode} compose={p.compose}/>:<div className="red-masonry">{p.items.map(i=><RedCard key={i.id} item={i} onFavorite={()=>p.favorite(i)}/>)}</div>}
   </main>
  </div>
  <nav className="red-tabbar" aria-label="手机导航"><a href="/" onClick={go('all')} aria-current={p.mode==='all'?'page':undefined}>首页</a><a href="/?view=subs" onClick={go('subs')} aria-current={p.mode==='subs'?'page':undefined}>订阅</a><button className="red-tab-plus" onClick={p.compose} aria-label="收录"><Plus size={22}/></button><a href="/reports">日报</a><a href="/?view=favorites" onClick={go('favorites')} aria-current={p.mode==='favorites'?'page':undefined}>收藏</a></nav>
 </div>;
}
