"use client";
import {useLibrary} from '../../components/library';
import {useEffect,useState} from "react";
import {ArrowUpRight,Bookmark,Check,Download,FileText,Languages,LoaderCircle,Cloud,Target,Type} from "lucide-react";
import {coverOf,topicOf,dateLabel,sourceOf,tagsOf,timelineOf,STATUS,type Article} from "../../../lib/content";
import {api} from "../../components/common";
import Markdown from "../../markdown";
import AppFrame from "../../components/app-frame";
import {Avatar,Author,PostActions} from "../../components/post";
import {PageHeader} from "../../components/ui";
import {useSession,requestJSON} from '../../components/session';
import MediaGrid from "../../components/media";
type Tab='translation'|'original'|'parallel';
export default function Reader({initial,related}:{initial:Article;related:Article[]}){
 const useTopics=useLibrary().topics.map(t=>t.name);const me=useSession();const[archive,setArchive]=useState<{state:string;finished_at:string;error:string}|null>(null);
 useEffect(()=>{requestJSON('/api/feishu/status').then(d=>setArchive(d.jobs.find((j:{share_id:string})=>j.share_id===initial.id)||null)).catch(()=>{});},[initial.id]);
 const[item,setItem]=useState(initial),[tab,setTab]=useState<Tab>(initial.translation?'translation':'original'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[editing,setEditing]=useState(false),[draft,setDraft]=useState(initial.original),[large,setLarge]=useState(false);
 useEffect(()=>{if(item.status==='ready')return;const timer=setInterval(()=>api(`/api/shares/${item.id}`).then(d=>setItem(d.item)).catch(()=>{}),15000);return()=>clearInterval(timer);},[item.id,item.status]);
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),4000);return()=>clearTimeout(timer);},[message]);
 useEffect(()=>{const t=new URLSearchParams(location.search).get('tab');if(t==='original'||t==='translation')setTab(t);},[]);
 const events=[...timelineOf(item).filter((e,n)=>n<2||!!e.time),{title:'我的飞书归档',time:archive?.finished_at||'',detail:archive?.state==='done'?'已写入当天知识库文档':archive?.error||(['pending','writing'].includes(archive?.state||'')?'等待后台写入':'尚未保存到飞书'),state:archive?.state==='done'?'done':archive?.state==='uncertain'||archive?.state==='failed'?'error':'waiting'}];
 const preview=item.contentKind==='x_preview';const topic=topicOf(item);const cover=coverOf(item);
 async function favorite(){try{setItem((await api(`/api/shares/${item.id}`,{favorite:!item.favorite},'PATCH')).item);}catch(e){setMessage((e as Error).message);}}
 async function translate(){setBusy(true);try{setItem({...item,status:'processing'});const d=await api(`/api/shares/${item.id}/process`,{});setItem(d.item);setMessage(d.item.status==='ready'?'摘要与译文已生成':d.item.error||'正在整理');if(d.item.status==='ready')setTab('translation');}catch(e){setMessage((e as Error).message);try{setItem((await api(`/api/shares/${item.id}`)).item);}catch{}}finally{setBusy(false);}}
 async function saveSettings(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);try{setItem((await api(`/api/shares/${item.id}`,Object.fromEntries(new FormData(e.currentTarget)),'PATCH')).item);setMessage('已保存');}catch(err){setMessage((err as Error).message);}finally{setBusy(false);}}
 async function saveBody(e:React.FormEvent){e.preventDefault();setBusy(true);try{const d=await api(`/api/shares/${item.id}`,{original:draft},'PATCH');setItem(d.item);setEditing(false);setMessage('原文已保存，后台会重新整理');}catch(err){setMessage((err as Error).message);}finally{setBusy(false);}}
 async function copyLink(){try{await navigator.clipboard.writeText(location.origin+`/read/${item.id}`);setMessage('阅读链接已复制');}catch{setMessage('请从地址栏复制链接');}}
 async function archiveNow(){setBusy(true);try{const d=await requestJSON('/api/feishu/export',{shareId:item.id});setMessage(d.message);const s=await requestJSON('/api/feishu/status');setArchive(s.jobs.find((j:{share_id:string})=>j.share_id===item.id)||null);}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 // The body often repeats the title as its first heading; the page already shows it.
 const untitled=(text:string)=>{const m=text.match(/^\s*#{1,3}\s+(.+)\n+/);return m&&m[1].trim()===item.title.trim()?text.slice(m[0].length):text;};
 const body=(kind:'original'|'translation')=>{const text=untitled(kind==='original'?item.original:item.translation);return <div className="reading-body">{tab==='parallel'&&<h3 className="reading-label">{kind==='original'?'原文':'中文译文'}</h3>}{text?<Markdown text={text}/>:<div className="reading-empty"><p>{kind==='original'?'暂未获取到原文。':item.error||'中文译文整理中，完成后显示在这里。'}</p>{me?.role==='admin'&&(kind==='original'?<button className="btn btn-secondary btn-sm" onClick={()=>setEditing(true)}>补充正文</button>:item.status!=='processing'&&<button className="btn btn-primary btn-sm" disabled={busy} onClick={translate}>{busy&&<LoaderCircle size={14} className="spin"/>}生成译文</button>)}</div>}</div>;};
 const timeline=<ol className="timeline">{events.map(event=><li className={event.state} key={event.title}><span className="timeline-dot">{event.state==='done'&&<Check size={10}/>}</span><div><strong>{event.title}</strong>{event.time&&<time dateTime={event.time}>{dateLabel(event.time,true)}</time>}<p>{event.detail}</p></div></li>)}</ol>;
 const aside=<><section className="aside-card"><h2>来源</h2><div className="aside-source"><strong>{sourceOf(item)}</strong><small>{item.originalAuthor||item.sharer}</small>{item.url&&<a className="link" href={item.url} target="_blank" rel="noopener noreferrer">查看原帖 <ArrowUpRight size={13}/></a>}</div></section>
  {!!related.length&&<section className="aside-card"><h2>继续阅读</h2>{related.map(i=><a key={i.id} className="aside-link" href={`/read/${i.id}`}><small>{topicOf(i)} · {dateLabel(i.sharedAt)}</small><strong>{i.title}</strong></a>)}</section>}</>;
 return <><AppFrame active="" aside={aside}>
  <PageHeader title={item.contentKind==='x_article'?'文章':'资讯'} back actions={<button className={`icon-btn ${item.favorite?'on':''}`} onClick={favorite} aria-label={item.favorite?'取消收藏':'收藏'}><Bookmark size={20} fill={item.favorite?'currentColor':'none'}/></button>}/>
  <article className="reader">
   <div className="reader-author"><Avatar item={item} size={44}/><Author item={item} detail/>{item.url&&<a href={item.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">原帖<ArrowUpRight size={14}/></a>}</div>
   <h1 className="reader-title">{item.title}</h1>
   <p className="reader-meta"><a href={`/?topic=${encodeURIComponent(topic)}`}>{topic}</a><span>·</span><span>{item.source==='subscription'?`${item.sharer} · 抓取`:`${item.sharer} 分享`}</span><span>·</span><time>{dateLabel(item.sharedAt,true)}</time>{item.status!=='ready'&&<span className="badge">{STATUS[item.status]}</span>}</p>
   {item.contentKind==='x_article'&&cover&&<div className="reader-cover"><MediaGrid images={[cover]} title={item.title}/></div>}
   {item.note&&<blockquote className="reader-note"><strong>{item.sharer} 的备注</strong>{item.note}</blockquote>}
   {item.summary&&(item.translation||item.original).length>280&&<section className="reader-block"><h2>摘要</h2><p>{item.summary}</p></section>}
   {item.analysis&&<section className="reader-block analysis"><h2><Target size={15}/>定向分析{item.score>=0&&<span className="badge accent">相关度 {item.score}</span>}</h2><Markdown text={item.analysis}/></section>}
   {preview&&<p className="notice"><FileText size={15}/>这是 X 的公开预览摘录，可能不含完整长文、图片或视频。</p>}
   <div className="reader-tabs"><div role="tablist" aria-label="原文与译文">{([['translation','中文'],['original','原文'],['parallel','对照']] as [Tab,string][]).map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</div><button className={`icon-btn ${large?'on':''}`} onClick={()=>setLarge(!large)} aria-pressed={large} aria-label="调整字号"><Type size={17}/></button><a className="icon-btn" href={`/api/shares/${item.id}/markdown`} aria-label="下载 Markdown"><Download size={17}/></a></div>
   <div role="tabpanel" className={`reading ${tab==='parallel'?'parallel':''} ${large?'large':''}`}>{tab==='parallel'?<>{body('original')}{body('translation')}</>:body(tab)}</div>
   {!!tagsOf(item).length&&<div className="reader-tags">{tagsOf(item).map(t=><a key={t} href={`/?view=explore&q=${encodeURIComponent(t)}`}>#{t}</a>)}</div>}
   <PostActions item={item} onFavorite={favorite} onShare={copyLink}/>
   <div className="reader-archive"><button className="btn btn-secondary btn-sm" disabled={busy||item.status!=='ready'} onClick={archiveNow}><Cloud size={15}/>保存到我的飞书</button><a className="link" href="/account">飞书设置</a></div>
   <details className="reader-fold" id="timeline"><summary>资讯时间轴</summary>{timeline}</details>
   {me?.role==='admin'&&<details className="reader-fold"><summary>内容管理</summary>
    <form onSubmit={saveSettings} className="form-grid"><label className="field"><span>主题</span><select name="category" defaultValue={topic} key={topic} className="select">{useTopics.map(t=><option key={t}>{t}</option>)}</select></label><label className="field"><span>封面图片</span><input name="coverUrl" type="url" maxLength={2048} defaultValue={item.coverUrl} placeholder="HTTPS 图片地址" key={item.coverUrl} className="input"/></label><div><button className="btn btn-secondary btn-sm" disabled={busy}>保存</button></div></form>
    {editing?<form onSubmit={saveBody} className="reader-editor"><label className="field"><span>原文（Markdown）</span><textarea value={draft} onChange={e=>setDraft(e.target.value)} maxLength={12000} rows={10} required className="textarea"/></label><div className="row-actions"><button type="button" className="btn btn-ghost btn-sm" onClick={()=>setEditing(false)}>取消</button><button className="btn btn-primary btn-sm" disabled={busy}>保存并重新整理</button></div></form>:<div className="row-actions"><button className="btn btn-ghost btn-sm" onClick={()=>{setDraft(item.original);setEditing(true);}}>编辑原文</button>{item.status!=='ready'&&item.status!=='processing'&&<button className="btn btn-secondary btn-sm" onClick={translate} disabled={busy}><Languages size={14}/>重试整理</button>}</div>}
   </details>}
  </article>
  {!!related.length&&<section className="reader-related narrow-only"><h2>继续阅读</h2>{related.map(i=><a href={`/read/${i.id}`} key={i.id}><strong>{i.title}</strong><small>{topicOf(i)} · {dateLabel(i.sharedAt)}</small></a>)}</section>}
 </AppFrame>{message&&<div className="toast" role="status"><Check size={16}/>{message}</div>}</>;
}
