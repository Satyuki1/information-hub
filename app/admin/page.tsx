"use client";
import {useCallback,useEffect,useState} from 'react';
import {ShieldCheck,LayoutDashboard,Users as UsersIcon,Radio,Bot,Send,Newspaper,Globe,BookOpen,History} from 'lucide-react';
import AppFrame from '../components/app-frame';
import {useSession,requestJSON} from '../components/session';
import FeishuPanel from '../components/feishu-panel';
import Overview from './overview';
import Users from './users';
import Subscriptions from './subscriptions';
import Settings from './settings';
const TABS=[['overview','概览',LayoutDashboard],['users','成员',UsersIcon],['subscriptions','订阅账号',Radio],['sources','抓取与模型',Bot],['push','推送',Send],['report','日报与分析',Newspaper],['site','站点',Globe],['feishu','飞书归档',BookOpen],['audit','操作记录',History]] as const;
const ACTIONS:Record<string,string>={'admin.bootstrap':'初始化超级管理员','login.success':'登录成功','login.failed':'登录未成功','login.magic':'免密链接登录','login.magic_failed':'免密链接无效','user.created':'创建成员','user.enabled':'启用成员','user.disabled':'停用成员','user.password_reset':'重置密码','user.promoted':'设为管理员','user.demoted':'取消管理员','user.magic_created':'生成登录链接','user.magic_revoked':'撤销登录链接','password.changed':'修改密码','shortcut.reset':'重置快捷指令口令','config.updated':'修改系统设置','subscription.created':'添加订阅','subscription.updated':'修改订阅','subscription.deleted':'删除订阅','report.generated':'生成日报','feishu.connected':'连接飞书','feishu.disconnected':'解除飞书连接','feishu.app_created':'创建飞书应用','feishu.app_configured':'配置飞书应用','feishu.auto_enabled':'开启自动归档','feishu.auto_disabled':'关闭自动归档','feishu.article_archived':'资讯归档完成','feishu.space_created':'创建知识库'};
type Event={id:string;actor_name:string|null;action:string;target:string;at:string};
export default function Page(){const me=useSession();const[tab,setTab]=useState('overview'),[events,setEvents]=useState<Event[]>([]),[error,setError]=useState('');
 const go=useCallback((next:string)=>{setTab(next);history.replaceState(null,'',next==='overview'?'/admin':`/admin?tab=${next}`);window.scrollTo({top:0});if(next==='audit')requestJSON('/api/admin/audit').then(d=>setEvents(d.events)).catch(e=>setError(e.message));},[]);
 useEffect(()=>{const t=new URLSearchParams(location.search).get('tab');if(t&&TABS.some(([id])=>id===t))go(t);},[go]);
 const current=TABS.find(([id])=>id===tab)!;
 return <AppFrame active="admin" aside={<section className="x-panel admin-aside"><span className="panel-icon"><ShieldCheck size={20}/></span><h2>管理后台</h2><p>{me?.owner?'你是超级管理员，拥有全部权限。':'管理员可以管理成员、订阅和系统设置。'}所有修改即时生效，密钥只保存在服务端且不会回显。</p><nav className="admin-aside-nav">{TABS.map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>go(id)}><Icon size={16}/>{label}</button>)}</nav></section>}>
  <header className="detail-header page-header"><h1><ShieldCheck size={21}/>管理后台<span className="crumb">{current[1]}</span></h1></header>
  <nav className="admin-tabs" aria-label="管理功能">{TABS.map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} aria-current={tab===id?'page':undefined} onClick={()=>go(id)}><Icon size={16}/>{label}</button>)}</nav>
  <div className="admin-content">{error&&<p className="form-error" role="alert">{error}</p>}
   {tab==='overview'&&<Overview go={go}/>}
   {tab==='users'&&<Users me={me}/>}
   {tab==='subscriptions'&&<Subscriptions openSettings={()=>go('sources')}/>}
   {(tab==='sources'||tab==='push'||tab==='report'||tab==='site')&&<Settings key={tab} section={tab}/>}
   {tab==='feishu'&&<div className="settings-content flush"><FeishuPanel admin/></div>}
   {tab==='audit'&&<section className="admin-card"><header><div><h2><History size={19}/>最近操作</h2><p>记录账号、设置和飞书相关操作，不记录密码、密钥或令牌。</p></div></header><div className="audit-list">{events.map(e=><div key={e.id}><strong>{e.actor_name||'未登录访客'}</strong><span>{ACTIONS[e.action]||e.action}</span><time>{new Date(e.at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}</time></div>)}</div></section>}
  </div>
 </AppFrame>;
}
