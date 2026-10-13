"use client";
import {useEffect,useState} from 'react';
import {requestJSON} from '../components/session';
import {Section} from '../components/ui';
import {Meter} from './ui';
type Health={ok:boolean;label:string};
type Overview={total:number;today:number;states:{status:string;n:number}[];days:{day:string;n:number;subs:number}[];users:number;subscriptions:number;sharers:{sharer:string;n:number}[];report:{day:string;title:string;status:string;error:string}|null;usage:{ai:number;aiLimit:number;xapi:number;xapiLimit:number};health:Record<string,Health>;push:{channel:string;state:string;n:number}[]};
const HEALTH:[string,string,string][]=[['ai','大模型','sources'],['x','X 抓取渠道','sources'],['analysis','定向分析','report'],['report','每日日报','report'],['feishu','飞书推送','push'],['wecom','企业微信推送','push']];
export default function Overview({go}:{go:(tab:string)=>void}){
 const[d,setD]=useState<Overview|null>(null),[error,setError]=useState('');
 useEffect(()=>{requestJSON('/api/admin/overview').then(setD).catch(e=>setError(e.message));},[]);
 if(!d)return <p className="table-empty">{error||'正在统计…'}</p>;
 const state=(s:string)=>d.states.find(x=>x.status===s)?.n||0;const max=Math.max(1,...d.days.map(x=>x.n));
 const sent=(ch:string)=>d.push.filter(p=>p.channel===ch&&p.state==='sent').reduce((a,b)=>a+b.n,0);
 const stats:[string,number,boolean?][]=[['全部资讯',d.total],['今日新增',d.today],['等待整理',state('pending')+state('processing')],['需要处理',state('failed')+state('needs_content'),true],['订阅账号',d.subscriptions],['启用成员',d.users]];
 return <div className="admin-pane">
  <div className="stats">{stats.map(([label,value,warn])=><div key={label} className={warn&&value?'warn':''}><strong>{value.toLocaleString()}</strong><span>{label}</span></div>)}</div>
  <Section title="近 14 天收录" desc="深色为成员分享，浅色为订阅抓取。"><div className="chart-bars" role="img" aria-label="近 14 天每日收录数量">{d.days.map(x=><div key={x.day} title={`${x.day}：共 ${x.n} 条，订阅 ${x.subs} 条`}><span style={{height:`${x.n/max*100}%`}}><i style={{height:`${x.subs/Math.max(1,x.n)*100}%`}}/></span><small>{x.day.slice(5).replace('-','/')}</small></div>)}{!d.days.length&&<p className="fine">最近没有收录。</p>}</div></Section>
  <Section title="系统状态"><div className="table-wrap"><table className="table"><tbody>{HEALTH.map(([k,label,tab])=>{const h=d.health[k];const extra=k==='feishu'||k==='wecom'?sent(k):0;return <tr key={k}><td><strong>{label}</strong></td><td><span className={`badge ${h.ok?'ok':''}`}>{h.ok?'正常':'未开启'}</span></td><td className="muted">{h.label}{extra?` · 已推送 ${extra} 条`:''}</td><td className="cell-actions"><button className="link" onClick={()=>go(tab)}>设置</button></td></tr>;})}</tbody></table></div></Section>
  <Section title="今日用量"><div className="usage"><span>AI 调用</span><Meter value={d.usage.ai} max={d.usage.aiLimit}/><span>X 接口</span><Meter value={d.usage.xapi} max={d.usage.xapiLimit}/></div>{d.report&&<p className="fine">最新日报：<a className="link" href={`/reports/${d.report.day}`}>{d.report.day} {d.report.status==='ready'?d.report.title:d.report.error||'未生成'}</a></p>}</Section>
  {!!d.sharers.length&&<Section title="分享排行"><div className="table-wrap"><table className="table"><tbody>{d.sharers.map((s,n)=><tr key={s.sharer}><td className="num narrow muted">{n+1}</td><td>{s.sharer}</td><td className="num">{s.n}</td></tr>)}</tbody></table></div></Section>}
 </div>;
}
