// Operations reset: issue a one-hour password reset link for any account, including the
// super administrator. Requires Cloudflare access to the production database.
//   npm run reset-password -- <用户名>
//   npm run reset-password -- <用户名> --local --origin=http://localhost:8787
import {args,resources,d1,fail,token,sha,sqlString,privateNote} from './cf.mjs';
import {randomUUID} from 'node:crypto';
const opts=args();const local=!!opts.local;const username=String(opts._?.[0]||'').trim().toLowerCase();
if(username.length>64||!(/^[a-z0-9][a-z0-9_.-]{2,31}$/.test(username)||/^[a-z0-9][a-z0-9._+\-]*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(username)))fail('用法：npm run reset-password -- <用户名>');
const origin=String(opts.origin||(local?'http://localhost:8787':(await resources()).origin||''));
if(!/^https?:\/\/[\w.:-]+$/.test(origin))fail('请用 --origin=https://你的域名 指定站点地址。');
const user=d1(`SELECT id,name,active FROM users WHERE username=${sqlString(username)}`,{local})[0];
if(!user)fail(`找不到用户 ${username}。`);
if(!user.active)fail(`用户 ${username} 已停用，请先在后台启用。`);
const t=token();
d1(`DELETE FROM user_tokens WHERE user_id=${sqlString(user.id)} AND kind='reset'; INSERT INTO user_tokens(id,user_id,kind,hash,sealed,created_at,expires) VALUES(${sqlString(randomUUID())},${sqlString(user.id)},'reset',${sqlString(sha(t))},'',${sqlString(new Date().toISOString())},${Date.now()+3600000});`,{local});
const url=`${origin}/reset#token=${t}`;
const file=await privateNote('work/reset',`${username}.md`,`# 重置 ${user.name}（@${username}）的密码\n\n[打开链接设置新密码](${url})\n\n1 小时内有效，只能使用一次。设置后该账号在其他设备上的登录会全部退出。\n`);
console.log(`✔ 已为 @${username} 生成 1 小时有效的重置链接，保存在：${file}`);
