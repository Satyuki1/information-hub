"use client";
import LibrarySettings from './library';
import ExportPanel from '../components/export-panel';
import {useCallback,useEffect,useState} from 'react';
import AppFrame from '../components/app-frame';
import {useSession,requestJSON} from '../components/session';
import {PageHeader,Tabs} from '../components/ui';
import FeishuPanel from '../components/feishu-panel';
import Overview from './overview';
import Users from './users';
import Subscriptions from './subscriptions';
import Settings,{type SettingsTab} from './settings';
type Tab='overview'|'users'|'subscriptions'|SettingsTab|'feishu'|'audit'|'library'|'export';
const TABS:[Tab,string][]=[['overview','概览'],['users','成员'],['subscriptions','订阅账号'],['sources','抓取与模型'],['push','推送'],['report','日报与分析'],['site','站点'],['library','栏目与分组'],['export','导出'],['feishu','飞书归档'],['audit','操作记录']];
const ACTIONS:Record<string,string>={'admin.bootstrap':'初始化超级管理员','login.success':'登录','login.failed':'登录失败','login.magic':'免密链接登录','login.magic_failed':'免密链接无效','user.created':'添加成员','user.enabled':'启用成员','user.disabled':'停用成员','user.password_reset':'设置临时密码','user.reset_link':'生成重置链接','user.promoted':'设为管理员','user.demoted':'设为成员','user.magic_created':'生成登录链接','user.magic_revoked':'撤销登录链接','password.changed':'修改密码','password.recovered':'用恢复码重置密码','password.recover_failed':'恢复码无效','password.reset_link':'用链接重置密码','recovery.regenerated':'重新生成恢复码','shortcut.reset':'重置快捷指令口令','mcp.created':'生成 MCP 令牌','mcp.revoked':'撤销 MCP 令牌','config.updated':'修改系统设置','subscription.created':'添加订阅','subscription.updated':'修改订阅','subscription.deleted':'删除订阅','report.generated':'生成日报','feishu.connected':'连接飞书','feishu.disconnected':'解除飞书连接','feishu.app_created':'创建飞书应用','feishu.app_configured':'配置飞书应用','feishu.auto_enabled':'开启自动归档','feishu.auto_disabled':'关闭自动归档','feishu.article_archived':'归档到飞书','feishu.space_created':'创建知识库'};
type Event={id:string;actor_name:string|null;action:string;target:string;at:string};
export default function Page(){const me=useSession();const[tab,setTab]=useState<Tab>('overview'),[events,setEvents]=useState<Event[]|null>(null),[error,setError]=useState('');
 const go=useCallback((next:string)=>{const t=next as Tab;setTab(t);history.replaceState(null,'',t==='overview'?'/admin':`/admin?tab=${t}`);window.scrollTo({top:0});if(t==='audit')requestJSON('/api/admin/audit').then(d=>setEvents(d.events)).catch(e=>setError(e.message));},[]);
 useEffect(()=>{const t=new URLSearchParams(location.search).get('tab');if(t&&TABS.some(([id])=>id===t))go(t);},[go]);
 return <AppFrame active="admin">
  <div className="sticky-head"><PageHeader title="管理后台" sub={me?.owner?'超级管理员':undefined}/><Tabs label="管理功能" items={TABS} value={tab} onChange={go}/></div>
  {error&&<p className="alert error" role="alert">{error}</p>}
  {tab==='library'&&<LibrarySettings/>}{tab==='export'&&<ExportPanel/>}
  {tab==='overview'&&<Overview go={go}/>}
  {tab==='users'&&<Users me={me}/>}
  {tab==='subscriptions'&&<Subscriptions openSettings={()=>go('sources')}/>}
  {(tab==='sources'||tab==='push'||tab==='report'||tab==='site')&&<Settings key={tab} tab={tab}/>}
  {tab==='feishu'&&<FeishuPanel admin/>}
  {tab==='audit'&&<div className="admin-pane"><div className="table-wrap"><table className="table responsive"><thead><tr><th>时间</th><th>成员</th><th>操作</th></tr></thead><tbody>{(events||[]).map(e=><tr key={e.id}><td data-label="时间" className="nowrap muted">{new Date(e.at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</td><td data-label="成员">{e.actor_name||'访客'}</td><td data-label="操作">{ACTIONS[e.action]||e.action}</td></tr>)}</tbody></table>{!events?<p className="table-empty">正在读取…</p>:!events.length&&<p className="table-empty">还没有记录。</p>}</div><p className="fine pad">只显示最近 100 条；不记录任何密码、密钥或令牌。</p></div>}
 </AppFrame>;
}
