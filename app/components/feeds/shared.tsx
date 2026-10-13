"use client";
import type {Article} from '../../../lib/content';
import type {CurrentUser,ReadingStyle} from '../session';
export const MODES=['explore','subs','favorites','timeline','topics','mine'];
export const MODE_LABEL:Record<string,string>={all:'首页',explore:'探索',subs:'订阅动态',favorites:'收藏',timeline:'时间轴',topics:'主题分类',mine:'我的分享'};
export type FeedProps={items:Article[];all:Article[];loading:boolean;error:string;refresh:()=>void;topic:string;choose:(t:string)=>void;query:string;setQuery:(q:string)=>void;mode:string;navigate:(m:string)=>void;favorite:(i:Article)=>void;compose:()=>void;counts:Record<string,number>;message:(m:string)=>void;me:CurrentUser|null;style:ReadingStyle;setStyle:(s:ReadingStyle)=>void;date:string;setDate:(d:string)=>void};
export function FeedSkeleton({kind='x'}:{kind?:string}){return <div className={`skeleton-list skeleton-${kind}`} aria-label="正在加载资讯">{Array.from({length:kind==='red'?8:4},(_,n)=><div className="skeleton-item" key={n}><span/><div><i/><i/><i/></div></div>)}</div>;}
export function EmptyFeed({mode,compose}:{mode:string;compose:()=>void}){
 const copy:Record<string,[string,string]>={favorites:['把值得再读的内容留在这里','点击资讯下方的收藏图标，即可加入清单。'],subs:['还没有订阅动态','管理员可以在后台 → 订阅账号中添加想关注的 X 账号。'],mine:['你还没有分享过资讯','在 X 里点分享，用你的专属快捷指令，一步收录。']};
 const [title,text]=copy[mode]||['暂时没有相关资讯','换个关键词，或收录一条新的资讯。'];
 return <div className="empty-state"><h2>{title}</h2><p>{text}</p>{mode==='mine'?<a className="button primary" href="/shortcut">获取我的快捷指令</a>:<button className="button primary" onClick={compose}>收录资讯</button>}</div>;
}
