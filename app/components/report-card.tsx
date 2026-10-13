"use client";
import {useEffect,useState} from 'react';
import {Newspaper,ArrowUpRight} from 'lucide-react';
import {requestJSON} from './session';
type Latest={day:string;title:string;lead:string;item_count:number;status:string};
export function ReportCard({className='x-panel'}:{className?:string}){
 const[report,setReport]=useState<Latest|null>(null),[loaded,setLoaded]=useState(false);
 useEffect(()=>{requestJSON('/api/reports').then(d=>setReport((d.reports as Latest[]).find(r=>r.status==='ready')||null)).catch(()=>{}).finally(()=>setLoaded(true));},[]);
 if(!loaded)return null;
 return <section className={`${className} report-card`}><div className="report-card-head"><span className="panel-icon"><Newspaper size={18}/></span><span className="eyebrow">每日日报{report?` · ${report.day}`:''}</span></div>{report?<><h2>{report.title}</h2><p>{report.lead}</p><a className="button secondary" href={`/reports/${report.day}`}>阅读日报 · {report.item_count} 条<ArrowUpRight size={15}/></a></>:<><h2>AI 每日日报</h2><p>开启后，系统每天自动汇总当日资讯，生成要点、趋势与建议。</p><a className="button secondary" href="/reports">查看日报<ArrowUpRight size={15}/></a></>}</section>;
}
