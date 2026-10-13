import Anthropic from '@anthropic-ai/sdk';
import {loadConfig,getSecret,provider,publicHttps,type AppConfig} from './config';
export class AIError extends Error{}
export type GenerateOptions={system:string;user:string;json?:boolean;schema?:Record<string,unknown>;purpose?:'item'|'report'|'test';maxTokens?:number};
export type GenerateResult={text:string;model:string;provider:string};
// Claude models that accept the default refusal-fallback routing on the first-party API.
const FALLBACK_MODELS=['claude-opus-5-5','claude-opus-5','claude-fable-5-1','claude-sonnet-5-5'];
export async function generate(options:GenerateOptions,config?:AppConfig):Promise<GenerateResult>{
 const c=config||await loadConfig();const p=provider(c);
 const key=await getSecret(`ai:${p.id}` as const);if(!key)throw new AIError(`尚未配置 ${p.label} 的 API Key，请在管理后台 → 抓取与模型中填写。`);
 const model=(options.purpose==='report'&&c.ai.reportModel)||p.model;if(!model)throw new AIError('请在管理后台填写要使用的模型名称。');
 if(!p.baseUrl||!publicHttps(p.baseUrl))throw new AIError('模型接口地址需为公开的 HTTPS 地址。');
 const maxTokens=Math.min(options.maxTokens||p.maxTokens,p.maxTokens);
 const text=p.kind==='anthropic'?await claude(p.baseUrl,key,model,maxTokens,options):await compatible(p.id,p.label,p.baseUrl,key,model,maxTokens,options);
 return {text,model,provider:p.label};
}
async function claude(baseUrl:string,apiKey:string,model:string,maxTokens:number,o:GenerateOptions){
 const client=new Anthropic({apiKey,baseURL:baseUrl,maxRetries:1,timeout:180000});
 const fallback=baseUrl==='https://api.anthropic.com'&&FALLBACK_MODELS.includes(model);
 const effort=/^claude-(opus|fable|sonnet|haiku|mythos)-5/.test(model)?{effort:'medium' as const}:{};
 const format=o.json&&o.schema?{format:{type:'json_schema' as const,schema:o.schema}}:{};
 try{
  const message=await client.beta.messages.stream({model,max_tokens:maxTokens,system:o.system,messages:[{role:'user',content:o.user}],...(Object.keys({...effort,...format}).length?{output_config:{...effort,...format}}:{}),...(fallback?{betas:['server-side-fallback-2026-07-01'],fallbacks:'default' as const}:{})}).finalMessage();
  if(message.stop_reason==='refusal')throw new AIError('模型拒绝处理这条内容，原文已保存。');
  if(message.stop_reason==='max_tokens')throw new AIError('模型输出被截断，请缩短原文后重试。');
  return message.content.flatMap(b=>b.type==='text'?[b.text]:[]).join('');
 }catch(e){
  if(e instanceof AIError)throw e;
  if(e instanceof Anthropic.AuthenticationError||e instanceof Anthropic.PermissionDeniedError)throw new AIError('Claude 密钥验证失败，请在后台更新。');
  if(e instanceof Anthropic.RateLimitError)throw new AIError('Claude 请求较多，请稍后重试。');
  if(e instanceof Anthropic.BadRequestError)throw new AIError('Claude 拒绝了请求参数，请检查模型名称。');
  if(e instanceof Anthropic.APIError)throw new AIError(`Claude 服务暂时不可用（${e.status??'网络'}），原文已保存。`);
  throw new AIError('Claude 服务连接失败，请稍后重试。');
 }
}
async function compatible(id:string,label:string,baseUrl:string,key:string,model:string,maxTokens:number,o:GenerateOptions){
 const body:Record<string,unknown>={model,stream:false,messages:[{role:'system',content:o.system},{role:'user',content:o.user}]};
 // OpenAI reasoning models only accept max_completion_tokens.
 body[id==='openai'?'max_completion_tokens':'max_tokens']=maxTokens;
 if(o.json)body.response_format={type:'json_object'};
 if(id==='deepseek')body.thinking={type:'disabled'};
 const response=await fetch(baseUrl+'/chat/completions',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(110000),headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(body)}).catch(e=>{throw new AIError(e instanceof Error&&e.name==='TimeoutError'?'模型响应超时，原文已保存，请稍后重试。':`${label} 服务连接失败，请稍后重试。`);});
 if(!response.ok){const messages:Record<number,string>={400:`${label} 拒绝了请求，请检查模型名称与参数。`,401:`${label} 密钥验证失败，请在后台更新。`,402:`${label} 余额不足，请充值后重试。`,403:`${label} 拒绝访问，请检查密钥权限。`,404:`${label} 找不到该模型或接口，请检查配置。`,429:`${label} 请求较多或额度不足，请稍后重试。`};throw new AIError(messages[response.status]||`${label} 暂时不可用（${response.status}），原文已保存。`);}
 const data=await response.json() as {choices?:{finish_reason?:string;message?:{content?:string}}[]};const choice=data.choices?.[0];
 if(choice?.finish_reason==='length')throw new AIError('模型输出被截断，请缩短原文或调高最大输出。');
 if(!choice?.message?.content)throw new AIError('模型没有返回内容，请重试。');
 return choice.message.content;
}
export function parseJSON<T=Record<string,unknown>>(text:string):T{
 const trimmed=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 try{return JSON.parse(trimmed);}catch{}
 const start=trimmed.indexOf('{'),end=trimmed.lastIndexOf('}');
 if(start>=0&&end>start)try{return JSON.parse(trimmed.slice(start,end+1));}catch{}
 throw new AIError('模型返回的格式有误，请重试。');
}
