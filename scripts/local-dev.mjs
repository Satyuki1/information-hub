// One command for a working local copy: build, local D1 with migrations, a local-only
// encryption key, a setup link for the first administrator, then `wrangler dev`.
//   npm run dev:local
import {existsSync} from 'node:fs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {wrangler,run,step,fail,saveResources,d1,issueSetupLink,path,CONFIG} from './cf.mjs';
if(!existsSync(path('node_modules/wrangler')))fail('请先运行 npm ci 安装依赖。');
if(!existsSync(path('cloudflare/resources.json')))await saveResources({account_id:'local',database_id:'00000000-0000-4000-8000-000000000000',worker_name:'x-to-group',database_name:'x-to-group-db'});
step('构建');run('npm',['run','build']);run(process.execPath,['scripts/prepare-cloudflare.mjs']);
step('本地加密主密钥');
const backup=path('work/local.dev.vars');
if(!existsSync(backup)){await mkdir(path('work'),{recursive:true});await writeFile(backup,`DATA_ENCRYPTION_KEY=${randomBytes(32).toString('base64url')}\n`,{mode:0o600});}
await writeFile(path('dist/server/.dev.vars'),await readFile(backup),{mode:0o600});
step('本地数据库迁移');
const migrated=wrangler(['d1','migrations','apply','DB','--local','--persist-to','.wrangler/state','--config',CONFIG],{env:{CI:'true'}});
if(!migrated.ok)fail(migrated.out.slice(-800));
d1("INSERT INTO settings(key,value) VALUES('site_origin','http://localhost:8787') ON CONFLICT(key) DO UPDATE SET value=excluded.value;",{local:true});
if(!(d1('SELECT count(*) n FROM users',{local:true})[0]?.n)){const link=await issueSetupLink('http://localhost:8787',{local:true});console.log(`  首次使用：打开 ${link.file} 中的链接创建本地管理员。`);}
step('启动 http://localhost:8787');
// The prebuilt, no_bundle Worker skips Wrangler's test-scheduled middleware.
// Generate a local-only authenticated adapter; production keeps its original entry.
const schedulerToken=randomBytes(32).toString('base64url');
const localConfig=JSON.parse(await readFile(path(CONFIG),'utf8'));
localConfig.main='local-worker.js';
await writeFile(path('dist/server/wrangler.local.json'),JSON.stringify(localConfig,null,2)+'\n');
await writeFile(path('dist/server/local-worker.js'),`import worker from './index.js';
export default {...worker,async fetch(request,env,ctx){
 if(new URL(request.url).pathname!=='/__local_scheduled')return worker.fetch(request,env,ctx);
 if(request.method!=='POST'||request.headers.get('Authorization')!==${JSON.stringify('Bearer '+schedulerToken)})return new Response('Forbidden',{status:403});
 await worker.scheduled({scheduledTime:Date.now(),cron:'* * * * *',noRetry(){}},env,ctx);
 return new Response('Ran local scheduled event');
}};\n`,{mode:0o600});
const server=spawn(process.execPath,[path('node_modules/wrangler/bin/wrangler.js'),'dev','--config','dist/server/wrangler.local.json','--local','--persist-to','.wrangler/state','--ip','127.0.0.1','--port','8787','--inspector-port','0'],{cwd:path('.'),stdio:'inherit',env:process.env});
let running=false,failed=false;
const timer=setInterval(async()=>{if(running)return;running=true;try{const r=await fetch('http://127.0.0.1:8787/__local_scheduled',{method:'POST',headers:{Authorization:'Bearer '+schedulerToken},redirect:'error',signal:AbortSignal.timeout(180000)});if(!r.ok||await r.text()!=='Ran local scheduled event')throw new Error('scheduled failed');if(failed)console.log('本地定时任务已恢复。');failed=false;}catch{if(!failed)console.warn('本地定时任务暂未完成，将在下一轮重试。');failed=true;}finally{running=false;}},60000);
const stop=signal=>{clearInterval(timer);server.kill(signal);};
process.on('SIGINT',()=>stop('SIGINT'));process.on('SIGTERM',()=>stop('SIGTERM'));
server.on('error',error=>{clearInterval(timer);console.error(error.message);process.exitCode=1;});
server.on('exit',code=>{clearInterval(timer);process.exitCode=code??0;});
console.log('本地定时任务已启用：每分钟检查收录、订阅与归档队列。');
