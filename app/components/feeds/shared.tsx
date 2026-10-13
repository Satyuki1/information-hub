"use client";
import type {Article} from '../../../lib/content';
import type {CurrentUser,ReadingStyle} from '../session';
import type {Sub} from '../subs-strip';
import {Empty} from '../ui';
export const MODES=['explore','subs','favorites','mine'];
export const MODE_LABEL:Record<string,string>={all:'首页',explore:'探索',subs:'订阅',favorites:'收藏',mine:'我的分享'};
export type FeedProps={items:Article[];all:Article[];loading:boolean;error:string;refresh:()=>void;topic:string;choose:(t:string)=>void;query:string;setQuery:(q:string)=>void;mode:string;navigate:(m:string)=>void;favorite:(i:Article)=>void;compose:()=>void;counts:Record<string,number>;message:(m:string)=>void;me:CurrentUser|null;style:ReadingStyle;date:string;setDate:(d:string)=>void;subs:Sub[]|null;account:string;setAccount:(id:string)=>void};
export function FeedSkeleton({kind='x'}:{kind?:string}){return <div className={`skeleton skeleton-${kind}`} aria-label="正在加载资讯">{Array.from({length:kind==='red'?8:4},(_,n)=><div key={n}><span/><div><i/><i/><i/></div></div>)}</div>;}
export function EmptyFeed({mode,compose}:{mode:string;compose:()=>void}){
 const copy:Record<string,[string,string]>={favorites:['还没有收藏','在资讯下方点收藏图标，之后可以在这里找到。'],subs:['还没有订阅动态','管理员在后台添加 X 账号后，新帖会自动出现在这里。'],mine:['你还没有分享过','在 X 中用快捷指令分享，或点“+”收录一条。'],explore:['没有找到相关资讯','换个关键词或主题试试。']};
 const [title,text]=copy[mode]||['还没有资讯','点“+”收录第一条资讯。'];
 return <Empty title={title} text={text} action={mode==='mine'?<a className="btn btn-secondary" href="/shortcut">安装快捷指令</a>:mode==='all'?<button className="btn btn-primary" onClick={compose}>收录资讯</button>:undefined}/>;
}
