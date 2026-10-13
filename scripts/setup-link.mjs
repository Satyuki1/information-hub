// Issue a fresh one-time link for creating the super administrator (only while no account exists).
//   npm run setup-link              # production (uses origin saved by npm run deploy)
//   npm run setup-link -- --local --origin=http://localhost:8787
import {args,resources,issueSetupLink,d1,fail} from './cf.mjs';
const opts=args();const local=!!opts.local;
const origin=String(opts.origin||(local?'http://localhost:8787':(await resources()).origin||''));
if(!/^https?:\/\/[\w.:-]+$/.test(origin))fail('请用 --origin=https://你的域名 指定站点地址。');
if((d1('SELECT count(*) n FROM users',{local})[0]?.n||0)>0)fail('系统已有账号，不需要初始化。忘记密码请使用恢复码，或运行 npm run reset-password -- <用户名>。');
const link=await issueSetupLink(origin,{local});
console.log(`✔ 已生成初始化链接（有效期至 ${link.expires}），保存在：${link.file}`);
