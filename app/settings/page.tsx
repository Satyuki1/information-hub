"use client";
import {useEffect,useState} from 'react';
import AppFrame from '../components/app-frame';
import {useSession} from '../components/session';
import {PageHeader,Tabs} from '../components/ui';
import {McpPanel} from '../components/account-panels';
import FeishuPanel from '../components/feishu-panel';
import ExportPanel from '../components/export-panel';
import Settings from '../admin/settings';
import LibrarySettings from '../admin/library';
export default function Page(){const me=useSession(),[tab,setTab]=useState('export');useEffect(()=>{const t=new URLSearchParams(location.search).get('tab');if(t)setTab(t);},[]);const tabs:[string,string][]=[['export','数据导出'],['mcp','AI 助手'],['feishu','飞书连接'],...(me?.role==='admin'?[['sources','模型与 API'],['library','栏目与分组'],['site','站点设置']] as [string,string][]:[])];function go(t:string){setTab(t);history.replaceState(null,'','/settings?tab='+t);}return <AppFrame active="settings"><div className="sticky-head"><PageHeader title="设置" sub="连接工具，管理自己的知识库"/><Tabs label="设置分类" items={tabs} value={tab} onChange={go}/></div>{tab==='export'&&<ExportPanel/>}{tab==='mcp'&&<McpPanel/>}{tab==='feishu'&&<FeishuPanel admin={me?.role==='admin'}/>} {me?.role==='admin'&&<>{tab==='library'&&<LibrarySettings/>}{(tab==='sources'||tab==='site')&&<Settings key={tab} tab={tab}/>}</>}<p className="settings-help"><a href="/docs/zh">打开使用文档 →</a></p></AppFrame>;}
