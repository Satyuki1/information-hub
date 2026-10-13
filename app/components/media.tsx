"use client";
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Download,X,ImageOff} from 'lucide-react';
import {imageSrc} from '../../lib/content';
export function Photo({src,alt,...props}:{src:string;alt:string;className?:string}){const[failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[src]);return failed?<span className="image-unavailable"><ImageOff size={20}/>图片暂时无法加载</span>:<img {...props} src={imageSrc(src)} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>;}
export default function MediaGrid({images,title='资讯配图'}:{images:string[];title?:string}){
 const[index,setIndex]=useState<number|null>(null);const dialog=useRef<HTMLDialogElement>(null);const opener=useRef<HTMLElement|null>(null);
 useEffect(()=>{if(index!==null){if(!dialog.current?.open){opener.current=document.activeElement as HTMLElement;dialog.current?.showModal();document.body.style.overflow='hidden';}}else{dialog.current?.close();document.body.style.overflow='';opener.current?.focus();}},[index]);
 useEffect(()=>()=>{document.body.style.overflow='';},[]);
 if(!images.length)return null;
 const move=(delta:number)=>setIndex(n=>n===null?null:(n+delta+images.length)%images.length);
 return <><div className={`media-grid count-${Math.min(images.length,4)}`}>{images.slice(0,4).map((src,n)=><button key={src} onClick={e=>{e.stopPropagation();setIndex(n);}} aria-label={`放大图片 ${n+1}，共 ${images.length} 张`}><Photo src={src} alt={`${title} · 图片 ${n+1}`}/>{n===3&&images.length>4&&<span className="media-more">+{images.length-4}</span>}</button>)}</div><dialog ref={dialog} className="photo-dialog" aria-label="图片查看器" onCancel={()=>setIndex(null)} onClick={e=>{if(e.target===e.currentTarget)setIndex(null);}} onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();move(1);}if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}}}>{index!==null&&<><button className="photo-close" onClick={()=>setIndex(null)} aria-label="关闭图片"><X/></button><span className="photo-counter">{index+1} / {images.length}</span><a className="photo-download" href={imageSrc(images[index])} target="_blank" rel="noopener noreferrer" aria-label="打开原图"><Download/></a>{images.length>1&&<button className="photo-prev" onClick={()=>move(-1)} aria-label="上一张图片"><ArrowLeft/></button>}<img src={imageSrc(images[index])} alt={`${title} · 图片 ${index+1}`} referrerPolicy="no-referrer"/>{images.length>1&&<button className="photo-next" onClick={()=>move(1)} aria-label="下一张图片"><ArrowRight/></button>}</>}</dialog></>;
}
