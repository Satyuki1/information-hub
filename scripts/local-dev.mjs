// One command for a working local copy: build, local D1 with migrations, a local-only
// encryption key, a setup link for the first administrator, then `wrangler dev`.
//   npm run dev:local
import {existsSync} from 'node:fs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {wrangler,run,step,fail,saveResources,d1,issueSetupLink,path,CONFIG} from './cf.mjs';
if(!existsSync(path('node_modules/wrangler')))fail('请先运行 npm ci 安装依赖。');
if(!existsSync(path('cloudflare/resources.json')))await saveResources({account_id:'local',database_id:'00000000-0000-4000-8000-000000000000',worker_name:'information-hub',database_name:'information-hub-db'});
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
run('npm',['start']);
