"use client";
import {useEffect,useState} from 'react';
import {ArrowLeft,Sparkles,LoaderCircle,Share2,Radio} from 'lucide-react';
import AppFrame from '../../components/app-frame';
import Markdown from '../../markdown';
import {useSession,requestJSON} from '../../components/session';
import {Photo} from '../../components/media';
import {coverOf,authorOf,dayParts} from '../../../lib/content';
type Item={id:string;title:string;summary:string;category:string;source:string;sharer:string;score:number;coverUrl:string;original:string;sourceMeta:string;url?:string;originalAuthor?:string};
type Report={day:string;title:string;lead:string;content:string;item_count:number;status:string;error:string;model:string;updated_at:string};
export default function ReportView({day}:{day:string}){
 const me=useSession();const[data,setData]=useState<{report:Report|null;items:Item[]}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[toast,setToast]=useState('');
 useEffect(()=>{requestJSON(`/api/reports/${day}`).then(setData).catch(e=>setError(e.message));},[day]);
 async function regenerate(){setBusy(true);setError('');try{const d=await requestJSON(`/api/reports/${day}/generate`,{});if(d.report?.status==='failed')setError(d.report.error);setData(await requestJSON(`/api/reports/${day}`));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function share(){try{await navigator.clipboard.writeText(location.href);setToast('日报链接已复制');}catch{setToast('请从地址栏复制链接');}setTimeout(()=>setToast(''),3000);}
 const d=dayParts(day);const r=data?.report;
 const aside=data?.items.length?<section className="x-panel report-items-panel"><h2>本期收录 · {data.items.length}</h2>{data.items.slice(0,12).map(i=><a key={i.id} href={`/read/${i.id}`}><small>{i.category}{i.source==='subscription'?' · 订阅':''}{i.score>=0?` · 相关度 ${i.score}`:''}</small><strong>{i.title}</strong></a>)}</section>:null;
 return <AppFrame active="reports" aside={aside}>
  <header className="detail-header"><a className="icon-button" href="/reports" aria-label="返回日报列表"><ArrowLeft size={21}/></a><h1>每日日报</h1><button className="icon-button" onClick={share} aria-label="复制日报链接"><Share2 size={18}/></button></header>
  {error&&<p className="form-error" role="alert">{error}</p>}
  {!data?<div className="empty-state"><LoaderCircle className="spin"/></div>:!r||r.status!=='ready'?<div className="empty-state"><h2>{r?.status==='empty'?'当天没有新整理的资讯':'这一天的日报还没有生成'}</h2><p>{r?.error||'日报会在设定时间自动生成。'}</p>{me?.role==='admin'&&<button className="button primary" disabled={busy} onClick={regenerate}>{busy?<LoaderCircle size={16} className="spin"/>:<Sparkles size={16}/>}立即生成</button>}</div>:
  <article className="report-article">
   <div className="report-masthead"><span className="report-stamp"><strong>{d.date}</strong><small>{d.month} · {d.week}</small></span><div><span className="eyebrow">资讯汇集 · 每日日报 · {day}</span><h1>{r.title}</h1></div></div>
   {r.lead&&<p className="report-lead">{r.lead}</p>}
   <div className="report-meta"><span>{r.item_count} 条资讯</span><span>由 {r.model||'AI'} 生成</span><span>{new Date(r.updated_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} 更新</span>{me?.role==='admin'&&<button className="text-link" disabled={busy} onClick={regenerate}>{busy?'正在重新生成…':'重新生成'}</button>}</div>
   <div className="report-body"><Markdown text={r.content}/></div>
   {!!data.items.length&&<section className="report-gallery"><h2>本期资讯</h2><div>{data.items.slice(0,9).map(i=>{const cover=coverOf(i);const a=authorOf({...i,url:i.url||'',originalAuthor:i.originalAuthor||'',sharer:i.sharer});return <a key={i.id} href={`/read/${i.id}`} className="report-tile">{cover?<Photo src={cover} alt=""/>:<span className="report-tile-text">{i.category}</span>}<span><small>{i.source==='subscription'?<><Radio size={11}/>{i.sharer.replace('订阅 · ','')}</>:a.name}</small><strong>{i.title}</strong></span></a>;})}</div></section>}
   <p className="reading-caption">日报由 AI 根据站内已整理的资讯生成，请以原文为准。</p>
  </article>}
  {toast&&<div className="toast" role="status">{toast}</div>}
 </AppFrame>;
}
