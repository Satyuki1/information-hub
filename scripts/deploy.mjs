// One-command deployment to Cloudflare Workers + D1. Safe to re-run: it reuses the
// existing database and encryption key, applies pending migrations and redeploys.
//   npm run deploy                      # first deploy or update
//   npm run deploy -- --name=my-hub     # custom Worker / database name on first deploy
import {chmod} from 'node:fs/promises';
import {wrangler,run,fail,step,resources,saveResources,parseJSON,d1,args,issueSetupLink,privateNote,CONFIG} from './cf.mjs';
import {randomBytes} from 'node:crypto';
const opts=args();
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22||(major===22&&minor<13))fail(`需要 Node.js 22.13 或更高版本（当前 ${process.versions.node}）。`);

step('检查 Cloudflare 登录');
const who=wrangler(['whoami']);
if(/not authenticated/i.test(who.out)&&!process.env.CLOUDFLARE_API_TOKEN)fail('尚未登录 Cloudflare。请先运行 `npx wrangler login`（需要本人在浏览器中授权），或设置 CLOUDFLARE_API_TOKEN 环境变量后重试。');
const saved=await resources();
const accounts=[...new Set(who.out.match(/\b[0-9a-f]{32}\b/g)||[])];
const account=process.env.CLOUDFLARE_ACCOUNT_ID||saved.account_id||(accounts.length===1?accounts[0]:'');
if(!account)fail(`检测到多个 Cloudflare 账号：${accounts.join(', ')}。请设置 CLOUDFLARE_ACCOUNT_ID 后重试。`);
const env={CLOUDFLARE_ACCOUNT_ID:account};
const workerName=String(opts.name||saved.worker_name||'information-hub');
const databaseName=String(opts.db||saved.database_name||`${workerName}-db`);
console.log(`  账号 ${account} · Worker ${workerName} · 数据库 ${databaseName}`);

step('准备 D1 数据库');
let databaseId=saved.database_id;
if(!databaseId){
 const list=parseJSON(wrangler(['d1','list','--json'],{env}).stdout)||[];
 databaseId=list.find(d=>d.name===databaseName)?.uuid;
 if(!databaseId){const created=wrangler(['d1','create',databaseName],{env});if(!created.ok)fail('创建数据库失败：\n'+created.out.slice(-800));databaseId=(parseJSON(wrangler(['d1','list','--json'],{env}).stdout)||[]).find(d=>d.name===databaseName)?.uuid;}
 if(!databaseId)fail('无法确定数据库 ID，请检查 `npx wrangler d1 list` 的输出。');
 console.log(`  使用数据库 ${databaseId}`);
}
await saveResources({...saved,account_id:account,database_id:databaseId,worker_name:workerName,database_name:databaseName});

step('构建');
run('npm',['run','build']);
run(process.execPath,['scripts/prepare-cloudflare.mjs']);

step('应用数据库迁移');
const migrated=wrangler(['d1','migrations','apply','DB','--remote','--config',CONFIG],{env:{...env,CI:'true'}});
console.log(migrated.out.split('\n').filter(l=>/✅|migrat|No migrations/i.test(l)).slice(-12).join('\n'));
if(!migrated.ok)fail('数据库迁移失败：\n'+migrated.out.slice(-1200));

step('发布 Worker');
const deployed=wrangler(['deploy','--config',CONFIG],{env});
if(!deployed.ok)fail('发布失败：\n'+deployed.out.slice(-1500));
const origin=String(opts.origin||deployed.out.match(/https:\/\/[\w.-]+\.workers\.dev/)?.[0]||saved.origin||'');
console.log(`  已发布：${origin||'（请在 Cloudflare 控制台查看访问地址）'}`);

step('检查加密主密钥');
const secrets=wrangler(['secret','list','--config',CONFIG],{env});
if(!/DATA_ENCRYPTION_KEY/.test(secrets.out)){
 // Generated once and backed up locally; losing it invalidates passwords and stored keys.
 const key=randomBytes(32).toString('base64url');
 const put=wrangler(['secret','put','DATA_ENCRYPTION_KEY','--config',CONFIG],{input:key+'\n',env});
 if(!put.ok)fail('写入 DATA_ENCRYPTION_KEY 失败：\n'+put.out.slice(-800));
 const file=await privateNote('work/production-security','DATA_ENCRYPTION_KEY',key+'\n');await chmod(file,0o600);
 console.log(`  已生成 DATA_ENCRYPTION_KEY，并备份到 ${file}（请另行安全保存，切勿提交到 Git）。`);
}else console.log('  已存在，保持不变。');
await saveResources({...(await resources()),origin});

step('检查管理员');
const users=d1('SELECT count(*) n FROM users')[0]?.n||0;
const pending=d1("SELECT value FROM settings WHERE key='bootstrap_expires'")[0]?.value;
if(users>0)console.log(`  已有 ${users} 个账号。`);
else if(pending&&Number(pending)>Date.now()&&!opts['new-setup-link'])console.log(`  尚未创建超级管理员，已有初始化链接（${new Date(Number(pending)).toLocaleString('zh-CN')} 前有效）。如需新链接：npm run setup-link`);
else if(origin){const link=await issueSetupLink(origin);console.log(`  已生成一次性初始化链接（24 小时有效），保存在：${link.file}\n  由网站所有者本人打开，设置超级管理员账号和密码。`);}

console.log(`\n✔ 部署完成${origin?`：${origin}`:''}\n  · 后台 /admin 中配置模型、抓取渠道与推送\n  · 成员在 /shortcut 获取快捷指令，在“我的账号 → AI 接入”获取 MCP 令牌\n`);
