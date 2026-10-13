"use client";
import {useCallback,useEffect,useState} from 'react';
import {LoaderCircle,Sparkles,ChevronRight} from 'lucide-react';
import AppFrame from '../components/app-frame';
import {useSession,requestJSON} from '../components/session';
import {PageHeader,Dialog,Empty,Skeleton} from '../components/ui';
import {dayParts} from '../../lib/content';
type Row={day:string;title:string;lead:string;item_count:number;status:string;error:string;model:string;updated_at:string};
const STATE:Record<string,[string,string]>={ready:['已生成','ok'],failed:['失败','danger'],empty:['无资讯',''],generating:['生成中','accent'],pending:['等待','']};
export default function Page(){
 const me=useSession();const[data,setData]=useState<{reports:Row[];enabled:boolean;hour:number;scope:string;today:string}|null>(null),[open,setOpen]=useState(false),[day,setDay]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const refresh=useCallback(()=>requestJSON('/api/reports').then(d=>{setData(d);setDay(v=>v||d.today);}).catch(e=>setError(e.message)),[]);useEffect(()=>{refresh();},[refresh]);
 async function generate(){setBusy(true);setError('');try{const d=await requestJSON(`/api/reports/${day}/generate`,{});if(d.report?.status==='failed'){setError(d.report.error);await refresh();return;}location.href=`/reports/${day}`;}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <AppFrame active="reports" aside={<section className="aside-card"><h2>关于日报</h2><p className="aside-text">每天汇总当天整理完成的资讯，由大模型写出要点、分主题速览、趋势和跟进建议，只引用站内资讯。</p>{data&&<p className="aside-text muted">{data.enabled?`自动生成：每天 ${data.hour}:00（${data.scope==='previous'?'前一天':'当天'}）`:'自动生成未开启'}{me?.role==='admin'&&<> · <a className="link" href="/admin?tab=report">设置</a></>}</p>}</section>}>
  <PageHeader title="每日日报" sub={data?.enabled?`每天 ${data.hour}:00 自动生成`:undefined} actions={me?.role==='admin'&&<button className="btn btn-secondary btn-sm" onClick={()=>setOpen(true)}><Sparkles size={14}/>生成</button>}/>
  {error&&<p className="alert error" role="alert">{error}</p>}
  {!data?<Skeleton/>:!data.reports.length?<Empty title="还没有日报" text={me?.role==='admin'?'点右上角“生成”创建第一份，或在后台开启每日自动生成。':'管理员开启后，这里每天会出现一份新的日报。'}/>:
  <ul className="report-list">{data.reports.map(r=>{const d=dayParts(r.day);const [label,tone]=STATE[r.status]||[r.status,''];const ready=r.status==='ready';return <li key={r.day}><a href={ready?`/reports/${r.day}`:undefined} aria-disabled={!ready}><span className="report-date"><strong>{d.date}</strong><small>{d.month}</small><small>{d.week}</small></span><span className="report-text"><strong>{r.title||`${r.day} 日报`}</strong><span>{ready?r.lead:r.error||label}</span></span><span className="report-side"><span className={`badge ${tone}`}>{label}</span>{!!r.item_count&&<small>{r.item_count} 条</small>}</span>{ready&&<ChevronRight size={18} className="chev"/>}</a></li>;})}</ul>}
  <Dialog open={open} onClose={()=>setOpen(false)} title="生成日报" footer={<><button className="btn btn-ghost" onClick={()=>setOpen(false)}>取消</button><button className="btn btn-primary" disabled={busy||!day} onClick={generate}>{busy&&<LoaderCircle size={15} className="spin"/>}生成</button></>}><label className="field"><span>日期（北京时间）</span><input type="date" className="input" value={day} max={data?.today} onChange={e=>setDay(e.target.value)}/><small>已有的同日日报会被重新生成。</small></label></Dialog>
 </AppFrame>;
}
