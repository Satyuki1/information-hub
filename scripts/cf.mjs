// Small helpers shared by the deploy, setup-link and reset-password scripts.
// Every Cloudflare call goes through the project's pinned Wrangler.
import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,chmod} from 'node:fs/promises';
import {existsSync,readFileSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
export const path=p=>fileURLToPath(new URL(p,root));
const wranglerBin=path('node_modules/wrangler/bin/wrangler.js');
export const CONFIG='dist/server/wrangler.cloudflare.json';
export function wrangler(args,{input,inherit=false,env={}}={}){
 const r=spawnSync(process.execPath,[wranglerBin,...args],{cwd:path('.'),input,encoding:'utf8',stdio:inherit?['inherit','inherit','inherit']:['pipe','pipe','pipe'],env:{...process.env,WRANGLER_SEND_METRICS:'false',...env}});
 return {ok:r.status===0,out:(r.stdout||'')+(r.stderr||''),stdout:r.stdout||''};
}
export function run(cmd,args){const r=spawnSync(cmd,args,{cwd:path('.'),stdio:'inherit',shell:process.platform==='win32'});if(r.status!==0)fail(`命令失败：${cmd} ${args.join(' ')}`);}
export function fail(message){console.error(`\n✖ ${message}\n`);process.exit(1);}
export const step=message=>console.log(`\n▸ ${message}`);
export async function resources(){const file=path('cloudflare/resources.json');return existsSync(file)?JSON.parse(await readFile(file,'utf8')):{};}
export async function saveResources(value){await writeFile(path('cloudflare/resources.json'),JSON.stringify(value,null,2)+'\n');}
// Wrangler may print warnings such as "▲ [WARNING] …" before the JSON payload.
export function parseJSON(text){for(const m of text.matchAll(/^[ \t]*[[{]/gm)){try{return JSON.parse(text.slice(m.index).trim());}catch{}}return null;}
// Remote calls address the database by name so they work without a build; local calls use the dev config.
export function d1(sql,{local=false}={}){const saved=existsSync(path('cloudflare/resources.json'))?JSON.parse(readFileSync(path('cloudflare/resources.json'),'utf8')):{};const r=local?wrangler(['d1','execute','DB','--local','--persist-to','.wrangler/state','--command',sql,'--json','--config',CONFIG]):wrangler(['d1','execute',saved.database_name||'information-hub-db','--remote','--command',sql,'--json'],{env:saved.account_id?{CLOUDFLARE_ACCOUNT_ID:saved.account_id}:{}});if(!r.ok)fail('数据库命令执行失败：\n'+r.out.slice(-800));const data=parseJSON(r.stdout);return Array.isArray(data)?data.flatMap(x=>x.results||[]):[];}
export const sqlString=v=>"'"+String(v).replace(/'/g,"''")+"'";
export const token=()=>randomBytes(32).toString('base64url');
export const sha=v=>createHash('sha256').update(v).digest('base64url');
// Private links are written to ignored work/ files; the terminal shows where they are.
export async function privateNote(dir,name,content){await mkdir(path(dir),{recursive:true,mode:0o700});await chmod(path(dir),0o700);const file=path(`${dir}/${name}`);await writeFile(file,content,{mode:0o600});return file;}
export function args(){const out={};for(const a of process.argv.slice(2)){const m=a.match(/^--([\w-]+)(?:=(.*))?$/);if(m)out[m[1]]=m[2]??true;else(out._??=[]).push(a);}return out;}
export async function issueSetupLink(origin,{local=false}={}){
 const t=token(),expires=Date.now()+86400000;
 d1(`INSERT INTO settings(key,value) SELECT 'bootstrap_hash',${sqlString(sha(t))} WHERE NOT EXISTS(SELECT 1 FROM users) ON CONFLICT(key) DO UPDATE SET value=excluded.value; INSERT INTO settings(key,value) SELECT 'bootstrap_expires',${sqlString(expires)} WHERE NOT EXISTS(SELECT 1 FROM users) ON CONFLICT(key) DO UPDATE SET value=excluded.value;`,{local});
 const url=`${origin}/setup#token=${t}`;
 const file=await privateNote('work/bootstrap','管理员初始化.md',`# 创建 information-hub 超级管理员\n\n[点击设置超级管理员账号和密码](${url})\n\n链接 24 小时内有效，只能使用一次，请勿转发。创建后会显示 20 个密码恢复码，请下载保存。\n\n过期后在项目目录运行 \`npm run setup-link\` 重新生成。\n`);
 return {url,file,expires:new Date(expires).toISOString()};
}
