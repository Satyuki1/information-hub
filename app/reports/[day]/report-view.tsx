"use client";
import {useEffect,useState} from 'react';
import {LoaderCircle,Share} from 'lucide-react';
import AppFrame from '../../components/app-frame';
import Markdown from '../../markdown';
import {useSession,requestJSON} from '../../components/session';
import {Photo} from '../../components/media';
import {PageHeader,Empty,Skeleton} from '../../components/ui';
import {dayParts} from '../../../lib/content';
type Item={id:string;title:string;summary:string;category:string;source:string;sharer:string;score:number;coverUrl:string};
type Report={day:string;title:string;lead:string;content:string;item_count:number;status:string;error:string;model:string;updated_at:string};
export default function ReportView({day}:{day:string}){
 const me=useSession();const[data,setData]=useState<{report:Report|null;items:Item[]}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[toast,setToast]=useState('');
 useEffect(()=>{requestJSON(`/api/reports/${day}`).then(setData).catch(e=>setError(e.message));},[day]);
 async function regenerate(){setBusy(true);setError('');try{const d=await requestJSON(`/api/reports/${day}/generate`,{});if(d.report?.status==='failed')setError(d.report.error);setData(await requestJSON(`/api/reports/${day}`));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function share(){try{await navigator.clipboard.writeText(location.href);setToast('链接已复制');}catch{setToast('请从地址栏复制链接');}setTimeout(()=>setToast(''),2500);}
 const d=dayParts(day);const r=data?.report;
 return <AppFrame active="reports" aside={data?.items.length?<section className="aside-card"><h2>本期资讯 · {data.items.length}</h2>{data.items.slice(0,10).map(i=><a key={i.id} className="aside-link" href={`/read/${i.id}`}><small>{i.category}{i.score>=0?` · 相关度 ${i.score}`:''}</small><strong>{i.title}</strong></a>)}</section>:undefined}>
  <PageHeader title="日报" sub={`${day} ${d.week}`} back="/reports" actions={<button className="icon-btn" onClick={share} aria-label="复制链接"><Share size={18}/></button>}/>
  {error&&<p className="alert error" role="alert">{error}</p>}
  {!data?<Skeleton/>:!r||r.status!=='ready'?<Empty title={r?.status==='empty'?'当天没有整理完成的资讯':'这一天还没有日报'} text={r?.error||'日报会在设定时间自动生成。'} action={me?.role==='admin'?<button className="btn btn-primary" disabled={busy} onClick={regenerate}>{busy&&<LoaderCircle size={15} className="spin"/>}立即生成</button>:undefined}/>:
  <article className="report">
   <p className="report-kicker">{d.month}{d.date}日 · {d.week} · 每日日报</p>
   <h1>{r.title}</h1>
   {r.lead&&<p className="report-lead">{r.lead}</p>}
   <p className="report-meta"><span>{r.item_count} 条资讯</span><span>{r.model||'AI'} 生成</span><span>{new Date(r.updated_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} 更新</span>{me?.role==='admin'&&<button className="link" disabled={busy} onClick={regenerate}>{busy?'正在生成…':'重新生成'}</button>}</p>
   <div className="report-body"><Markdown text={r.content}/></div>
   {!!data.items.length&&<section className="report-items"><h2>本期资讯</h2>{data.items.map(i=><a key={i.id} href={`/read/${i.id}`}><span><strong>{i.title}</strong><small>{i.category} · {i.source==='subscription'?i.sharer.replace('订阅 · ',''):`${i.sharer} 分享`}</small></span>{i.coverUrl&&<Photo src={i.coverUrl} alt=""/>}</a>)}</section>}
   <p className="fine">日报由 AI 根据站内已整理的资讯生成，请以原文为准。</p>
  </article>}
  {toast&&<div className="toast" role="status">{toast}</div>}
 </AppFrame>;
}
