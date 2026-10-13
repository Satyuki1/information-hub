"use client";
import {useCallback,useEffect,useState} from 'react';
import {ExternalLink} from 'lucide-react';
import {requestJSON} from '../components/session';
import {Section,Setting} from '../components/ui';
import type {AppConfig} from '../../lib/config';
import {SecretField,Switch,TestButton,SaveBar,Meter,type SecretInfo} from './ui';
type Provider={label:string;kind:string;baseUrl:string;model:string;maxTokens:number;site:string};
type View={config:AppConfig;secrets:Record<string,SecretInfo>;providers:Record<string,Provider>;channels:Record<string,string>;activeModel:string;activeChannel:string;usage:{ai:number;xapi:number};origin:string};
export type SettingsTab='sources'|'push'|'report'|'site';
const X_CHANNELS=[
 {id:'twitterapi_io',label:'TwitterAPI.io（推荐）',help:'支持长文章、图片与账号订阅，按调用量计费。',secret:'twitterapi',keyLabel:'API Key',link:'https://twitterapi.io/dashboard'},
 {id:'x_official',label:'X 官方 API',help:'X 开发者平台 v2。读取账号时间线需要 Basic 及以上套餐，不含长文章正文。',secret:'xBearer',keyLabel:'Bearer Token',link:'https://developer.x.com/en/portal/dashboard'},
 {id:'public_preview',label:'仅公开预览',help:'无需密钥，只能读取单条帖子的可见文字，不能订阅账号。',secret:'',keyLabel:'',link:''},
] as const;
function setIn<T>(obj:T,path:string,value:unknown):T{const keys=path.split('.');const out=structuredClone(obj) as Record<string,unknown>;let cur=out;for(const k of keys.slice(0,-1))cur=cur[k] as Record<string,unknown>;cur[keys.at(-1)!]=value;return out as T;}
const Ext=({href,children}:{href:string;children:string})=><a className="link" href={href} target="_blank" rel="noopener noreferrer">{children}<ExternalLink size={11}/></a>;
export default function Settings({tab}:{tab:SettingsTab}){
 const[view,setView]=useState<View|null>(null),[draft,setDraft]=useState<AppConfig|null>(null),[secrets,setSecrets]=useState<Record<string,string|null>>({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState('');
 const load=useCallback(()=>requestJSON('/api/admin/config').then((v:View)=>{setView(v);setDraft(v.config);setSecrets({});}).catch(e=>setError(e.message)),[]);
 useEffect(()=>{load();},[load]);
 useEffect(()=>{if(!saved)return;const t=setTimeout(()=>setSaved(''),3000);return()=>clearTimeout(t);},[saved]);
 if(!view||!draft)return <p className="table-empty">{error||'正在读取配置…'}</p>;
 const set=(path:string,value:unknown)=>setDraft(d=>d&&setIn(d,path,value));
 const secret=(name:string,value:string|null|undefined)=>setSecrets(s=>{const n={...s};if(value===undefined)delete n[name];else n[name]=value;return n;});
 const dirty=JSON.stringify(draft)!==JSON.stringify(view.config)||Object.keys(secrets).length>0;
 async function save(){setBusy(true);setError('');try{const v:View=await requestJSON('/api/admin/config',{config:draft,secrets},'PUT');setView(v);setDraft(v.config);setSecrets({});setSaved('已保存，立即生效。');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const p=view.providers[draft.ai.provider];const ch=X_CHANNELS.find(c=>c.id===draft.x.mode)!;
 const num=(path:string,min:number,max:number)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>set(path,Math.min(max,Math.max(min,Number(e.target.value)||0)));
 // A plain render helper (not a component) so inputs keep focus while typing.
 const numberField=(path:string,value:number,min:number,max:number,unit:string)=><span className="with-unit"><input type="number" className="input short" min={min} max={max} value={value} onChange={num(path,min,max)}/>{unit}</span>;
 return <div className="admin-pane">
  {error&&<p className="alert error" role="alert">{error}</p>}{saved&&<p className="alert ok" role="status">{saved}</p>}
  {tab==='sources'&&<>
   <Section title="X 抓取渠道" desc={`当前生效：${view.channels[view.activeChannel]}`} actions={<TestButton target="x" disabled={dirty}/>}>
    <Setting label="渠道" help={ch.help}><select className="select" value={draft.x.mode} onChange={e=>set('x.mode',e.target.value)}>{X_CHANNELS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></Setting>
    {ch.secret&&<Setting label={ch.keyLabel}><SecretField name={ch.secret} info={view.secrets[ch.secret]} value={secrets[ch.secret]} onChange={secret} link={<Ext href={ch.link}>获取</Ext>}/></Setting>}
    <Setting label="失败时回退公开预览" help="接口出错时，至少保存帖子的可见文字。"><Switch checked={draft.x.fallbackPreview} onChange={v=>set('x.fallbackPreview',v)} label="失败时回退公开预览"/></Setting>
    <Setting label="订阅检查间隔">{numberField('x.pollMinutes',draft.x.pollMinutes,5,1440,'分钟')}</Setting>
    <Setting label="新订阅首次导入" help="添加账号时只导入最新几条。">{numberField('x.initialCount',draft.x.initialCount,0,20,'条')}</Setting>
    <Setting label="每日接口上限">{numberField('site.xDailyLimit',draft.site.xDailyLimit,1,20000,'次')}<Meter value={view.usage.xapi} max={view.config.site.xDailyLimit}/></Setting>
   </Section>
   <Section title="大模型" desc={`用于翻译、摘要、定向分析和日报。当前生效：${view.providers[view.config.ai.provider].label} · ${view.activeModel||'未设置模型'}`} actions={<TestButton target="ai" disabled={dirty}/>}>
    <Setting label="服务商"><select className="select" value={draft.ai.provider} onChange={e=>setDraft(d=>d&&setIn(setIn(d,'ai.provider',e.target.value),'ai.model',''))}>{Object.entries(view.providers).map(([id,pv])=><option key={id} value={id}>{pv.label}{view.secrets['ai:'+id]?.configured?'  ✓':''}</option>)}</select></Setting>
    <Setting label="API Key"><SecretField name={'ai:'+draft.ai.provider} info={view.secrets['ai:'+draft.ai.provider]} value={secrets['ai:'+draft.ai.provider]} onChange={secret} link={p.site?<Ext href={p.site}>获取</Ext>:undefined}/></Setting>
    <Setting label="模型" help={p.model?`留空使用 ${p.model}`:'填写模型或接入点名称'}><input className="input mono" value={draft.ai.model} onChange={e=>set('ai.model',e.target.value)} placeholder={p.model||'model-name'} spellCheck={false}/></Setting>
    <Setting label="日报模型" help="留空则与上面相同。"><input className="input mono" value={draft.ai.reportModel} onChange={e=>set('ai.reportModel',e.target.value)} placeholder={draft.ai.model||p.model||''} spellCheck={false}/></Setting>
    {(draft.ai.provider==='custom'||draft.ai.baseUrl)&&<Setting label="接口地址" help="OpenAI 兼容接口，例如 https://api.example.com/v1"><input className="input mono" value={draft.ai.baseUrl} onChange={e=>set('ai.baseUrl',e.target.value)} placeholder={p.baseUrl||'https://'} spellCheck={false}/></Setting>}
    <Setting label="每日调用上限" help="翻译、日报与 MCP 提问共用。">{numberField('site.aiDailyLimit',draft.site.aiDailyLimit,1,5000,'次')}<Meter value={view.usage.ai} max={view.config.site.aiDailyLimit}/></Setting>
    <details className="more"><summary>高级</summary>
     {draft.ai.provider!=='custom'&&!draft.ai.baseUrl&&<Setting label="接口地址" help={`留空使用 ${p.baseUrl}`}><input className="input mono" value={draft.ai.baseUrl} onChange={e=>set('ai.baseUrl',e.target.value)} placeholder={p.baseUrl} spellCheck={false}/></Setting>}
     <Setting label="单次最大输出" help={`0 表示使用默认值 ${p.maxTokens}`}>{numberField('ai.maxTokens',draft.ai.maxTokens,0,64000,'tokens')}</Setting>
    </details>
   </Section>
  </>}
  {tab==='push'&&<>
   <p className="fine pad">开启后只推送之后整理完成的内容，不补发历史。消息带站内阅读链接，未登录的人看不到全文。</p>
   {(['feishu','wecom'] as const).map(c=>{const t=draft.push[c];const isF=c==='feishu';const hook=isF?'feishuWebhook':'wecomWebhook';return <Section key={c} title={isF?'飞书群机器人':'企业微信群机器人'} desc={t.enabled&&t.since?`已开启，自 ${new Date(t.since).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} 起推送`:'未开启'} actions={<Switch checked={t.enabled} onChange={v=>set(`push.${c}.enabled`,v)} label={`开启${isF?'飞书':'企业微信'}推送`}/>}>
    <Setting label="Webhook 地址" help={isF?'群设置 → 群机器人 → 自定义机器人':'群聊 → 消息推送 / 群机器人 → 添加'}><SecretField name={hook} info={view.secrets[hook]} value={secrets[hook]} onChange={secret} placeholder={isF?'https://open.feishu.cn/open-apis/bot/v2/hook/…':'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…'}/></Setting>
    {isF&&<Setting label="签名校验密钥" help="机器人安全设置中开启“签名校验”后填写（推荐）。"><SecretField name="feishuSecret" info={view.secrets.feishuSecret} value={secrets.feishuSecret} onChange={secret}/></Setting>}
    <Setting label="推送内容"><span className="check-list">{([['shares','成员分享'],['subscriptions','订阅动态'],['reports','每日日报']] as const).map(([k,l])=><label key={k} className="check"><input type="checkbox" checked={t[k]} onChange={e=>set(`push.${c}.${k}`,e.target.checked)}/>{l}</label>)}</span></Setting>
    {t.subscriptions&&<Setting label="订阅最低相关度" help="开启定向分析后生效；0 表示全部推送。">{numberField(`push.${c}.minScore`,t.minScore,0,100,'分')}</Setting>}
    <Setting label="测试"><TestButton target={c} label="发送测试消息" disabled={dirty}/></Setting>
   </Section>;})}
   <Section title="飞书知识库归档" desc="每天的资讯写成一篇飞书文档。" actions={<a className="btn btn-secondary btn-sm" href="/admin?tab=feishu">设置</a>}><></></Section>
  </>}
  {tab==='report'&&<>
   <Section title="定向分析" desc="写下团队关注的方向，每条资讯额外生成分析要点和 0–100 相关度。" actions={<Switch checked={draft.analysis.enabled} onChange={v=>set('analysis.enabled',v)} label="开启定向分析"/>}>
    <Setting label="关注方向" help="越具体越好：行业、公司、产品、竞品，以及你想得到的判断。"><textarea className="textarea" rows={5} value={draft.analysis.focus} onChange={e=>set('analysis.focus',e.target.value)} placeholder={'例如：\n我们做企业 AI 助手，关注：\n1. 大模型的新版本、价格和 API 变化\n2. AI Agent 产品的发布与融资'}/></Setting>
    <Setting label="分析范围"><div className="segmented">{([['subscriptions','仅订阅动态'],['all','全部资讯']] as const).map(([v,l])=><button type="button" key={v} className={draft.analysis.scope===v?'on':''} onClick={()=>set('analysis.scope',v)}>{l}</button>)}</div></Setting>
   </Section>
   <Section title="每日日报" desc="定时汇总资讯，生成要点、分主题速览、趋势和建议。" actions={<Switch checked={draft.report.enabled} onChange={v=>set('report.enabled',v)} label="开启每日日报"/>}>
    <Setting label="生成时间" help="北京时间"><select className="select short" value={draft.report.hour} onChange={num('report.hour',0,23)}>{Array.from({length:24},(_,h)=><option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}</select></Setting>
    <Setting label="汇总范围"><select className="select" value={draft.report.scope} onChange={e=>set('report.scope',e.target.value)}><option value="previous">前一天（适合早上发）</option><option value="current">当天（适合晚上发）</option></select></Setting>
    <Setting label="额外要求" help="例如：语气更口语化；最后加一段“对我们的启示”。"><textarea className="textarea" rows={3} value={draft.report.instructions} onChange={e=>set('report.instructions',e.target.value)}/></Setting>
    <Setting label="手动生成"><a className="btn btn-secondary btn-sm" href="/reports">前往日报</a></Setting>
   </Section>
  </>}
  {tab==='site'&&<>
   <Section title="站点">
    <Setting label="站点名称" help="用于日报和推送消息。"><input className="input" value={draft.site.name} maxLength={40} onChange={e=>set('site.name',e.target.value)}/></Setting>
    <Setting label="对外访问地址" help="推送消息里的链接使用这个地址。"><input className="input mono" value={draft.site.origin} onChange={e=>set('site.origin',e.target.value)} placeholder={view.origin} spellCheck={false}/></Setting>
   </Section>
   <Section title="公开收录" desc="快捷指令和 /collect 页面无需登录即可提交；带个人口令的提交记在本人名下。">
    <Setting label="允许匿名分享" help="关闭后，只接受登录用户和带口令的快捷指令。"><Switch checked={draft.site.anonymousCollect} onChange={v=>set('site.anonymousCollect',v)} label="允许匿名分享"/></Setting>
    {draft.site.anonymousCollect&&<Setting label="匿名分享人名称"><input className="input" value={draft.site.anonymousSharer} maxLength={40} onChange={e=>set('site.anonymousSharer',e.target.value)}/></Setting>}
   </Section>
  </>}
  <SaveBar dirty={dirty} busy={busy} onSave={save} onReset={()=>{setDraft(view.config);setSecrets({});}}/>
 </div>;
}
