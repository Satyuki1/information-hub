"use client";
import {useEffect,useState} from 'react';
import {FileText,CalendarPlus,Hourglass,AlertTriangle,Radio,Users,CheckCircle2,CircleDashed,ArrowRight,Newspaper} from 'lucide-react';
import {requestJSON} from '../components/session';
import {UserAvatar} from '../components/x-shell';
import {Card,Meter} from './ui';
type Health={ok:boolean;label:string};
type Overview={total:number;today:number;states:{status:string;n:number}[];days:{day:string;n:number;subs:number}[];users:number;subscriptions:number;sharers:{sharer:string;n:number}[];report:{day:string;title:string;status:string;error:string}|null;usage:{ai:number;aiLimit:number;xapi:number;xapiLimit:number};health:Record<string,Health>;push:{channel:string;state:string;n:number}[]};
const HEALTH:[string,string,string][]=[['ai','大模型','sources'],['x','X 抓取渠道','sources'],['analysis','定向分析','report'],['report','每日日报','report'],['feishu','飞书推送','push'],['wecom','企业微信推送','push']];
export default function Overview({go}:{go:(tab:string)=>void}){
 const[d,setD]=useState<Overview|null>(null),[error,setError]=useState('');
 useEffect(()=>{requestJSON('/api/admin/overview').then(setD).catch(e=>setError(e.message));},[]);
 if(!d)return <div className="admin-loading">{error||'正在统计…'}</div>;
 const state=(s:string)=>d.states.find(x=>x.status===s)?.n||0;const max=Math.max(1,...d.days.map(x=>x.n));
 const sent=(ch:string)=>d.push.filter(p=>p.channel===ch&&p.state==='sent').reduce((a,b)=>a+b.n,0);
 const stats=[{label:'全部资讯',value:d.total,icon:FileText},{label:'今日新增',value:d.today,icon:CalendarPlus},{label:'等待整理',value:state('pending')+state('processing'),icon:Hourglass},{label:'需要处理',value:state('failed')+state('needs_content'),icon:AlertTriangle,warn:true},{label:'订阅账号',value:d.subscriptions,icon:Radio},{label:'活跃成员',value:d.users,icon:Users}];
 return <div className="admin-overview">
  <div className="stat-grid">{stats.map(s=><div key={s.label} className={`stat ${s.warn&&s.value?'warn':''}`}><s.icon size={18}/><strong>{s.value.toLocaleString()}</strong><span>{s.label}</span></div>)}</div>
  <Card title="近 14 天收录" desc="深色为成员分享，浅色为订阅抓取。"><div className="bar-chart" role="img" aria-label="近 14 天每日收录数量">{d.days.map(x=><div key={x.day} className="bar" title={`${x.day}：${x.n} 条（订阅 ${x.subs}）`}><span className="bar-total" style={{height:`${x.n/max*100}%`}}><span className="bar-subs" style={{height:`${x.subs/Math.max(1,x.n)*100}%`}}/></span><small>{x.day.slice(8)}</small></div>)}{!d.days.length&&<p className="muted">最近还没有收录。</p>}</div></Card>
  <div className="two-col">
   <Card title="系统状态"><ul className="health-list">{HEALTH.map(([k,label,tab])=>{const h=d.health[k];return <li key={k}><button onClick={()=>go(tab)}>{h.ok?<CheckCircle2 size={18} className="ok"/>:<CircleDashed size={18}/>}<span><strong>{label}</strong><small>{h.label}{k==='feishu'&&sent('feishu')?` · 已推送 ${sent('feishu')} 条`:''}{k==='wecom'&&sent('wecom')?` · 已推送 ${sent('wecom')} 条`:''}</small></span><ArrowRight size={15}/></button></li>;})}</ul></Card>
   <Card title="今日用量"><Meter value={d.usage.ai} max={d.usage.aiLimit} label="AI 调用"/><Meter value={d.usage.xapi} max={d.usage.xapiLimit} label="X 接口"/>{d.report&&<a className="latest-report" href={`/reports/${d.report.day}`}><Newspaper size={18}/><span><small>最新日报 · {d.report.day}</small><strong>{d.report.status==='ready'?d.report.title:d.report.error||'未生成'}</strong></span></a>}</Card>
  </div>
  {!!d.sharers.length&&<Card title="分享排行"><div className="sharer-list">{d.sharers.map((s,n)=><div key={s.sharer}><span className="rank">{n+1}</span><UserAvatar name={s.sharer} size={30}/><strong>{s.sharer}</strong><span className="bar-inline"><span style={{width:`${s.n/d.sharers[0].n*100}%`}}/></span><small>{s.n}</small></div>)}</div></Card>}
 </div>;
}
