import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const account='a'.repeat(32),database='11111111-1111-4111-8111-111111111111';
const fakeWrangler=String.raw`
const fs=require('node:fs');
const a=process.argv.slice(2),file='remote.json',s=JSON.parse(fs.readFileSync(file,'utf8'));
s.calls.push(a);const done=(out,code=0)=>{fs.writeFileSync(file,JSON.stringify(s));console.log(typeof out==='string'?out:JSON.stringify(out));process.exit(code)};
if(a[0]==='whoami')done(s.failAuth?'not authenticated':'Account '+'a'.repeat(32),s.failAuth?1:0);
if(a[0]==='d1'&&a[1]==='list')done(s.failList?'Access denied':s.databases,s.failList?1:0);
if(a[0]==='d1'&&a[1]==='create'){s.databases.push({uuid:'11111111-1111-4111-8111-111111111111',name:a[2]});done('created');}
if(a[0]==='d1'&&a[1]==='migrations')done('migrations complete');
if(a[0]==='d1'&&a[1]==='execute'){
 if(s.badQuery)done('invalid data');
 const sql=a[a.indexOf('--command')+1];let results=[];
 if(sql==='SELECT count(*) n FROM users')results=[{n:s.users||0}];
 else if(sql.includes('SELECT (SELECT count(*)'))results=[{n:s.protectedData||s.users||0}];
 else if(sql.startsWith('SELECT value'))results=s.pending?[{value:s.pending}]:[];
 else if(sql.includes("VALUES('site_origin'")){s.origin=sql.match(/VALUES\('site_origin','([^']+)'/)[1];}
 else if(sql.includes('bootstrap_hash'))s.pending=String(Date.now()+86400000);
 done([{success:true,results}]);
}
if(a[0]==='deploy'){const c=JSON.parse(fs.readFileSync(a[a.indexOf('--config')+1],'utf8'));s.worker=c.name;done('https://'+c.name+'.test.workers.dev');}
if(a[0]==='secret'&&a[1]==='list')done(s.failSecrets?'denied':s.malformedSecrets?{}:s.hasKey?[{name:'DATA_ENCRYPTION_KEY',type:'secret_text'}]:[],s.failSecrets?1:0);
if(a[0]==='secret'&&a[1]==='put'){
 const key=fs.readFileSync(0,'utf8');
 if(fs.readFileSync('work/production-security/DATA_ENCRYPTION_KEY','utf8')!==key)done('backup missing',1);
 if(s.failPut)done('unknown upload result',1);
 s.hasKey=true;done('secret uploaded');
}
done('unexpected '+a.join(' '),1);
`;
async function fixture(remote={},saved){
 await mkdir('work',{recursive:true});const dir=await mkdtemp(resolve('work/deploy-test-'));
 for(const sub of ['scripts','cloudflare','node_modules/wrangler/bin'])await mkdir(join(dir,sub),{recursive:true});
 for(const name of ['deploy.mjs','cf.mjs','prepare-cloudflare.mjs'])await copyFile('scripts/'+name,join(dir,'scripts',name));
 await writeFile(join(dir,'package.json'),JSON.stringify({type:'module',scripts:{build:'node build.mjs'}}));
 await writeFile(join(dir,'build.mjs'),"import fs from 'node:fs';fs.mkdirSync('dist/server',{recursive:true});fs.writeFileSync('dist/server/wrangler.json',JSON.stringify({assets:{directory:'../client'}}));");
 await writeFile(join(dir,'node_modules/wrangler/bin/wrangler.js'),fakeWrangler);
 await writeFile(join(dir,'check-fetch.mjs'),"import fs from 'node:fs';globalThis.fetch=async u=>{const s=JSON.parse(fs.readFileSync('remote.json','utf8'));s.checks??=[];s.checks.push(u);fs.writeFileSync('remote.json',JSON.stringify(s));return new Response('',{status:s.failHealth?503:String(u).endsWith('/api/shares')?401:200})};");
 await writeFile(join(dir,'remote.json'),JSON.stringify({calls:[],databases:[],...remote}));
 if(saved)await writeFile(join(dir,'cloudflare/resources.json'),JSON.stringify(saved));
 const env={...process.env,NODE_OPTIONS:'--import='+join(dir,'check-fetch.mjs')};delete env.CLOUDFLARE_ACCOUNT_ID;delete env.CLOUDFLARE_API_TOKEN;
 return {dir,run:(extra=[])=>spawnSync(process.execPath,['scripts/deploy.mjs',...extra],{cwd:dir,env,encoding:'utf8'}),state:async()=>JSON.parse(await readFile(join(dir,'remote.json'),'utf8')),close:()=>rm(dir,{recursive:true,force:true})};
}
const count=(s,...a)=>s.calls.filter(c=>a.every((x,i)=>c[i]===x)).length;
await test('fresh deployment provisions once, backs up the key before upload and keeps both on rerun',async()=>{
 const f=await fixture();try{
  let r=f.run(['--name=team-library']);assert.equal(r.status,0,r.stdout+r.stderr);
  const saved=JSON.parse(await readFile(join(f.dir,'cloudflare/resources.json'),'utf8'));assert.equal(saved.worker_name,'team-library');
  assert.equal((await f.state()).origin,'https://team-library.test.workers.dev');
  const keyFile=join(f.dir,'work/production-security/DATA_ENCRYPTION_KEY'),key=await readFile(keyFile,'utf8');assert.equal(Buffer.from(key.trim(),'base64url').length,32);assert.equal((await stat(keyFile)).mode&0o777,0o600);
  const setupFile=join(f.dir,'work/bootstrap/管理员初始化.md'),setup=await readFile(setupFile,'utf8');assert.match(setup,/https:\/\/team-library.test.workers.dev\/setup#token=/);assert.ok(!r.stdout.includes('#token='));
  r=f.run();assert.equal(r.status,0,r.stdout+r.stderr);
  assert.equal(await readFile(keyFile,'utf8'),key);assert.equal(await readFile(setupFile,'utf8'),setup);
  const s=await f.state();assert.equal(count(s,'d1','create'),1);assert.equal(count(s,'secret','put'),1);assert.equal(s.checks.length,6);
 }finally{await f.close();}
});
await test('an older deployment with only resource IDs keeps its original Worker, database and key',async()=>{
 const f=await fixture({databases:[{uuid:database,name:'old-hub-db'}],hasKey:true,users:2},{account_id:account,database_id:database});try{
  const r=f.run();assert.equal(r.status,0,r.stdout+r.stderr);const s=await f.state();assert.equal(s.worker,'old-hub');assert.equal(count(s,'d1','create'),0);assert.equal(count(s,'secret','put'),0);assert.equal(s.origin,'https://old-hub.test.workers.dev');assert.equal(existsSync(join(f.dir,'work/bootstrap/管理员初始化.md')),false);
 }finally{await f.close();}
});
for(const [label,remote,saved] of [
 ['login failure',{failAuth:true}],['database list failure',{failList:true}],['missing recorded database',{}, {account_id:account,database_id:database}],
 ['malformed database result',{badQuery:true}],['secret permission failure',{failSecrets:true}],['malformed secret result',{malformedSecrets:true}],['missing key with existing users',{users:1}],['missing key with encrypted configuration',{protectedData:1}],
])await test(label+' aborts without creating a new encryption key',async()=>{
 const f=await fixture(remote,saved);try{const r=f.run();assert.notEqual(r.status,0);const s=await f.state();assert.equal(count(s,'secret','put'),0);assert.equal(existsSync(join(f.dir,'work/production-security/DATA_ENCRYPTION_KEY')),false);if(remote.failAuth||remote.failList||saved)assert.equal(count(s,'deploy'),0);}finally{await f.close();}
});
await test('an uncertain key upload retains the original backup and refuses to rotate it on retry',async()=>{
 const f=await fixture({failPut:true});try{
  let r=f.run();assert.notEqual(r.status,0);const keyFile=join(f.dir,'work/production-security/DATA_ENCRYPTION_KEY'),key=await readFile(keyFile,'utf8');
  r=f.run();assert.notEqual(r.status,0);assert.equal(await readFile(keyFile,'utf8'),key);assert.equal(count(await f.state(),'secret','put'),1);
 }finally{await f.close();}
});
await test('local development placeholder IDs are not reused for a first production deployment',async()=>{
 const f=await fixture({}, {account_id:'local',database_id:'00000000-0000-4000-8000-000000000000'});try{const r=f.run();assert.equal(r.status,0,r.stdout+r.stderr);assert.equal(count(await f.state(),'d1','create'),1);}finally{await f.close();}
});
await test('failed health verification is reported as incomplete deployment',async()=>{
 const f=await fixture({failHealth:true});try{const r=f.run();assert.notEqual(r.status,0);assert.match(r.stderr,/检查未通过/);}finally{await f.close();}
});
