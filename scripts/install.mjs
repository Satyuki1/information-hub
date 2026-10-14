import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {spawnSync} from 'node:child_process';
const options=['local','cloudflare','server'];let target=process.argv.find(a=>a.startsWith('--target='))?.split('=')[1];
if(!target){if(!stdin.isTTY)throw new Error('Choose --target=local, --target=cloudflare, or --target=server.');const rl=createInterface({input:stdin,output:stdout});const answer=await rl.question('Install / 安装位置: 1 本地 Local · 2 Cloudflare · 3 私有服务器 Server [1]: ');rl.close();target=options[Number(answer||1)-1];}
if(!options.includes(target))throw new Error('Unknown installation target.');
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{stdio:'inherit',env:process.env});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);};
if(target==='cloudflare')run('npm',['run','deploy']);
if(target==='local'){run('npm',['run','build']);run(process.execPath,['server/index.mjs']);}
if(target==='server'){
 if(!process.env.HUB_DOMAIN)throw new Error('Set HUB_DOMAIN first, e.g. HUB_DOMAIN=hub.example.com npm run install:hub -- --target=server. Point DNS to this server and allow ports 80/443.');
 run('docker',['compose','up','--build','-d']);
 console.log('Deployed. Owner-only setup file: /data/setup.md in the app container. Read it privately with docker compose exec app cat /data/setup.md.');
}
