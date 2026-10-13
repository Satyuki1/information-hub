"use client";
import {useCallback,useEffect,useState} from 'react';
import {Bot,Rss,Send,MessageSquareText,Newspaper,Target,Globe,Inbox,ExternalLink,Sparkles,Check,BookOpen} from 'lucide-react';
import {requestJSON} from '../components/session';
import type {AppConfig} from '../../lib/config';
import {Card,Field,SecretField,Switch,ToggleRow,TestButton,SaveBar,Meter,type SecretInfo} from './ui';
type Provider={label:string;kind:string;baseUrl:string;model:string;maxTokens:number;site:string};
type View={config:AppConfig;secrets:Record<string,SecretInfo>;providers:Record<string,Provider>;channels:Record<string,string>;activeModel:string;activeChannel:string;usage:{ai:number;xapi:number};origin:string};
export type Section='sources'|'push'|'report'|'site';
const X_OPTIONS=[
 {id:'twitterapi_io',title:'TwitterAPI.io',badge:'推荐',desc:'支持长文章、图片和账号订阅，按调用量计费。',secret:'twitterapi',link:'https://twitterapi.io/dashboard',placeholder:'TwitterAPI.io API Key'},
 {id:'x_official',title:'X 官方 API',badge:'',desc:'X 开发者平台 v2 接口。读取账号时间线需 Basic 及以上套餐；不含长文章正文。',secret:'xBearer',link:'https://developer.x.com/en/portal/dashboard',placeholder:'Bearer Token'},
 {id:'public_preview',title:'仅公开预览',badge:'免费',desc:'无需密钥，只能读取单条帖子的可见文字，不支持订阅抓取。',secret:'',link:'',placeholder:''},
] as const;
function setIn<T>(obj:T,path:string,value:unknown):T{const keys=path.split('.');const out=structuredClone(obj) as Record<string,unknown>;let cur=out;for(const k of keys.slice(0,-1))cur=cur[k] as Record<string,unknown>;cur[keys.at(-1)!]=value;return out as T;}
export default function Settings({section}:{section:Section}){
 const[view,setView]=useState<View|null>(null),[draft,setDraft]=useState<AppConfig|null>(null),[secrets,setSecrets]=useState<Record<string,string|null>>({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState('');
 const load=useCallback(()=>requestJSON('/api/admin/config').then((v:View)=>{setView(v);setDraft(v.config);setSecrets({});}).catch(e=>setError(e.message)),[]);
 useEffect(()=>{load();},[load]);
 useEffect(()=>{if(!saved)return;const t=setTimeout(()=>setSaved(''),3500);return()=>clearTimeout(t);},[saved]);
 if(!view||!draft)return <div className="admin-loading">{error||'正在读取配置…'}</div>;
 const set=(path:string,value:unknown)=>setDraft(d=>d&&setIn(d,path,value));
 const secret=(name:string,value:string|null|undefined)=>setSecrets(s=>{const n={...s};if(value===undefined)delete n[name];else n[name]=value;return n;});
 const dirty=JSON.stringify(draft)!==JSON.stringify(view.config)||Object.keys(secrets).length>0;
 async function save(){setBusy(true);setError('');try{const v:View=await requestJSON('/api/admin/config',{config:draft,secrets},'PUT');setView(v);setDraft(v.config);setSecrets({});setSaved('设置已保存并立即生效。');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const p=view.providers[draft.ai.provider];const sv=(name:string)=>secrets[name];
 const num=(path:string,min:number,max:number)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>set(path,Math.min(max,Math.max(min,Number(e.target.value)||0)));
 return <div className="admin-settings">
  {error&&<p className="form-error" role="alert">{error}</p>}{saved&&<p className="success-note" role="status"><Check size={16}/>{saved}</p>}
  {section==='sources'&&<>
   <Card title="X 抓取渠道" icon={<Rss size={19}/>} desc="分享链接和订阅账号都通过这里获取原文。可以随时切换，密钥只保存在服务端。" actions={<TestButton target="x" disabled={dirty}/>}>
    <div className="choice-grid" role="radiogroup" aria-label="抓取渠道">{X_OPTIONS.map(o=><button type="button" role="radio" aria-checked={draft.x.mode===o.id} key={o.id} className={`choice ${draft.x.mode===o.id?'active':''}`} onClick={()=>set('x.mode',o.id)}><span className="choice-title"><strong>{o.title}</strong>{o.badge&&<em>{o.badge}</em>}{view.activeChannel===o.id&&<small className="live">当前生效</small>}</span><small>{o.desc}</small></button>)}</div>
    {X_OPTIONS.filter(o=>o.id===draft.x.mode&&o.secret).map(o=><SecretField key={o.id} label={`${o.title} 密钥`} name={o.secret} info={view.secrets[o.secret]} value={sv(o.secret)} onChange={secret} placeholder={view.secrets[o.secret]?.configured?'输入新值以替换':o.placeholder} hint={<a href={o.link} target="_blank" rel="noopener noreferrer">去 {o.title} 获取密钥<ExternalLink size={12}/></a>}/>)}
    {draft.x.mode!=='public_preview'&&view.activeChannel==='public_preview'&&!sv(X_OPTIONS.find(o=>o.id===draft.x.mode)!.secret)&&<p className="notice">尚未配置该渠道的密钥，系统暂时会使用公开预览。</p>}
    <ToggleRow title="接口失败时回退到公开预览" desc="保证单条分享至少能拿到可见文字。" checked={draft.x.fallbackPreview} onChange={v=>set('x.fallbackPreview',v)}/>
    <div className="field-grid three"><Field label="订阅检查间隔（分钟）" hint="每个账号多久抓一次"><input type="number" min={5} max={1440} value={draft.x.pollMinutes} onChange={num('x.pollMinutes',5,1440)}/></Field><Field label="新订阅首次导入条数" hint="避免一次涌入大量旧帖"><input type="number" min={0} max={20} value={draft.x.initialCount} onChange={num('x.initialCount',0,20)}/></Field><Field label="每日 X 接口上限" hint={`今日已用 ${view.usage.xapi} 次`}><input type="number" min={1} max={20000} value={draft.site.xDailyLimit} onChange={num('site.xDailyLimit',1,20000)}/></Field></div>
   </Card>
   <Card title="大模型" icon={<Bot size={19}/>} desc={<>用于翻译、摘要、定向分析和日报。当前生效：<strong>{view.providers[view.config.ai.provider].label} · {view.activeModel||'未设置模型'}</strong></>} actions={<TestButton target="ai" disabled={dirty}/>}>
    <div className="provider-grid" role="radiogroup" aria-label="模型服务">{Object.entries(view.providers).map(([id,pv])=><button type="button" role="radio" aria-checked={draft.ai.provider===id} key={id} className={`provider ${draft.ai.provider===id?'active':''}`} onClick={()=>setDraft(d=>d&&setIn(setIn(d,'ai.provider',id),'ai.model',''))}><strong>{pv.label}</strong><small>{view.secrets['ai:'+id]?.configured?'✓ 已配置密钥':'未配置'}</small></button>)}</div>
    <SecretField label={`${p.label} API Key`} name={'ai:'+draft.ai.provider} info={view.secrets['ai:'+draft.ai.provider]} value={sv('ai:'+draft.ai.provider)} onChange={secret} hint={p.site?<a href={p.site} target="_blank" rel="noopener noreferrer">获取 {p.label} API Key<ExternalLink size={12}/></a>:undefined}/>
    <div className="field-grid"><Field label="模型名称" hint={p.model?`留空使用默认：${p.model}`:'请填写模型或接入点名称'}><input value={draft.ai.model} onChange={e=>set('ai.model',e.target.value)} placeholder={p.model||'例如 my-model'} spellCheck={false}/></Field><Field label="日报使用的模型" hint="留空则与上面相同"><input value={draft.ai.reportModel} onChange={e=>set('ai.reportModel',e.target.value)} placeholder={draft.ai.model||p.model||''} spellCheck={false}/></Field></div>
    <details className="advanced"><summary>高级设置</summary><div className="field-grid"><Field label="接口地址" hint={draft.ai.provider==='custom'?'OpenAI 兼容接口，例如 https://api.example.com/v1':`留空使用默认：${p.baseUrl}`}><input value={draft.ai.baseUrl} onChange={e=>set('ai.baseUrl',e.target.value)} placeholder={p.baseUrl||'https://…'} spellCheck={false}/></Field><Field label="单次最大输出 tokens" hint={`留空或 0 使用默认 ${p.maxTokens}`}><input type="number" min={0} max={64000} value={draft.ai.maxTokens||''} onChange={num('ai.maxTokens',0,64000)}/></Field></div></details>
    <div className="field-grid"><Field label="每日 AI 调用上限" hint="翻译与日报共用，防止公开收录产生过多费用"><input type="number" min={1} max={5000} value={draft.site.aiDailyLimit} onChange={num('site.aiDailyLimit',1,5000)}/></Field><Meter value={view.usage.ai} max={view.config.site.aiDailyLimit} label="今日已用"/></div>
   </Card>
  </>}
  {section==='push'&&<>
   <p className="admin-intro">开启推送后，<strong>只会推送之后整理完成</strong>的资讯和日报，不会补发历史内容。消息附带站内阅读链接，未登录的人无法阅读全文。</p>
   {(['feishu','wecom'] as const).map(ch=>{const t=draft.push[ch];const isF=ch==='feishu';return <Card key={ch} className={t.enabled?'enabled':''} title={isF?'飞书群机器人':'企业微信群机器人'} icon={isF?<Send size={19}/>:<MessageSquareText size={19}/>} desc={isF?'以卡片消息推送到飞书群。':'以 Markdown 消息推送到企业微信群。'} actions={<Switch checked={t.enabled} onChange={v=>set(`push.${ch}.enabled`,v)} label={`开启${isF?'飞书':'企业微信'}推送`}/>}>
    <SecretField label="Webhook 地址" name={isF?'feishuWebhook':'wecomWebhook'} info={view.secrets[isF?'feishuWebhook':'wecomWebhook']} value={sv(isF?'feishuWebhook':'wecomWebhook')} onChange={secret} placeholder={isF?'https://open.feishu.cn/open-apis/bot/v2/hook/…':'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…'}/>
    {isF&&<SecretField label="签名校验密钥（推荐）" name="feishuSecret" info={view.secrets.feishuSecret} value={sv('feishuSecret')} onChange={secret} placeholder="机器人安全设置中的“签名校验”密钥"/>}
    <div className="check-row"><span>推送内容</span>{([['shares','分享的资讯'],['subscriptions','订阅动态'],['reports','每日日报']] as const).map(([k,l])=><label key={k} className="check"><input type="checkbox" checked={t[k]} onChange={e=>set(`push.${ch}.${k}`,e.target.checked)}/>{l}</label>)}</div>
    {t.subscriptions&&<Field label={`订阅动态的最低相关度：${t.minScore}`} hint="开启定向分析后生效。低于该分数的订阅动态不推送；0 表示全部推送。"><input type="range" min={0} max={100} step={5} value={t.minScore} onChange={num(`push.${ch}.minScore`,0,100)}/></Field>}
    <div className="card-foot"><TestButton target={ch} label="发送测试消息" disabled={dirty}/>{t.enabled&&t.since&&<small className="muted">自 {new Date(t.since).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})} 起推送</small>}</div>
    <details className="advanced"><summary>如何获取 Webhook？</summary>{isF?<ol className="guide"><li>打开飞书群 → 右上角「设置」→「群机器人」→「添加机器人」→「自定义机器人」。</li><li>填写名称（如“资讯汇集”），在「安全设置」中勾选「签名校验」，复制密钥填到上面。</li><li>复制 Webhook 地址填到上面，保存后点「发送测试消息」。</li></ol>:<ol className="guide"><li>在企业微信群聊中点右上角「…」→「消息推送」（或「群机器人」）→「添加」。</li><li>复制机器人的 Webhook 地址填到上面。</li><li>保存后点「发送测试消息」确认能收到。</li></ol>}</details>
   </Card>;})}
   <Card title="飞书知识库归档" icon={<BookOpen size={19}/>} desc="除了群消息，还可以把每天的资讯写进飞书知识库文档。"><a className="button secondary" href="/admin?tab=feishu">前往配置知识库归档</a></Card>
  </>}
  {section==='report'&&<>
   <Card className={draft.analysis.enabled?'enabled':''} title="定向分析" icon={<Target size={19}/>} desc="告诉 AI 你关心什么，每条资讯会额外生成针对性的分析要点和 0–100 的相关度。" actions={<Switch checked={draft.analysis.enabled} onChange={v=>set('analysis.enabled',v)} label="开启定向分析"/>}>
    <Field label="关注方向" hint="越具体越好。可以写行业、公司、产品、竞品和你想得到的判断。"><textarea rows={5} value={draft.analysis.focus} onChange={e=>set('analysis.focus',e.target.value)} placeholder={'例如：\n我们是做企业 AI 助手的创业公司，关注：\n1. 大模型厂商的新模型、价格和 API 变化\n2. AI Agent 产品的发布与融资\n3. 对我们产品路线和定价的影响'}/></Field>
    <div className="segmented-field"><span>分析范围</span><div className="segmented">{([['subscriptions','仅订阅动态'],['all','全部资讯']] as const).map(([v,l])=><button type="button" key={v} className={draft.analysis.scope===v?'active':''} onClick={()=>set('analysis.scope',v)}>{l}</button>)}</div></div>
   </Card>
   <Card className={draft.report.enabled?'enabled':''} title="每日日报" icon={<Newspaper size={19}/>} desc="每天定时汇总资讯，生成要点、分主题速览、趋势和建议，可同步推送到群。" actions={<Switch checked={draft.report.enabled} onChange={v=>set('report.enabled',v)} label="开启每日日报"/>}>
    <div className="field-grid"><Field label="生成时间（北京时间）"><select value={draft.report.hour} onChange={num('report.hour',0,23)}>{Array.from({length:24},(_,h)=><option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}</select></Field><Field label="汇总范围"><select value={draft.report.scope} onChange={e=>set('report.scope',e.target.value)}><option value="previous">前一天的资讯（适合早上发）</option><option value="current">当天的资讯（适合晚上发）</option></select></Field></div>
    <Field label="额外要求（选填）" hint="例如：语气更口语化；每条不超过 50 字；最后加一段“对我们的启示”。"><textarea rows={3} value={draft.report.instructions} onChange={e=>set('report.instructions',e.target.value)}/></Field>
    <div className="card-foot"><a className="button secondary" href="/reports"><Sparkles size={15}/>查看与手动生成日报</a></div>
   </Card>
  </>}
  {section==='site'&&<>
   <Card title="站点信息" icon={<Globe size={19}/>}>
    <div className="field-grid"><Field label="站点名称" hint="显示在日报和推送消息中"><input value={draft.site.name} maxLength={40} onChange={e=>set('site.name',e.target.value)}/></Field><Field label="对外访问地址" hint={`推送消息中的链接。留空使用 ${view.origin}`}><input value={draft.site.origin} onChange={e=>set('site.origin',e.target.value)} placeholder={view.origin} spellCheck={false}/></Field></div>
   </Card>
   <Card title="公开收录" icon={<Inbox size={19}/>} desc="快捷指令和 /collect 页面无需登录即可提交。带专属口令的提交会记在本人名下。">
    <ToggleRow title="允许匿名分享" desc="关闭后，只有登录用户和带专属口令的快捷指令可以收录。旧版快捷指令将无法提交。" checked={draft.site.anonymousCollect} onChange={v=>set('site.anonymousCollect',v)}/>
    {draft.site.anonymousCollect&&<Field label="匿名分享显示的分享人"><input value={draft.site.anonymousSharer} maxLength={40} onChange={e=>set('site.anonymousSharer',e.target.value)}/></Field>}
   </Card>
  </>}
  <SaveBar dirty={dirty} busy={busy} onSave={save} onReset={()=>{setDraft(view.config);setSecrets({});}}/>
 </div>;
}
