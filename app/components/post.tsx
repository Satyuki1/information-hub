"use client";
import {useState} from 'react';
import {Bookmark,Languages,Share,ArrowUpRight,MoreHorizontal,Repeat2,Clock3,FileText} from 'lucide-react';
import {authorOf,feedText,imagesOf,timeAgo,STATUS,type Article} from '../../lib/content';
import {Photo} from './media';
import MediaGrid from './media';
import {Avatar as UiAvatar} from './ui';
export function Avatar({item,size=40}:{item:Article;size?:number}){const a=authorOf(item);return <UiAvatar name={a.name} src={a.avatar} size={size}/>;}
export function Author({item,detail=false}:{item:Article;detail?:boolean}){const a=authorOf(item);return <div className={`post-head ${detail?'detail':''}`}><span className="post-name">{a.name}</span>{a.handle&&<span className="post-handle">@{a.handle}</span>}{!detail&&<><span className="post-dot">·</span><time title={a.publishedAt?'原帖发布时间':'收录时间'}>{timeAgo(a.publishedAt||item.sharedAt)}</time></>}</div>;}
export function PostActions({item,onFavorite,onShare,onTranslate}:{item:Article;onFavorite:()=>void;onShare:()=>void;onTranslate?:()=>void}){
 return <div className="post-actions">{onTranslate&&<button onClick={onTranslate} aria-label="切换原文与译文" title="原文 / 译文"><Languages size={18}/></button>}<button onClick={onFavorite} className={item.favorite?'on':''} aria-label={item.favorite?'取消收藏':'收藏'} aria-pressed={!!item.favorite} title="收藏"><Bookmark size={18} fill={item.favorite?'currentColor':'none'}/></button><button onClick={onShare} aria-label="复制阅读链接" title="复制链接"><Share size={18}/></button>{item.url?<a href={item.url} target="_blank" rel="noopener noreferrer" aria-label="查看原帖" title="查看原帖"><ArrowUpRight size={18}/></a>:<span/>}</div>;
}
// X-style post: who shared it (only when a member did), author line, Chinese text by default.
export default function Post({item,onFavorite,onMessage}:{item:Article;onFavorite:()=>void;onTopic?:(topic:string)=>void;onMessage:(message:string)=>void}){
 const[original,setOriginal]=useState(false),[expanded,setExpanded]=useState(false);const article=item.contentKind==='x_article';const hasTranslation=!!item.translation;
 const raw=feedText(original||!hasTranslation?(article?authorOf(item).text||item.original:item.original):(article?item.summary:item.translation));
 const long=raw.length>220;const shown=long&&!expanded?raw.slice(0,220)+'…':raw;const images=imagesOf(item);
 async function share(){try{await navigator.clipboard.writeText(location.origin+`/read/${item.id}`);onMessage('阅读链接已复制');}catch{onMessage('请打开详情，从地址栏复制链接');}}
 return <article className="post">
  {item.source!=='subscription'&&<div className="post-context"><Repeat2 size={14}/>{item.sharer} 分享</div>}
  <div className="post-grid"><a href={`/read/${item.id}`} tabIndex={-1} aria-hidden="true"><Avatar item={item}/></a>
   <div className="post-main">
    <div className="post-top"><Author item={item}/>{item.status!=='ready'&&<span className="badge">{STATUS[item.status]}</span>}<details className="post-menu"><summary aria-label="更多操作"><MoreHorizontal size={18}/></summary><div className="menu"><a href={`/read/${item.id}#timeline`}><Clock3 size={16}/>资讯时间轴</a><a href={`/api/shares/${item.id}/markdown`}><FileText size={16}/>下载 Markdown</a></div></details></div>
    {article?<a className="post-article" href={`/read/${item.id}`}>{images[0]&&<Photo src={images[0]} alt=""/>}<div><small>长文 · 约 {Math.max(1,Math.ceil(item.original.length/700))} 分钟</small><strong>{item.title}</strong>{!original&&<p>{item.summary}</p>}</div></a>:null}
    {(!article||original)&&<a className="post-text" href={`/read/${item.id}`}>{shown||item.summary||'正在获取图文内容…'}</a>}
    {(long||hasTranslation)&&<div className="post-links">{long&&<button onClick={()=>setExpanded(!expanded)}>{expanded?'收起':'显示更多'}</button>}{hasTranslation&&<button onClick={()=>setOriginal(!original)}>{original?'显示中文':'显示原文'}</button>}</div>}
    {!article&&<MediaGrid images={images} title={item.title}/>}
    <PostActions item={item} onFavorite={onFavorite} onShare={share}/>
   </div>
  </div>
 </article>;
}
