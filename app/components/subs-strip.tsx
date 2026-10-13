"use client";
import {useEffect,useState} from 'react';
import {Radio} from 'lucide-react';
import {requestJSON} from './session';
import {Avatar} from './ui';
export type Sub={id:string;handle:string;name:string;avatar:string;enabled:number;items:number;latest:string|null};
let cache:Promise<Sub[]>|null=null;
export function useSubscriptions(){const[subs,setSubs]=useState<Sub[]|null>(null);useEffect(()=>{cache??=requestJSON('/api/subscriptions').then(d=>d.subscriptions as Sub[]).catch(()=>[]);cache.then(setSubs);},[]);return subs;}
// Subscribed accounts grouped by avatar; selecting one filters the feed to that account.
export default function SubsStrip({value,onChange,subs}:{value:string;onChange:(id:string)=>void;subs:Sub[]|null}){
 if(!subs)return <div className="subs-strip loading" aria-hidden="true">{[0,1,2,3,4].map(n=><span key={n} className="subs-item"><i/><em/></span>)}</div>;
 if(!subs.length)return null;
 return <div className="subs-strip" role="tablist" aria-label="订阅账号"><button role="tab" aria-selected={!value} className={`subs-item ${!value?'on':''}`} onClick={()=>onChange('')}><span className="subs-all"><Radio size={20}/></span><em>全部</em></button>{subs.map(s=><button key={s.id} role="tab" aria-selected={value===s.id} className={`subs-item ${value===s.id?'on':''} ${s.enabled?'':'paused'}`} onClick={()=>onChange(s.id)} title={`${s.name} @${s.handle}`}><Avatar name={s.name||s.handle} src={s.avatar} size={52}/><em>{s.name||s.handle}</em></button>)}</div>;
}
