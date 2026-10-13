"use client";
import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft,X} from 'lucide-react';
import {initials} from './session';
import {imageSrc,safeImageUrl} from '../../lib/content';
// Shared building blocks. Styling lives in app/styles/base.css; keep these small and flat.
export function Avatar({name,src,size=40}:{name:string;src?:string;size?:number}){
 const safe=src?safeImageUrl(src):'';
 return <span className="avatar" style={{width:size,height:size,fontSize:Math.round(size*.4)}}>{safe?<img src={imageSrc(safe)} alt="" loading="lazy" referrerPolicy="no-referrer"/>:initials(name)}</span>;
}
export function PageHeader({title,sub,back,actions,className=''}:{title:ReactNode;sub?:ReactNode;back?:string|boolean;actions?:ReactNode;className?:string}){
 return <header className={`page-header ${className}`}>{back&&<a className="icon-btn" href={typeof back==='string'?back:'/'} onClick={e=>{if(back===true&&history.length>1){e.preventDefault();history.back();}}} aria-label="返回"><ArrowLeft size={20}/></a>}<div className="page-title"><h1>{title}</h1>{sub&&<small>{sub}</small>}</div>{actions&&<div className="page-actions">{actions}</div>}</header>;
}
export function Section({title,desc,actions,children,id}:{title?:ReactNode;desc?:ReactNode;actions?:ReactNode;children:ReactNode;id?:string}){
 return <section className="section" id={id}>{(title||actions)&&<div className="section-head"><div>{title&&<h2 className="section-title">{title}</h2>}{desc&&<p className="section-desc">{desc}</p>}</div>{actions}</div>}{children}</section>;
}
export function Setting({label,help,children}:{label:ReactNode;help?:ReactNode;children:ReactNode}){
 return <div className="setting"><div className="setting-label"><strong>{label}</strong>{help&&<small>{help}</small>}</div><div className="setting-control">{children}</div></div>;
}
export function Switch({checked,onChange,label,disabled}:{checked:boolean;onChange:(v:boolean)=>void;label:string;disabled?:boolean}){return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={`switch ${checked?'on':''}`} onClick={()=>onChange(!checked)}><span/></button>;}
export function Tabs<T extends string>({items,value,onChange,label}:{items:[T,ReactNode][];value:T;onChange:(v:T)=>void;label:string}){
 return <nav className="tabs" aria-label={label}>{items.map(([id,text])=><button key={id} className={value===id?'active':''} aria-current={value===id?'page':undefined} onClick={()=>onChange(id)}>{text}</button>)}</nav>;
}
// Modal on desktop, bottom sheet on phones.
export function Dialog({open,onClose,title,children,footer,wide=false}:{open:boolean;onClose:()=>void;title:ReactNode;children:ReactNode;footer?:ReactNode;wide?:boolean}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current;if(!d)return;if(open&&!d.open)d.showModal();if(!open&&d.open)d.close();},[open]);
 return <dialog ref={ref} className={`dialog ${wide?'wide':''}`} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="dialog-inner"><header className="dialog-head"><h2>{title}</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="关闭"><X size={20}/></button></header><div className="dialog-body">{children}</div>{footer&&<footer className="dialog-foot">{footer}</footer>}</div></dialog>;
}
export function Empty({title,text,action}:{title:string;text?:string;action?:ReactNode}){return <div className="empty"><h2>{title}</h2>{text&&<p>{text}</p>}{action}</div>;}
export function Skeleton({rows=4}:{rows?:number}){return <div className="skeleton" aria-label="正在加载">{Array.from({length:rows},(_,n)=><div key={n}><span/><div><i/><i/><i/></div></div>)}</div>;}
// A menu anchored to its button but rendered on <body>, so scrolling columns and tables
// never clip it. It flips above/below and stays inside the viewport; `sheet` turns it into
// a bottom sheet on phones. Choosing any link or button inside closes it.
export function PopMenu({label,trigger,children,side='bottom',align='end',triggerClass='icon-btn',className='',sheet=false}:{label:string;trigger:ReactNode;children:ReactNode;side?:'top'|'bottom';align?:'start'|'end';triggerClass?:string;className?:string;sheet?:boolean}){
 const[open,setOpen]=useState(false),[pos,setPos]=useState<CSSProperties>({visibility:'hidden'});const btn=useRef<HTMLButtonElement>(null),pop=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{if(!open||!btn.current||!pop.current)return;const r=btn.current.getBoundingClientRect(),w=pop.current.offsetWidth,h=pop.current.offsetHeight,gap=6;
  const below=r.bottom+gap,above=r.top-gap-h;let top=side==='top'?(above>=8?above:below):(below+h<=innerHeight-8||above<8?below:above);top=Math.max(8,Math.min(top,innerHeight-h-8));
  const left=Math.max(8,Math.min(align==='end'?r.right-w:r.left,innerWidth-w-8));setPos({top,left});},[open,side,align]);
 useEffect(()=>{if(!open)return;const inside=(t:EventTarget|null)=>!!t&&(btn.current?.contains(t as Node)||pop.current?.contains(t as Node));
  const down=(e:PointerEvent)=>{if(!inside(e.target))setOpen(false);};const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);btn.current?.focus();}};const away=(e:Event)=>{if(!inside(e.target))setOpen(false);};const resize=()=>setOpen(false);
  document.addEventListener('pointerdown',down);document.addEventListener('keydown',key);document.addEventListener('scroll',away,true);addEventListener('resize',resize);
  return()=>{document.removeEventListener('pointerdown',down);document.removeEventListener('keydown',key);document.removeEventListener('scroll',away,true);removeEventListener('resize',resize);};},[open]);
 const toggle=()=>{setPos({visibility:'hidden'});setOpen(!open);};
 return <><button ref={btn} type="button" className={triggerClass} aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={toggle}>{trigger}</button>
  {open&&createPortal(<>{sheet&&<div className="menu-scrim" onClick={()=>setOpen(false)}/>}<div ref={pop} role="menu" aria-label={label} className={`menu pop ${sheet?'sheet':''} ${className}`} style={pos} onClick={e=>{if((e.target as HTMLElement).closest('a,button'))setOpen(false);}}>{children}</div></>,document.body)}</>;
}

