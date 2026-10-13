// Run after migrations. Emits a SQL file with a hash, plus a private one-use URL.
// Never commits credentials and never overwrites an existing administrator.
import {randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile,chmod} from 'node:fs/promises';
const origin=process.argv[2];
if(!origin||!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(origin))throw new Error('Usage: node scripts/bootstrap-admin.mjs https://YOUR-WORKER.workers.dev');
const token=randomBytes(32).toString('base64url');
const hash=createHash('sha256').update(token).digest('base64url');
const expires=Date.now()+86400000;
await mkdir('work/bootstrap',{recursive:true,mode:0o700});await chmod('work/bootstrap',0o700);
const sql=`INSERT INTO settings(key,value) SELECT 'bootstrap_hash','${hash}' WHERE NOT EXISTS(SELECT 1 FROM users) ON CONFLICT(key) DO UPDATE SET value=excluded.value;\nINSERT INTO settings(key,value) SELECT 'bootstrap_expires','${expires}' WHERE NOT EXISTS(SELECT 1 FROM users) ON CONFLICT(key) DO UPDATE SET value=excluded.value;\n`;
await writeFile('work/bootstrap/setup.sql',sql,{mode:0o600});
const url=origin+'/setup#token='+token;
await writeFile('work/bootstrap/admin-setup.json',JSON.stringify({url,expires:new Date(expires).toISOString()}),{mode:0o600});
await writeFile('work/bootstrap/管理员初始化.md',`# 创建资讯汇集管理员\n\n[点击设置自己的管理员账号](${url})\n\n链接 24 小时有效，只能初始化一次。请勿转发。\n\n登录后进入「管理后台 → 飞书归档」，按指引创建应用、连接自己的账号、创建知识库并开启自动归档。\n`,{mode:0o600});
console.log('Bootstrap hash SQL: work/bootstrap/setup.sql\nPrivate setup link: work/bootstrap/管理员初始化.md (24h, one use)');
