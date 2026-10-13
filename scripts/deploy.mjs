// First deployment and upgrades share one entry point. Fail closed when remote
// state is unknown; never silently rebind an existing instance or rotate its key.
import {existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {wrangler,run,fail,step,resources,saveResources,parseJSON,d1,args,issueSetupLink,privateNote,path,sqlString,CONFIG} from './cf.mjs';
const opts=args();
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22||(major===22&&minor<13))fail(`需要 Node.js 22.13 或更高版本（当前 ${process.versions.node}）。`);
if(!existsSync(path('node_modules/wrangler/bin/wrangler.js')))fail('请先运行 npm ci 安装依赖。');

step('检查 Cloudflare 登录');
const who=wrangler(['whoami']);
if(!who.ok||/not authenticated/i.test(who.out))fail('无法确认 Cloudflare 登录。请运行 npx wrangler whoami 检查权限；未登录时运行 npx wrangler login，或配置 CLOUDFLARE_API_TOKEN。');
let saved=await resources();
// A local preview is not a production account binding.
if(saved.account_id==='local')saved={};
const accounts=[...new Set(who.out.match(/\b[0-9a-f]{32}\b/g)||[])];
const account=process.env.CLOUDFLARE_ACCOUNT_ID||saved.account_id||(accounts.length===1?accounts[0]:'');
if(!account)fail(`请设置 CLOUDFLARE_ACCOUNT_ID 选择部署账号。检测到：${accounts.join(', ')||'无可用账号'}`);
if(!/^[0-9a-f]{32}$/.test(account))fail('Cloudflare 账号 ID 无效，请检查 cloudflare/resources.json 或环境变量。');
if(saved.account_id&&saved.account_id!==account)fail('当前账号与已有部署记录不一致。请在独立目录部署新实例，避免改绑现有数据库。');
if(saved.worker_name&&opts.name&&saved.worker_name!==opts.name)fail('已有部署不支持通过 --name 改名。请在独立目录部署新实例。');
const env={CLOUDFLARE_ACCOUNT_ID:account};

step('确认部署资源');
const listed=wrangler(['d1','list','--json'],{env});
const databases=parseJSON(listed.stdout);
if(!listed.ok||!Array.isArray(databases))fail('无法读取 D1 数据库列表，已停止部署，请检查账号和权限。');
const existing=saved.database_id?databases.find(d=>d.uuid===saved.database_id):null;
if(saved.database_id&&!existing)fail('当前账号中找不到已记录的数据库，已停止部署；不会另建数据库替代。');
if(existing&&saved.database_name&&saved.database_name!==existing.name)fail('已记录的数据库名称与 ID 不一致，请核对 cloudflare/resources.json。');
if(existing&&opts.db&&opts.db!==existing.name)fail('已有数据库不能通过 --db 改绑，请在独立目录部署新实例。');
// Older releases saved only account_id/database_id. The old database used the
// <worker>-db convention; preserve that Worker instead of defaulting to a new one.
const legacyName=!saved.worker_name&&existing?.name.endsWith('-db')?existing.name.slice(0,-3):'';
if(existing&&!saved.worker_name&&!legacyName&&!opts.name)fail('旧部署缺少 Worker 名称，请通过 --name=原Worker名称 明确指定。');
const workerName=String(opts.name||saved.worker_name||legacyName||'information-hub');
if(!/^[a-z0-9][a-z0-9-]{0,62}$/.test(workerName))fail('Worker 名称需为 1–63 位小写字母、数字或横线。');
const databaseName=String(existing?.name||opts.db||saved.database_name||`${workerName}-db`);
if(!/^[\w-]{1,63}$/.test(databaseName))fail('数据库名称需为 1–63 位字母、数字、下划线或横线。');
const explicitOrigin=opts.origin||saved.origin||'';
if(explicitOrigin&&!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(explicitOrigin))fail('--origin 必须是 HTTPS 站点地址，不含路径、查询或片段。');
console.log(`  账号 ${account} · Worker ${workerName} · 数据库 ${databaseName}`);
let databaseId=existing?.uuid||databases.find(d=>d.name===databaseName)?.uuid;
if(!databaseId){
 const created=wrangler(['d1','create',databaseName],{env});
 if(!created.ok)fail('创建数据库失败：\n'+created.out.slice(-800));
 const relisted=wrangler(['d1','list','--json'],{env});
 const data=parseJSON(relisted.stdout);
 if(!relisted.ok||!Array.isArray(data))fail('数据库创建后无法确认 ID，请重试部署；会复用同名数据库。');
 databaseId=data.find(d=>d.name===databaseName)?.uuid;
 if(!databaseId)fail('无法确定新数据库 ID，请检查 npx wrangler d1 list 的输出。');
}
await saveResources({...saved,account_id:account,database_id:databaseId,worker_name:workerName,database_name:databaseName});

step('构建');
run('npm',['run','build']);
run(process.execPath,['scripts/prepare-cloudflare.mjs']);

step('应用数据库迁移');
const migrated=wrangler(['d1','migrations','apply','DB','--remote','--config',CONFIG],{env:{...env,CI:'true'}});
console.log(migrated.out.split('\n').filter(l=>/✅|migrat|No migrations/i.test(l)).slice(-12).join('\n'));
if(!migrated.ok)fail('数据库迁移失败：\n'+migrated.out.slice(-1200));
const users=d1('SELECT count(*) n FROM users')[0]?.n;
if(!Number.isInteger(users))fail('无法确认管理员状态，已停止部署。');

step('发布 Worker');
const deployed=wrangler(['deploy','--config',CONFIG],{env});
if(!deployed.ok)fail('发布失败：\n'+deployed.out.slice(-1500));
const origin=String(explicitOrigin||deployed.out.match(/https:\/\/[\w.-]+\.workers\.dev/)?.[0]||'');
if(!origin)fail('Worker 已发布，但无法确定访问地址。请使用 --origin=https://你的域名 重新部署。');
await saveResources({...(await resources()),origin});
// Scheduled jobs have no request to derive the deployment hostname from.
d1(`INSERT INTO settings(key,value) VALUES('site_origin',${sqlString(origin)}) ON CONFLICT(key) DO UPDATE SET value=excluded.value;`);
console.log(`  已发布：${origin}`);

step('检查加密主密钥');
const listedSecrets=wrangler(['secret','list','--config',CONFIG],{env});
const secrets=parseJSON(listedSecrets.stdout);
if(!listedSecrets.ok||!Array.isArray(secrets)||secrets.some(s=>typeof s.name!=='string'))fail('无法读取 Worker Secret 列表，已停止；不会生成或替换加密主密钥。请检查权限后重试。');
if(!secrets.some(s=>s.name==='DATA_ENCRYPTION_KEY')){
 const protectedData=d1("SELECT (SELECT count(*) FROM users)+(SELECT count(*) FROM feishu_connections)+(SELECT count(*) FROM settings WHERE key IN ('app_secrets','feishu_app')) n")[0]?.n;
 if(!Number.isInteger(protectedData)||protectedData>0||existsSync(path('work/production-security/DATA_ENCRYPTION_KEY')))fail('Worker 缺少加密主密钥，但数据库或本地已有凭证。请先从原备份恢复 DATA_ENCRYPTION_KEY；不会生成新密钥覆盖。');
 const key=randomBytes(32).toString('base64url');
 // Persist before upload so an interrupted request cannot lose the encryption key.
 const file=await privateNote('work/production-security','DATA_ENCRYPTION_KEY',key+'\n',{exclusive:true});
 const put=wrangler(['secret','put','DATA_ENCRYPTION_KEY','--config',CONFIG],{input:key+'\n',env});
 if(!put.ok)fail(`密钥写入未确认。备份已保存在 ${file}，请核对远端后恢复此备份，勿生成新密钥。`);
 console.log(`  已生成并备份到 ${file}，请另行安全保存。`);
}else console.log('  已存在，保持不变。');

step('检查管理员初始化');
const pending=d1("SELECT value FROM settings WHERE key='bootstrap_expires'")[0]?.value;
if(users>0)console.log(`  已有 ${users} 个账号。`);
else if(pending&&Number(pending)>Date.now()&&existsSync(path('work/bootstrap/管理员初始化.md'))&&!opts['new-setup-link'])console.log(`  请打开 ${path('work/bootstrap/管理员初始化.md')} 中的初始化链接（有效期至 ${new Date(Number(pending)).toLocaleString('zh-CN')}）。`);
else {const link=await issueSetupLink(origin);console.log(`  已生成一次性初始化链接（24 小时有效）：${link.file}\n  由网站所有者本人设置账号和密码。`);}

step('验证公开页面与访问控制');
for(const [route,expected] of [['/welcome',200],['/setup',200],['/api/shares',401]]){
 const response=await fetch(origin+route,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Mozilla/5.0 information-hub-deploy'}});
 await response.body?.cancel();
 if(response.status!==expected)fail(`发布已完成，但 ${route} 检查未通过（${response.status}，预期 ${expected}）。请检查站点运行状态。`);
 console.log(`  ${route} → ${response.status}`);
}
console.log(`\n✔ 部署完成：${origin}\n  · 后台 /admin 中配置模型、抓取渠道与推送\n  · 成员在 /shortcut 获取快捷指令，在“我的账号 → AI 接入”获取 MCP 令牌\n`);
