"use client";
import {useEffect,useState} from 'react';
import {requestJSON} from './session';
type Latest={day:string;title:string;lead:string;item_count:number;status:string};
let cache:Promise<Latest|null>|null=null;
export function ReportCard({className='aside-card'}:{className?:string}){
 const[report,setReport]=useState<Latest|null|undefined>(undefined);
 useEffect(()=>{cache??=requestJSON('/api/reports').then(d=>(d.reports as Latest[]).find(r=>r.status==='ready')||null).catch(()=>null);cache.then(setReport);},[]);
 if(report===undefined)return null;
 return <section className={className}><h2>每日日报</h2>{report?<a className="aside-report" href={`/reports/${report.day}`}><small>{report.day} · {report.item_count} 条</small><strong>{report.title}</strong><p>{report.lead}</p></a>:<p className="aside-empty">还没有生成日报。</p>}<a className="aside-more" href="/reports">全部日报</a></section>;
}
