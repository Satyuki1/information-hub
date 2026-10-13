import type {ReactNode} from 'react';
import {Share,Heart,MessageCircle,Repeat2,BarChart2,Copy,BookOpen,Link2,ChevronLeft,Wifi,BatteryFull,Signal,Check,Languages,Sparkles} from 'lucide-react';
import {LogoMark} from './brand';
// Hand-drawn iPhone screens (HTML + CSS) for the shortcut tutorial. No screenshots needed,
// so the guide stays sharp at any size and in dark mode.
export function Phone({children,dark=false}:{children:ReactNode;dark?:boolean}){
 return <div className={`iphone ${dark?'dark':''}`}><div className="iphone-screen"><div className="iphone-status"><span>9:41</span><i className="island"/><span className="status-icons"><Signal size={11}/><Wifi size={11}/><BatteryFull size={13}/></span></div>{children}<i className="home-bar"/></div></div>;
}
const Tap=({className=''}:{className?:string})=><span className={`tap ${className}`} aria-hidden="true"/>;
function Bars({n=3,w=[92,80,58]}:{n?:number;w?:number[]}){return <span className="bars">{Array.from({length:n},(_,i)=><i key={i} style={{width:`${w[i%w.length]}%`}}/>)}</span>;}
export function SafariScreen({name}:{name?:string}){
 return <div className="scr scr-safari"><div className="web-head"><LogoMark size={18}/><b>我的快捷指令</b></div><div className="web-hero"><small>iPhone · 开箱即用</small><strong>在 X 里点分享，一步收录。</strong><p>{name?`这是 ${name} 的专属快捷指令。`:'这是你的专属快捷指令。'}</p><span className="web-btn">复制连接地址并安装<Tap/></span></div><div className="web-card"><b>连接地址</b><code>https://…/api/collect?token=ihub_••••</code></div><div className="ios-toast"><Check size={11}/>连接地址已复制</div><div className="safari-bar"><span>🔒 information-hub.workers.dev</span></div></div>;
}
export function ImportScreen(){
 return <div className="scr scr-import"><div className="sheet-nav"><span>取消</span><b>设置此快捷指令</b><span/></div><div className="sc-tile"><LogoMark size={30}/><b>分享到资讯汇集</b></div><p className="sc-question">粘贴你在 information-hub「快捷指令」页复制的连接地址</p><div className="sc-field"><span className="paste-bubble">粘贴</span><span className="caret">https://…/api/collect?token=ihub_x8K…</span></div><span className="sc-add">添加快捷指令<Tap/></span><p className="sc-note">只需粘贴一次，之后分享都会记在你的名下。</p></div>;
}
export function XScreen(){
 return <div className="scr scr-x"><div className="x-top"><ChevronLeft size={14}/><b>帖子</b></div><div className="x-post-mock"><span className="x-avatar">A</span><div><b>AI Lab Daily <small>@ailab · 2 小时</small></b><Bars n={3}/><span className="x-media"/><span className="x-acts"><MessageCircle size={11}/><Repeat2 size={11}/><Heart size={11}/><BarChart2 size={11}/><span className="x-share"><Share size={12}/><Tap/></span></span></div></div><div className="x-post-mock dim"><span className="x-avatar b">D</span><div><Bars n={2} w={[85,60]}/></div></div></div>;
}
export function ShareSheetScreen(){
 return <div className="scr scr-share"><div className="share-dim"/><div className="share-sheet"><div className="share-head"><span className="x-avatar sm">A</span><span><b>x.com</b><small>AI Lab Daily 的帖子</small></span></div><div className="share-apps">{['#34c759','#0a84ff','#ff9f0a','#bf5af2'].map(c=><i key={c} style={{background:c}}/>)}</div><ul><li><Copy size={12}/>拷贝链接</li><li className="hl"><LogoMark size={14}/>分享到资讯汇集<Tap/></li><li><BookOpen size={12}/>添加到阅读列表</li><li><Link2 size={12}/>编辑操作…</li></ul></div></div>;
}
export function DoneScreen({name}:{name?:string}){
 return <div className="scr scr-done"><div className="share-dim"/><div className="ios-alert"><LogoMark size={26}/><b>分享到资讯汇集</b><p>{name?`${name}，`:''}已提交到资讯汇集。后台正在翻译整理，可以关闭；稍后到网站查看中文摘要。</p><span className="alert-btn">完成</span></div></div>;
}
export function ReadScreen(){
 return <div className="scr scr-read"><div className="read-top"><ChevronLeft size={13}/><b>帖子</b></div><div className="read-author"><span className="x-avatar sm">A</span><b>AI Lab Daily</b></div><div className="read-digest"><Sparkles size={10}/>中文摘要</div><div className="read-analysis"><b>定向分析</b><em>相关度 92</em><Bars n={2} w={[90,70]}/></div><div className="read-tabs"><span>原文</span><span className="on">中文译文</span><span>双语</span></div><strong className="read-title">新一代开源模型追平闭源旗舰</strong><Bars n={4} w={[96,88,92,60]}/><span className="read-img"/><span className="read-badge"><Languages size={10}/>已翻译整理</span></div>;
}
export const STEPS=[
 {title:'复制连接地址并安装',text:'登录后打开「快捷指令」页，点蓝色按钮：专属连接地址自动复制，同时下载签名的快捷指令。',screen:(name?:string)=><SafariScreen name={name}/>},
 {title:'粘贴一次连接地址',text:'iPhone 弹出“设置此快捷指令”，长按输入框选择“粘贴”，再点“添加快捷指令”。',screen:()=><ImportScreen/>},
 {title:'在 X 中点分享',text:'看到值得团队一起读的帖子，点帖子下方的分享图标。',screen:()=><XScreen/>},
 {title:'选择“分享到资讯汇集”',text:'在系统分享菜单中找到它（第一次可能需要在“编辑操作”里添加到收藏）。',screen:()=><ShareSheetScreen/>},
 {title:'几秒钟提交完成',text:'看到提示就可以关闭。第一次运行时，iPhone 会询问是否允许连接你的站点，选择“允许”。',screen:(name?:string)=><DoneScreen name={name}/>},
 {title:'团队一起读中文版',text:'原文、图片、中文译文与摘要整理完成，显示在你的名下，也会进入当天的 AI 日报。',screen:()=><ReadScreen/>},
];
export default function ShortcutTutorial({name,compact=false}:{name?:string;compact?:boolean}){
 return <ol className={`tutorial ${compact?'compact':''}`}>{STEPS.map((s,n)=><li key={s.title}><Phone>{s.screen(name)}</Phone><div className="tutorial-text"><span className="tutorial-step">{n+1}</span><div><strong>{s.title}</strong><p>{s.text}</p></div></div></li>)}</ol>;
}
