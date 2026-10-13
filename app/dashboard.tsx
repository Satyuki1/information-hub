"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Search,X,Check,ArrowRight,CalendarDays} from 'lucide-react';
import {TOPICS,topicOf,dayOf,type Article} from '../lib/content';
import {api} from './components/common';
import XShell from './components/x-shell';
import Post from './components/post';
import Compose from './components/compose';
import {useSession,useReadingStyle} from './components/session';
import {MODES,MODE_LABEL,FeedSkeleton,EmptyFeed,type FeedProps} from './components/feeds/shared';
import RedFeed from './components/feeds/red-feed';
import NewsFeed from './components/feeds/news-feed';
import SubsStrip,{useSubscriptions} from './components/subs-strip';
import {Avatar,PageHeader,Tabs} from './components/ui';
import {ReportCard} from './components/report-card';
export default function Dashboard(){
 const me=useSession();const[style]=useReadingStyle(me);const subs=useSubscriptions();
 const[items,setItems]=useState<Article[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[topic,setTopic]=useState('全部资讯'),[query,setQuery]=useState(''),[mode,setMode]=useState('all'),[date,setDate]=useState(''),[account,setAccount]=useState(''),[open,setOpen]=useState(false),[toast,setToast]=useState('');const search=useRef<HTMLInputElement>(null);
 const refresh=useCallback(async()=>{try{setItems((await api('/api/shares')).items);setError('');}catch(e){setError((e as Error).message);}finally{setLoading(false);}},[]);
 useEffect(()=>{const p=new URLSearchParams(location.search);if((TOPICS as readonly string[]).includes(p.get('topic')||''))setTopic(p.get('topic')!);if(MODES.includes(p.get('view')||''))setMode(p.get('view')!);if(p.get('q'))setQuery(p.get('q')!);if(p.get('account'))setAccount(p.get('account')!);refresh();const timer=setInterval(refresh,20000);return()=>clearInterval(timer);},[refresh]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),3500);return()=>clearTimeout(timer);},[toast]);
 const counts=useMemo(()=>Object.fromEntries(TOPICS.map(t=>[t,items.filter(i=>topicOf(i)===t).length])),[items]);
 const q=query.trim().toLowerCase();
 const filtered=items.filter(i=>(topic==='全部资讯'||topicOf(i)===topic)&&(mode!=='favorites'||!!i.favorite)&&(mode!=='subs'||(i.source==='subscription'&&(!account||i.subscriptionId===account)))&&(mode!=='mine'||(!!me&&i.sharerId===me.id))&&(!date||dayOf(i.sharedAt)===date)&&(!q||[i.title,i.original,i.translation,i.summary,i.tags,i.sharer,i.originalAuthor,i.analysis].join(' ').toLowerCase().includes(q)));
 function navigate(next:string){setMode(next);setQuery('');setDate('');setTopic('全部资讯');setAccount('');history.replaceState(null,'',next==='all'?'/':`/?view=${next}`);window.scrollTo({top:0});if(next==='explore')setTimeout(()=>search.current?.focus(),50);}
 function choose(next:string){setTopic(next);if(!['subs','favorites','mine','explore'].includes(mode))setMode('all');window.scrollTo({top:0});}
 function pickAccount(id:string){setAccount(id);history.replaceState(null,'',id?`/?view=subs&account=${id}`:'/?view=subs');window.scrollTo({top:0});}
 async function favorite(i:Article){try{const result=await api(`/api/shares/${i.id}`,{favorite:!i.favorite},'PATCH');setItems(p=>p.map(x=>x.id===i.id?result.item:x));setToast(i.favorite?'已取消收藏':'已收藏');}catch(e){setToast((e as Error).message);}}
 function saved(i:Article,duplicate:boolean){setItems(p=>[i,...p.filter(x=>x.id!==i.id)]);setToast(duplicate?'这条资讯已经收录过':'已收录，正在整理翻译');if(mode!=='all')navigate('all');}
 const props:FeedProps={items:filtered,all:items,loading,error,refresh,topic,choose,query,setQuery,mode,navigate,favorite,compose:()=>setOpen(true),counts,message:setToast,me,style,date,setDate,subs,account,setAccount:pickAccount};
 const overlays=<><Compose open={open} onClose={()=>setOpen(false)} onSaved={saved}/>{toast&&<div className="toast" role="status"><Check size={16}/>{toast}</div>}</>;
 if(style==='red')return <><RedFeed {...props}/>{overlays}</>;
 if(style==='news')return <><NewsFeed {...props}/>{overlays}</>;
 const searchBox=(inFeed=false)=><label className="search"><Search size={18}/><input ref={inFeed?search:undefined} placeholder="搜索资讯" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!inFeed&&mode!=='explore'){setMode('explore');history.replaceState(null,'','/?view=explore');}}} aria-label="搜索资讯"/>{query&&<button onClick={()=>setQuery('')} aria-label="清除"><X size={16}/></button>}</label>;
 const activeSubs=(subs||[]).filter(s=>s.enabled).slice(0,5);
 const aside=<>{mode!=='explore'&&searchBox()}
  {!!activeSubs.length&&<section className="aside-card"><h2>订阅账号</h2>{activeSubs.map(s=><a key={s.id} className="aside-row" href={`/?view=subs&account=${s.id}`} onClick={e=>{e.preventDefault();setMode('subs');pickAccount(s.id);}}><Avatar name={s.name||s.handle} src={s.avatar} size={40}/><span><strong>{s.name||s.handle}</strong><small>@{s.handle}</small></span><em>{s.items}</em></a>)}<a className="aside-more" href="/?view=subs" onClick={e=>{e.preventDefault();navigate('subs');}}>查看全部</a></section>}
  <ReportCard/>
  <footer className="aside-foot"><a href="/welcome">关于</a><a href="/guide">快捷指令教程</a><span>北京时间 UTC+8</span></footer></>;
 const tabs:[string,string][]=[['全部资讯','全部'],...TOPICS.map(t=>[t,t] as [string,string])];
 return <><XShell active={mode} onNavigate={navigate} onCompose={()=>setOpen(true)} aside={aside} topbar={mode==='all'}>
  {mode==='all'?<div className="sticky-head"><PageHeader title="首页" className="desk-only"/><Tabs label="资讯主题" items={tabs} value={topic} onChange={choose}/></div>:
   <div className="sticky-head"><PageHeader title={MODE_LABEL[mode]} sub={mode==='subs'&&account?subs?.find(s=>s.id===account)?.name:undefined} back="/"/>
    {mode==='explore'&&<div className="explore-bar">{searchBox(true)}<div className="chips">{tabs.map(([id,label])=><button key={id} className={`chip ${topic===id?'on':''}`} onClick={()=>setTopic(id)}>{label}{id!=='全部资讯'&&<em>{counts[id]}</em>}</button>)}</div><label className="date-filter"><CalendarDays size={16}/><input type="date" value={date} onChange={e=>setDate(e.target.value)} aria-label="按日期筛选"/>{date&&<button onClick={()=>setDate('')} aria-label="清除日期"><X size={14}/></button>}</label></div>}
    {mode==='subs'&&<SubsStrip subs={subs} value={account} onChange={pickAccount}/>}
   </div>}
  {error&&<p className="alert error" role="alert">{error} <button className="link" onClick={refresh}>重试</button></p>}
  {loading&&!items.length?<FeedSkeleton/>:!filtered.length?<EmptyFeed mode={mode} compose={()=>setOpen(true)}/>:<>{filtered.map(i=><Post key={i.id} item={i} onFavorite={()=>favorite(i)} onMessage={setToast}/>)}<p className="feed-end">{q?`共 ${filtered.length} 条结果`:'没有更多了'}</p></>}
  {mode==='subs'&&me?.role==='admin'&&<p className="feed-end"><a className="link" href="/admin?tab=subscriptions">管理订阅账号 <ArrowRight size={14}/></a></p>}
 </XShell>{overlays}</>;
}
