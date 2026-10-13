"use client";
import {Search,X,Plus,RefreshCw,Bookmark,Flame} from 'lucide-react';
import {TOPICS,imagesOf,topicOf,timeAgo,sourceLabel,hotOf,type Article} from '../../../lib/content';
import {Photo} from '../media';
import AccountMenu from '../account-menu';
import SubsStrip from '../subs-strip';
import {ReportCard} from '../report-card';
import {EmptyFeed,FeedSkeleton,MODE_LABEL,type FeedProps} from './shared';
// 今日头条-style news list: dense headlines, a right thumbnail or a three-image strip, a hot list.
const CHANNELS:[string,string][]=[['all','推荐'],['subs','订阅'],['favorites','收藏'],['mine','我的']];
const SHORT:Record<string,string>={'人工智能':'AI','科技数码':'科技','商业财经':'财经','产品设计':'设计','行业观察':'行业','新资讯':'综合'};
export function NewsItem({item,onFavorite}:{item:Article;onFavorite:()=>void}){
 const images=imagesOf(item);const layout=images.length>=3?'three':images.length?'single':'text';
 return <article className={`news-item ${layout}`}><div className="news-text"><a href={`/read/${item.id}`} className="news-title">{item.title}</a>{layout==='three'&&<a href={`/read/${item.id}`} className="news-three" tabIndex={-1}>{images.slice(0,3).map(src=><Photo key={src} src={src} alt=""/>)}</a>}{layout==='text'&&item.summary&&<p className="news-summary">{item.summary}</p>}<div className="news-meta">{item.score>=80&&<span className="news-tag">热</span>}<span>{sourceLabel(item)}</span><span>{topicOf(item)}</span><span>{timeAgo(item.sharedAt)}</span><button className={item.favorite?'on':''} onClick={onFavorite} aria-label={item.favorite?'取消收藏':'收藏'} aria-pressed={!!item.favorite}><Bookmark size={14} fill={item.favorite?'currentColor':'none'}/></button></div></div>{layout==='single'&&<a href={`/read/${item.id}`} className="news-thumb" tabIndex={-1}><Photo src={images[0]} alt=""/></a>}</article>;
}
export default function NewsFeed(p:FeedProps){
 const hot=hotOf(p.all);const go=(id:string)=>(e:React.MouseEvent)=>{e.preventDefault();p.navigate(id);};
 return <div className="news-app">
  <header className="news-top"><div className="news-top-inner"><a href="/" className="news-logo" aria-label="首页"><span>资讯</span>汇集</a><form className="news-search" role="search" onSubmit={e=>e.preventDefault()}><input placeholder="搜索站内资讯" value={p.query} onChange={e=>p.setQuery(e.target.value)} aria-label="搜索资讯"/>{p.query&&<button type="button" className="news-clear" onClick={()=>p.setQuery('')} aria-label="清除"><X size={15}/></button>}<button className="news-go" aria-label="搜索"><Search size={18}/></button></form><div className="news-actions"><button className="news-publish" onClick={p.compose}><Plus size={16}/><span>收录</span></button><AccountMenu/></div></div></header>
  <div className="news-body">
   <aside className="news-channels"><nav aria-label="频道">{CHANNELS.map(([id,label])=><a key={id} href={id==='all'?'/':`/?view=${id}`} onClick={e=>{go(id)(e);p.choose('全部资讯');}} className={p.mode===id&&p.topic==='全部资讯'?'active':''}>{label}</a>)}<a href="/reports">日报</a>{TOPICS.map(t=><button key={t} className={p.topic===t?'active':''} onClick={()=>p.choose(t)}>{SHORT[t]||t}</button>)}</nav></aside>
   <main className="news-main">
    <div className="news-head"><h1>{p.topic!=='全部资讯'?p.topic:p.mode==='all'?'推荐':MODE_LABEL[p.mode]}</h1>{p.query&&<span>“{p.query}” {p.items.length} 条</span>}<button onClick={p.refresh} aria-label="刷新"><RefreshCw size={14} className={p.loading?'spin':''}/>刷新</button></div>
    {p.mode==='subs'&&<SubsStrip subs={p.subs} value={p.account} onChange={p.setAccount}/>}
    {p.error&&<p className="alert error" role="alert">{p.error}</p>}
    {p.loading&&!p.all.length?<FeedSkeleton kind="news"/>:!p.items.length?<EmptyFeed mode={p.mode} compose={p.compose}/>:p.items.map(i=><NewsItem key={i.id} item={i} onFavorite={()=>p.favorite(i)}/>)}
   </main>
   <aside className="news-side"><section className="news-panel"><h2><Flame size={16}/>热榜</h2><ol className="news-hot">{hot.map((i,n)=><li key={i.id}><span className={n<3?'top':''}>{n+1}</span><a href={`/read/${i.id}`}>{i.title}</a></li>)}</ol>{!hot.length&&<p className="aside-empty">整理完成的资讯会出现在这里。</p>}</section><ReportCard className="news-panel"/></aside>
  </div>
  <nav className="news-tabbar" aria-label="手机导航"><a href="/" onClick={go('all')} aria-current={p.mode==='all'?'page':undefined}>首页</a><a href="/?view=subs" onClick={go('subs')} aria-current={p.mode==='subs'?'page':undefined}>订阅</a><button onClick={p.compose} aria-label="收录"><Plus size={22}/></button><a href="/reports">日报</a><a href="/?view=favorites" onClick={go('favorites')} aria-current={p.mode==='favorites'?'page':undefined}>收藏</a></nav>
 </div>;
}
