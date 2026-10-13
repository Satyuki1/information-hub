"use client";
import {useCallback,useEffect,useState} from 'react';
import {Newspaper,Sparkles,LoaderCircle,CalendarDays,ArrowRight,RefreshCw} from 'lucide-react';
import AppFrame from '../components/app-frame';
import {ShortcutCard} from '../components/x-shell';
import {useSession,requestJSON} from '../components/session';
import {dayParts} from '../../lib/content';
type Row={day:string;title:string;lead:string;item_count:number;status:string;error:string;model:string;updated_at:string};
const STATE:Record<string,string>={ready:'已生成',failed:'生成失败',empty:'当日无资讯',generating:'生成中',pending:'等待生成'};
export default function Page(){
 const me=useSession();const[data,setData]=useState<{reports:Row[];enabled:boolean;hour:number;scope:string;today:string}|null>(null),[busy,setBusy]=useState(''),[error,setError]=useState(''),[day,setDay]=useState('');
 const refresh=useCallback(()=>requestJSON('/api/reports').then(setData).catch(e=>setError(e.message)),[]);useEffect(()=>{refresh();},[refresh]);
 async function generate(target:string){setBusy(target);setError('');try{const d=await requestJSON(`/api/reports/${target}/generate`,{});if(d.report?.status==='failed')setError(d.report.error);await refresh();if(d.report?.status==='ready')location.href=`/reports/${target}`;}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 const yesterday=data?new Date(new Date(data.today+'T12:00:00+08:00').getTime()-86400000).toISOString().slice(0,10):'';
 return <AppFrame active="reports" aside={<><section className="x-panel report-about"><span className="panel-icon"><Sparkles size={18}/></span><h2>关于日报</h2><p>系统按北京时间汇总当天整理完成的资讯，由大模型写出要点、分主题速览、趋势洞察和跟进建议。日报只引用站内资讯。</p>{data&&<p className="muted">{data.enabled?`每天 ${data.hour}:00 自动生成${data.scope==='previous'?'前一天':'当天'}的日报`:'自动生成未开启'}{me?.role==='admin'&&<> · <a className="text-link" href="/admin?tab=report">设置</a></>}</p>}</section><ShortcutCard/></>}>
  <header className="detail-header page-header"><h1><Newspaper size={21}/>每日日报</h1><button className="icon-button" onClick={refresh} aria-label="刷新"><RefreshCw size={18}/></button></header>
  <section className="page-hero reports-hero"><span className="eyebrow">AI DAILY BRIEFING</span><h2>每天几分钟，读完当天的重点。</h2><p>{data?.enabled?`自动生成已开启 · 每天 ${data.hour}:00`:'管理员开启后，日报会每天自动生成并推送到群里。'}</p>
   {me?.role==='admin'&&data&&<div className="hero-actions"><button className="button primary" disabled={!!busy} onClick={()=>generate(data.today)}>{busy===data.today?<LoaderCircle size={16} className="spin"/>:<Sparkles size={16}/>}生成今天的日报</button><button className="button secondary" disabled={!!busy} onClick={()=>generate(yesterday)}>{busy===yesterday?<LoaderCircle size={16} className="spin"/>:null}生成昨天的</button><label className="date-pick"><CalendarDays size={16}/><input type="date" value={day} max={data.today} onChange={e=>setDay(e.target.value)} aria-label="选择日期"/></label>{day&&<button className="button secondary" disabled={!!busy} onClick={()=>generate(day)}>{busy===day?<LoaderCircle size={16} className="spin"/>:null}生成 {day}</button>}</div>}
  </section>
  {error&&<p className="form-error" role="alert">{error}</p>}
  {!data?<div className="empty-state"><RefreshCw className="spin"/></div>:!data.reports.length?<div className="empty-state"><h2>还没有日报</h2><p>{me?.role==='admin'?'点击上方按钮生成第一份日报，或在后台开启每日自动生成。':'管理员开启后，这里会每天出现一份新的日报。'}</p></div>:
  <div className="report-list">{data.reports.map(r=>{const d=dayParts(r.day);return <a key={r.day} href={r.status==='ready'?`/reports/${r.day}`:undefined} className={`report-row ${r.status}`} aria-disabled={r.status!=='ready'}><span className="report-date"><small>{d.month}</small><strong>{d.date}</strong><small>{d.week}</small></span><span className="report-info"><strong>{r.title||`${r.day} 日报`}</strong><span>{r.status==='ready'?r.lead:r.error||STATE[r.status]}</span><small><span className={`state-dot ${r.status}`}/>{STATE[r.status]||r.status}{r.item_count?` · ${r.item_count} 条资讯`:''}{r.model?` · ${r.model}`:''}</small></span>{r.status==='ready'&&<ArrowRight size={18} className="report-arrow"/>}</a>;})}</div>}
 </AppFrame>;
}
