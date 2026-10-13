"use client";
import {Search,X,Plus,RefreshCw,Bookmark,Flame,Smartphone,ShieldCheck,ArrowUpRight} from 'lucide-react';
import {TOPICS,imagesOf,topicOf,timeAgo,sourceLabel,hotOf,type Article} from '../../../lib/content';
import {Photo} from '../media';
import {UserAvatar,StyleSwitch,StyleMenu} from '../x-shell';
import {ReportCard} from '../report-card';
import {EmptyFeed,FeedSkeleton,MODE_LABEL,type FeedProps} from './shared';
// 今日头条-style news list: dense headlines, right thumbnail or a three-image strip, and a hot list.
const CHANNELS:[string,string][]=[['all','推荐'],['subs','订阅'],['favorites','收藏'],['mine','我的']];
export function NewsItem({item,onFavorite,rank}:{item:Article;onFavorite:()=>void;rank?:number}){
 const images=imagesOf(item);const layout=images.length>=3?'three':images.length?'single':'text';
 return <article className={`news-item ${layout}`}><div className="news-text"><a href={`/read/${item.id}`} className="news-title">{rank!==undefined&&<span className="news-rank">{rank}</span>}{item.title}</a>{layout==='three'&&<a href={`/read/${item.id}`} className="news-three" tabIndex={-1}>{images.slice(0,3).map(src=><Photo key={src} src={src} alt=""/>)}</a>}{layout==='text'&&item.summary&&<p className="news-summary">{item.summary}</p>}<div className="news-meta">{item.source==='subscription'&&<span className="news-tag">订阅</span>}{item.score>=80&&<span className="news-tag hot">热</span>}<span>{sourceLabel(item)}</span><span>{topicOf(item)}</span><span>{timeAgo(item.sharedAt)}</span><button className={item.favorite?'on':''} onClick={onFavorite} aria-label={item.favorite?'取消收藏':'收藏'} aria-pressed={!!item.favorite}><Bookmark size={13} fill={item.favorite?'currentColor':'none'}/>{item.favorite?'已收藏':'收藏'}</button></div></div>{layout==='single'&&<a href={`/read/${item.id}`} className="news-thumb" tabIndex={-1}><Photo src={images[0]} alt=""/></a>}</article>;
}
export default function NewsFeed(p:FeedProps){
 const hot=hotOf(p.all);
 const go=(id:string)=>(e:React.MouseEvent)=>{e.preventDefault();p.navigate(id);};
 return <div className="news-app">
  <header className="news-top"><div className="news-top-inner"><a href="/" className="news-logo" aria-label="资讯汇集首页"><span>资讯</span>汇集</a><form className="news-search" role="search" onSubmit={e=>e.preventDefault()}><input placeholder="搜索站内资讯" value={p.query} onChange={e=>p.setQuery(e.target.value)} aria-label="搜索资讯"/>{p.query&&<button type="button" className="news-clear" onClick={()=>p.setQuery('')} aria-label="清除搜索"><X size={15}/></button>}<button aria-label="搜索"><Search size={18}/></button></form><div className="news-top-actions"><span className="desk-only"><StyleSwitch value={p.style} onChange={p.setStyle}/></span><StyleMenu className="mobile-only" value={p.style} onChange={p.setStyle}/><button className="news-publish" onClick={p.compose}><Plus size={16}/><span>收录资讯</span></button><a href="/account" aria-label="我的账号"><UserAvatar name={p.me?.name||'我'} size={32}/></a></div></div></header>
  <div className="news-body">
   <aside className="news-channels"><nav aria-label="频道">{CHANNELS.map(([id,label])=><a key={id} href={id==='all'?'/':`/?view=${id}`} onClick={e=>{go(id)(e);p.choose('全部资讯');}} className={p.mode===id&&p.topic==='全部资讯'?'active':''}>{label}</a>)}<a href="/reports">日报</a>{TOPICS.map(t=><button key={t} className={p.topic===t?'active':''} onClick={()=>p.choose(t)}>{t.replace('人工智能','AI').replace('科技数码','科技').replace('商业财经','财经').replace('产品设计','设计').replace('行业观察','行业').replace('新资讯','综合')}</button>)}</nav><div className="news-channel-links"><a href="/shortcut"><Smartphone size={15}/>快捷指令</a>{p.me?.role==='admin'&&<a href="/admin"><ShieldCheck size={15}/>后台</a>}</div></aside>
   <main className="news-main">
    <div className="news-main-head"><h1>{p.topic!=='全部资讯'?p.topic:MODE_LABEL[p.mode]==='首页'?'推荐':MODE_LABEL[p.mode]}</h1>{p.query&&<span>“{p.query}” · {p.items.length} 条结果</span>}<button onClick={p.refresh} aria-label="刷新"><RefreshCw size={15} className={p.loading?'spin':''}/>刷新</button></div>
    {p.error&&<div className="form-error" role="alert">{p.error}<button onClick={p.refresh}>重试</button></div>}
    {p.loading&&!p.all.length?<FeedSkeleton kind="news"/>:!p.items.length?<EmptyFeed mode={p.mode} compose={p.compose}/>:p.items.map(i=><NewsItem key={i.id} item={i} onFavorite={()=>p.favorite(i)}/>)}
    {!!p.items.length&&<div className="feed-end">已加载全部 {p.items.length} 条</div>}
   </main>
   <aside className="news-side">
    <section className="news-hot"><h2><Flame size={18}/>汇集热榜</h2><ol>{hot.map((i,n)=><li key={i.id}><span className={n<3?'top':''}>{n+1}</span><a href={`/read/${i.id}`}>{i.title}</a></li>)}</ol>{!hot.length&&<p className="muted">整理完成的资讯会出现在这里。</p>}</section>
    <ReportCard className="news-panel"/>
    <section className="news-panel news-shortcut"><h2>一键收录</h2><p>下载你的专属快捷指令，在 X 里点分享，自动翻译并记在你名下。</p><a href="/shortcut" className="button primary">获取快捷指令<ArrowUpRight size={15}/></a></section>
   </aside>
  </div>
  <nav className="mobile-nav news-mobile-nav" aria-label="手机导航"><a href="/" onClick={go('all')} aria-current={p.mode==='all'?'page':undefined}>首页</a><a href="/reports">日报</a><button onClick={p.compose} aria-label="收录资讯"><Plus size={22}/></button><a href="/?view=favorites" onClick={go('favorites')} aria-current={p.mode==='favorites'?'page':undefined}>收藏</a><a href="/account">我的</a></nav>
 </div>;
}
