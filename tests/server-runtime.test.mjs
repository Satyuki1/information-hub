import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'node:net';
let built=true;try{await access('dist/server/index.js');}catch{built=false;}
await test('standalone Node server boots safely, persists login and protects private routes', {skip:!built},async()=>{
 const data=await mkdtemp(resolve('work/node-runtime-test-'));const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));const origin='http://127.0.0.1:'+port;
 let child;async function start(){child=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,PORT:String(port),PUBLIC_ORIGIN:origin,DATA_DIR:data},stdio:['ignore','pipe','pipe']});let log='';child.stderr.on('data',x=>log+=x);child.stdout.on('data',x=>log+=x);for(let i=0;i<100;i++){if(child.exitCode!==null)throw new Error('server exited: '+log);try{const r=await fetch(origin+'/api/auth/setup');if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,50));}throw new Error('server did not start');}
 async function stop(){if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}}
 try{await start();const note=await readFile(data+'/setup.md','utf8'),token=note.match(/#token=([\w-]+)/)[1];const key=await readFile(data+'/encryption.key','utf8');
 for(const path of ['/welcome','/docs/en/start','/docs/zh/start','/favicon.svg'])assert.equal((await fetch(origin+path)).status,200,path);
 for(const path of ['/api/shares','/api/export','/api/library'])assert.equal((await fetch(origin+path)).status,401,path);
 const post=(path,value,cookie)=>fetch(origin+path,{method:'POST',headers:{origin,'Content-Type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(value)});
 const bootstrap=await post('/api/auth/setup',{token,username:'testowner',name:'Owner',password:'Test-only-long-password-22'});assert.equal(bootstrap.status,200);const cookie=bootstrap.headers.get('set-cookie').split(';')[0];assert.ok(cookie.startsWith('__Host-info_session='));
 assert.equal((await fetch(origin+'/api/shares',{headers:{cookie}})).status,200);assert.equal((await fetch(origin+'/account',{headers:{cookie}})).status,200);assert.equal((await fetch(origin+'/settings',{headers:{cookie}})).status,200);
 assert.equal((await post('/api/auth/setup',{token,username:'someone',password:'Another-long-password'})).status,409);
 const cross=await fetch(origin+'/api/admin/library',{method:'PUT',headers:{origin:'https://evil.example','Content-Type':'application/json',cookie},body:'{}'});assert.equal(cross.status,403);
 assert.equal((await fetch(origin+'/api/export?format=json',{headers:{cookie}})).status,200);
 await stop();await start();assert.equal(await readFile(data+'/encryption.key','utf8'),key);assert.equal((await post('/api/auth/login',{username:'testowner',password:'Test-only-long-password-22'})).status,200);
 }finally{await stop();await rm(data,{recursive:true,force:true});}
});
