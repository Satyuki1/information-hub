import {env} from 'cloudflare:workers';
import {HttpError,seal,unseal,setting,setSetting} from './auth';
// One admin-editable configuration document plus one sealed secrets document.
// Wrangler secrets from earlier deployments remain as fallbacks so nothing breaks on upgrade.
export const PUBLIC_ORIGIN='https://zeng-daily-shares.tangcheng475899188.workers.dev';
export const AI_PROVIDERS={
 deepseek:{label:'DeepSeek',kind:'openai',baseUrl:'https://api.deepseek.com',model:'deepseek-flash',maxTokens:16000,site:'https://platform.deepseek.com/api_keys'},
 openai:{label:'OpenAI',kind:'openai',baseUrl:'https://api.openai.com/v1',model:'gpt-5-mini',maxTokens:16000,site:'https://platform.openai.com/api-keys'},
 anthropic:{label:'Claude（Anthropic）',kind:'anthropic',baseUrl:'https://api.anthropic.com',model:'claude-opus-5-5',maxTokens:16000,site:'https://platform.claude.com/settings/keys'},
 qwen:{label:'通义千问',kind:'openai',baseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',model:'qwen-plus',maxTokens:8192,site:'https://bailian.console.aliyun.com/'},
 moonshot:{label:'Kimi（月之暗面）',kind:'openai',baseUrl:'https://api.moonshot.cn/v1',model:'moonshot-v1-32k',maxTokens:8192,site:'https://platform.moonshot.cn/console/api-keys'},
 zhipu:{label:'智谱 GLM',kind:'openai',baseUrl:'https://open.bigmodel.cn/api/paas/v4',model:'glm-4-plus',maxTokens:4095,site:'https://open.bigmodel.cn/usercenter/apikeys'},
 doubao:{label:'豆包（火山方舟）',kind:'openai',baseUrl:'https://ark.cn-beijing.volces.com/api/v3',model:'',maxTokens:8192,site:'https://console.volcengine.com/ark'},
 siliconflow:{label:'硅基流动',kind:'openai',baseUrl:'https://api.siliconflow.cn/v1',model:'deepseek-ai/DeepSeek-V3',maxTokens:8192,site:'https://cloud.siliconflow.cn/account/ak'},
 custom:{label:'自定义（OpenAI 兼容）',kind:'openai',baseUrl:'',model:'',maxTokens:8192,site:''},
} as const;
export type ProviderId=keyof typeof AI_PROVIDERS;
export const X_MODES=['twitterapi_io','x_official','public_preview'] as const;
export type XMode=typeof X_MODES[number];
export const READING_STYLES=['x','red','news'] as const;
export type PushTarget={enabled:boolean;shares:boolean;subscriptions:boolean;reports:boolean;minScore:number;since:string};
export type AppConfig={
 site:{name:string;origin:string;anonymousCollect:boolean;anonymousSharer:string;aiDailyLimit:number;xDailyLimit:number};
 x:{mode:XMode;fallbackPreview:boolean;pollMinutes:number;initialCount:number};
 ai:{provider:ProviderId;baseUrl:string;model:string;reportModel:string;maxTokens:number};
 analysis:{enabled:boolean;focus:string;scope:'subscriptions'|'all'};
 report:{enabled:boolean;hour:number;scope:'previous'|'current';instructions:string};
 push:{feishu:PushTarget;wecom:PushTarget};
};
export const SECRET_KEYS=['twitterapi','xBearer','feishuWebhook','feishuSecret','wecomWebhook',...Object.keys(AI_PROVIDERS).map(p=>'ai:'+p)] as const;
export type SecretKey=typeof SECRET_KEYS[number];
const ENV_SECRETS:Partial<Record<SecretKey,()=>string|undefined>>={'ai:deepseek':()=>env.DEEPSEEK_API_KEY,twitterapi:()=>env.TWITTERAPI_IO_KEY,xBearer:()=>env.X_BEARER_TOKEN,wecomWebhook:()=>env.WECOM_WEBHOOK_URL};
const bool=(v:unknown,d:boolean)=>typeof v==='boolean'?v:d;
const int=(v:unknown,d:number,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)?Math.min(max,Math.max(min,Math.round(v))):d;
const str=(v:unknown,d:string,max=2000)=>typeof v==='string'?v.trim().slice(0,max):d;
const pick=<T extends string>(v:unknown,options:readonly T[],d:T):T=>options.includes(v as T)?v as T:d;
const obj=(v:unknown)=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
function target(v:unknown):PushTarget{const t=obj(v);return {enabled:bool(t.enabled,false),shares:bool(t.shares,true),subscriptions:bool(t.subscriptions,true),reports:bool(t.reports,true),minScore:int(t.minScore,0,0,100),since:str(t.since,'',40)};}
export function normalizeConfig(input:unknown):AppConfig{
 const c=obj(input),site=obj(c.site),x=obj(c.x),ai=obj(c.ai),analysis=obj(c.analysis),report=obj(c.report),push=obj(c.push);
 const provider=pick(ai.provider,Object.keys(AI_PROVIDERS) as ProviderId[],'deepseek');
 return {
  site:{name:str(site.name,'资讯汇集',40)||'资讯汇集',origin:str(site.origin,'',200).replace(/\/+$/,''),anonymousCollect:bool(site.anonymousCollect,true),anonymousSharer:str(site.anonymousSharer,'曾总',40)||'曾总',aiDailyLimit:int(site.aiDailyLimit,100,1,5000),xDailyLimit:int(site.xDailyLimit,300,1,20000)},
  x:{mode:pick(x.mode,X_MODES,'twitterapi_io'),fallbackPreview:bool(x.fallbackPreview,true),pollMinutes:int(x.pollMinutes,30,5,1440),initialCount:int(x.initialCount,3,0,20)},
  ai:{provider,baseUrl:str(ai.baseUrl,'',300).replace(/\/+$/,''),model:str(ai.model,'',120),reportModel:str(ai.reportModel,'',120),maxTokens:int(ai.maxTokens,0,0,64000)},
  analysis:{enabled:bool(analysis.enabled,false),focus:str(analysis.focus,'',2000),scope:pick(analysis.scope,['subscriptions','all'] as const,'subscriptions')},
  report:{enabled:bool(report.enabled,false),hour:int(report.hour,8,0,23),scope:pick(report.scope,['previous','current'] as const,'previous'),instructions:str(report.instructions,'',2000)},
  push:{feishu:target(push.feishu),wecom:target(push.wecom)},
 };
}
export async function loadConfig(){let raw:unknown={};try{raw=JSON.parse(await setting('app_config')||'{}');}catch{}return normalizeConfig(raw);}
export async function saveConfig(config:AppConfig){await setSetting('app_config',JSON.stringify(config));}
async function loadSecrets():Promise<Partial<Record<SecretKey,string>>>{const value=await setting('app_secrets');if(!value)return {};try{return await unseal(value,'app-secrets');}catch{return {};}}
export async function getSecret(key:SecretKey){const stored=(await loadSecrets())[key];return stored||ENV_SECRETS[key]?.()||'';}
export async function saveSecrets(changes:Record<string,unknown>){
 const secrets=await loadSecrets();
 for(const [key,value] of Object.entries(changes)){
  if(!(SECRET_KEYS as readonly string[]).includes(key))throw new HttpError(400,'未知的密钥项。');
  if(value===null||value==='')delete secrets[key as SecretKey];
  else if(typeof value==='string'){const v=value.trim();if(v.length>2000||/\s/.test(v))throw new HttpError(400,'密钥格式无效。');validateSecret(key as SecretKey,v);secrets[key as SecretKey]=v;}
 }
 await setSetting('app_secrets',await seal(secrets,'app-secrets'));
}
export function validateSecret(key:SecretKey,value:string){
 if(key==='feishuWebhook'&&!feishuWebhook(value))throw new HttpError(400,'飞书机器人地址应为 https://open.feishu.cn/open-apis/bot/v2/hook/…');
 if(key==='wecomWebhook'&&!wecomWebhook(value))throw new HttpError(400,'企业微信机器人地址应为 https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…');
}
export function feishuWebhook(value:string){try{const u=new URL(value);return u.protocol==='https:'&&['open.feishu.cn','open.larksuite.com'].includes(u.hostname)&&/^\/open-apis\/bot\/v2\/hook\/[\w-]+$/.test(u.pathname)&&!u.username&&!u.password?u:null;}catch{return null;}}
export function wecomWebhook(value:string){try{const u=new URL(value);return u.origin==='https://qyapi.weixin.qq.com'&&u.pathname==='/cgi-bin/webhook/send'&&/^[\w-]+$/.test(u.searchParams.get('key')||'')?u:null;}catch{return null;}}
export function publicHttps(value:string){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||/^(localhost|127\.|10\.|0\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname)||/\.(local|internal|localhost)$/.test(u.hostname)||/^\[|^\d+\.\d+\.\d+\.\d+$/.test(u.hostname))return false;return true;}catch{return false;}}
function hint(key:SecretKey,value:string){if(key==='feishuWebhook'||key==='wecomWebhook'){const u=new URL(value);return `${u.hostname} · ••••${value.slice(-4)}`;}return value.length>8?`${value.slice(0,3)}••••${value.slice(-4)}`:'••••';}
export async function secretStatus(){const stored=await loadSecrets();const out:Record<string,{configured:boolean;source:string;hint:string}>={};for(const key of SECRET_KEYS){const db=stored[key],fallback=ENV_SECRETS[key]?.();const value=db||fallback||'';out[key]={configured:!!value,source:db?'后台设置':fallback?'部署环境变量':'',hint:value?hint(key,value):''};}return out;}
export async function siteOrigin(){const c=await loadConfig();return c.site.origin||await setting('site_origin')||PUBLIC_ORIGIN;}
export function provider(config:AppConfig){const p=AI_PROVIDERS[config.ai.provider];return {...p,id:config.ai.provider,baseUrl:config.ai.baseUrl||p.baseUrl,model:config.ai.model||(config.ai.provider==='deepseek'?env.DEEPSEEK_MODEL:'')||p.model,maxTokens:config.ai.maxTokens||p.maxTokens};}
export function beijingDay(offsetDays=0,now=Date.now()){return new Date(now+8*3600000+offsetDays*86400000).toISOString().slice(0,10);}
// Shared daily quotas (AI tokens cost money; X APIs are rate and credit limited).
export async function consume(kind:'ai'|'xapi',limit:number){return !!await env.DB!.prepare('INSERT INTO usage_windows (key,count) VALUES (?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<? RETURNING count').bind(kind+':'+beijingDay(),limit).first();}
export async function usage(kind:'ai'|'xapi'){return (await env.DB!.prepare('SELECT count FROM usage_windows WHERE key=?').bind(kind+':'+beijingDay()).first<{count:number}>())?.count||0;}
