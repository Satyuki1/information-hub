import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,writeFile,mkdtemp,mkdir,rm,readdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import ts from 'typescript';
// Same in-process harness as security.test.mjs: real SQLite, Web Crypto and transpiled sources.
await mkdir('work',{recursive:true});
const dir=await mkdtemp(resolve('work/platform-test-'));
const sources=['lib/auth.ts','lib/content.ts','lib/feishu-document.ts','lib/feishu.ts','lib/shares.ts','lib/x-preview.ts','lib/x-content.ts','lib/x-source.ts','lib/config.ts','lib/ai.ts','lib/push.ts','lib/wecom-message.ts','lib/reports.ts','lib/subscriptions.ts','lib/admin-api.ts','lib/mcp.ts','db/index.ts','db/schema.ts','cloudflare/worker.ts','app/api/shares/route.ts','app/api/collect/route.ts'];
for(const path of sources){let code=await readFile(path,'utf8');code=code.replace(/import\s*\{\s*env\s*\}\s*from\s*['"]cloudflare:workers['"];?/g,'const env=globalThis.securityEnv;').replace("import handler from 'vinext/server/fetch-handler';",'const handler={fetch:(...args)=>globalThis.securityHandler(...args)};');code=code.replace(/(from\s*['"])(\.{1,2}\/[^'"]+)(['"])/g,(_,pre,name,post)=>pre+name+(name.endsWith('/db')?'/index.mjs':'.mjs')+post);await mkdir(dirname(join(dir,path)),{recursive:true});await writeFile(join(dir,path.replace(/\.ts$/,'.mjs')),ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);}
const sql=new DatabaseSync(':memory:');for(const file of (await readdir('drizzle')).filter(p=>p.endsWith('.sql')).sort())sql.exec(await readFile('drizzle/'+file,'utf8'));
function statement(query,args=[]){return {bind(...a){return statement(query,a)},async first(column){const r=sql.prepare(query).get(...args);return (column?r?.[column]:r)||null},async run(){const result=sql.prepare(query).run(...args);return {success:true,meta:{changes:Number(result.changes)}}},async all(){return {results:sql.prepare(query).all(...args)}},async raw(){const s=sql.prepare(query);s.setReturnArrays(true);return s.all(...args)}};}
globalThis.securityEnv={DB:{prepare:statement,async batch(statements){sql.exec('BEGIN');try{const promises=statements.map(s=>s.run());sql.exec('COMMIT');return Promise.all(promises);}catch(e){sql.exec('ROLLBACK');throw e;}}},DATA_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64url'),DEEPSEEK_API_KEY:'sk-env-fallback-key'};
const auth=await import(join(dir,'lib/auth.mjs'));
const config=await import(join(dir,'lib/config.mjs'));
const shares=await import(join(dir,'lib/shares.mjs'));
const subs=await import(join(dir,'lib/subscriptions.mjs'));
const reports=await import(join(dir,'lib/reports.mjs'));
const push=await import(join(dir,'lib/push.mjs'));
const worker=(await import(join(dir,'cloudflare/worker.mjs'))).default;
const shareRoutes=await import(join(dir,'app/api/shares/route.mjs'));
const collect=await import(join(dir,'app/api/collect/route.mjs'));
globalThis.securityHandler=async request=>{const path=new URL(request.url).pathname;if(path==='/api/shares')return shareRoutes[request.method](request);if(path==='/api/collect')return collect.POST(request);return new Response('page',{status:200});};
const origin='https://reading.example.com';const originalFetch=globalThis.fetch;
function req(path,value,session,method=value===undefined?'GET':'POST',headers={}){return new Request(origin+path,{method,headers:{...(value!==undefined?{'Content-Type':'application/json',origin}:{}),...(session?{cookie:session}:{}),...headers},body:value===undefined?undefined:JSON.stringify(value)});}
async function call(path,value,session,method,headers){const r=await worker.fetch(req(path,value,session,method,headers),globalThis.securityEnv,{waitUntil(){}});return {r,d:await r.clone().json().catch(()=>null)};}
const cookieOf=r=>r.headers.get('set-cookie').split(';')[0];
async function addUser(username,role='admin',owner=0){const id=crypto.randomUUID();sql.prepare("INSERT INTO users(id,username,name,password_hash,role,must_change,created_at,owner) VALUES(?,?,?,?,?,0,?,?)").run(id,username,username.toUpperCase(),await auth.passwordHash('Long-enough-test-pass'),role,new Date().toISOString(),owner);return id;}
async function login(username){const {r}=await call('/api/auth/login',{username,password:'Long-enough-test-pass'});assert.equal(r.status,200);return cookieOf(r);}
await test('deployment origin is explicit and never points another instance at the original owner',async()=>{
 await assert.rejects(config.siteOrigin(),e=>e.status===503);
 await auth.setSetting('site_origin',origin);
 assert.equal(await config.siteOrigin(),origin);
});
const ownerId=await addUser('owner','admin',1);const adminCookie=await login('owner');
const memberId=await addUser('reader','member');const memberCookie=await login('reader');
const deepseekReply=(content)=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(content)}}]}),{headers:{'Content-Type':'application/json'}});
try{
 await test('configuration center seals secrets, never returns them, and falls back to deployment secrets',async()=>{
  assert.equal((await call('/api/admin/config',undefined,memberCookie)).r.status,403);
  let {r,d}=await call('/api/admin/config',undefined,adminCookie);assert.equal(r.status,200);
  assert.equal(d.secrets['ai:deepseek'].source,'部署环境变量');assert.ok(!JSON.stringify(d).includes('sk-env-fallback-key'));
  ({r,d}=await call('/api/admin/config',{config:{ai:{provider:'openai',model:'gpt-test'},site:{name:'测试站'}},secrets:{'ai:openai':'sk-db-secret-value-1234',feishuWebhook:'https://open.feishu.cn/open-apis/bot/v2/hook/abc-123',feishuSecret:'sign-secret'}},adminCookie,'PUT'));
  assert.equal(r.status,200);assert.equal(d.config.ai.provider,'openai');assert.equal(d.secrets['ai:openai'].source,'后台设置');assert.match(d.secrets['ai:openai'].hint,/1234$/);
  const stored=sql.prepare("SELECT value FROM settings WHERE key='app_secrets'").get().value;assert.ok(!stored.includes('sk-db-secret'));assert.ok(!JSON.stringify(d).includes('sk-db-secret-value'));
  assert.equal((await call('/api/admin/config',{secrets:{wecomWebhook:'https://evil.example/hook'}},adminCookie,'PUT')).r.status,400);
  assert.equal((await call('/api/admin/config',{config:{ai:{baseUrl:'https://127.0.0.1/v1'}}},adminCookie,'PUT')).r.status,400);
  assert.equal(await config.getSecret('ai:openai'),'sk-db-secret-value-1234');
 });
 await test('OpenAI-compatible providers send the right token parameter; analysis is stored for subscriptions',async()=>{
  const bodies=[];globalThis.fetch=async(url,init)=>{bodies.push({url:String(url),body:JSON.parse(init.body)});return deepseekReply({title:'标题',summary:'摘要',translation:'译文',category:'人工智能',tags:['模型'],analysis:'- 与关注方向相关',score:88});};
  await call('/api/admin/config',{config:{analysis:{enabled:true,focus:'AI 产品发布',scope:'subscriptions'}}},adminCookie,'PUT');
  sql.prepare("INSERT INTO shares(id,fingerprint,title,original,status,shared_at,updated_at,source) VALUES('s1','f-s1','t','Original text','pending',?,?,'subscription')").run(new Date().toISOString(),new Date().toISOString());
  await shares.processShare('s1');
  assert.equal(bodies[0].url,'https://api.openai.com/v1/chat/completions');assert.equal(bodies[0].body.max_completion_tokens>0,true);assert.equal(bodies[0].body.max_tokens,undefined);assert.match(bodies[0].body.messages[0].content,/AI 产品发布/);
  const row=sql.prepare("SELECT status,analysis,score,translation FROM shares WHERE id='s1'").get();assert.deepEqual({...row},{status:'ready',analysis:'- 与关注方向相关',score:88,translation:'译文'});
  await call('/api/admin/config',{config:{ai:{provider:'deepseek',model:''}}},adminCookie,'PUT');bodies.length=0;
  sql.prepare("INSERT INTO shares(id,fingerprint,title,original,status,shared_at,updated_at) VALUES('s2','f-s2','t','Plain share','pending',?,?)").run(new Date().toISOString(),new Date().toISOString());
  await shares.processShare('s2');assert.equal(bodies[0].url,'https://api.deepseek.com/chat/completions');assert.deepEqual(bodies[0].body.thinking,{type:'disabled'});assert.ok(bodies[0].body.max_tokens>0);assert.doesNotMatch(bodies[0].body.messages[0].content,/定向分析的关注方向/);
  assert.equal(sql.prepare("SELECT score FROM shares WHERE id='s2'").get().score,-1);
 });
 await test('magic links sign in link-only accounts, can be revoked, and stop working when disabled',async()=>{
  const {r,d}=await call('/api/admin/users',{name:'免密',username:'linkuser',loginType:'link',role:'member',days:7},adminCookie);assert.equal(r.status,201);
  const token=new URL(d.magicUrl).hash.split('token=')[1];assert.ok(token.length>=43);
  assert.equal((await call('/api/auth/login',{username:'linkuser',password:'anything-long-enough'})).r.status,401);
  const signed=await call('/api/auth/magic',{token});assert.equal(signed.r.status,200);assert.equal(signed.d.user.loginType,'link');assert.equal(signed.d.user.mustChange,false);
  assert.equal((await call('/api/shares',undefined,cookieOf(signed.r))).r.status,200);
  assert.equal((await call('/api/collect',{input:'hello',token},undefined,'POST',{origin:''})).r.status,403,'magic token is not a share token');
  await call(`/api/admin/users/${d.id}/magic`,{},adminCookie,'DELETE');assert.equal((await call('/api/auth/magic',{token})).r.status,401);
  const again=(await call(`/api/admin/users/${d.id}/magic`,{days:0},adminCookie)).d.magicUrl.split('token=')[1];assert.equal((await call('/api/auth/magic',{token:again})).r.status,200);
  await call(`/api/admin/users/${d.id}`,{active:false},adminCookie,'PATCH');assert.equal((await call('/api/auth/magic',{token:again})).r.status,401);
  assert.equal((await call(`/api/admin/users/${ownerId}`,{active:false},adminCookie,'PATCH')).r.status,400);
 });
 await test('personal shortcut tokens attribute public submissions without leaking content',async()=>{
  const {d}=await call('/api/me/shortcut',undefined,memberCookie);assert.match(d.token,/^ihub_[\w-]{43}$/);
  assert.equal((await call('/api/me/shortcut',undefined,memberCookie)).d.token,d.token,'token is stable until reset');
  const res=await call('/api/collect',{input:'分享一段文字 https://example.com/post',token:d.token},undefined,'POST',{origin:''});
  assert.equal(res.r.status,202);assert.deepEqual(Object.keys(res.d).sort(),['accepted','message']);assert.match(res.d.message,/READER/);
  const row=sql.prepare("SELECT sharer,sharer_id FROM shares WHERE url='https://example.com/post'").get();assert.deepEqual({...row},{sharer:'READER',sharer_id:memberId});
  assert.equal((await call('/api/collect',{input:'x',token:'ihub_'+'a'.repeat(43)},undefined,'POST',{origin:''})).r.status,403);
  const reset=(await call('/api/me/shortcut/reset',{},memberCookie)).d.token;assert.notEqual(reset,d.token);assert.equal((await call('/api/collect',{input:'y',token:d.token},undefined,'POST',{origin:''})).r.status,403);
  await call('/api/admin/config',{config:{site:{anonymousCollect:false}}},adminCookie,'PUT');assert.equal((await call('/api/collect',{input:'anonymous'},undefined,'POST',{origin:''})).r.status,403);
  assert.equal((await call('/api/collect',{input:'still works',token:reset},undefined,'POST',{origin:''})).r.status,202);
  assert.equal((await call('/api/collect?token='+reset,{input:'https://example.com/via-connection-url'},undefined,'POST',{origin:''})).r.status,202);assert.equal(sql.prepare("SELECT sharer_id FROM shares WHERE url='https://example.com/via-connection-url'").get().sharer_id,memberId,'connection URL carries the token');
  await call('/api/admin/config',{config:{site:{anonymousCollect:true}}},adminCookie,'PUT');
  const posted=await call('/api/shares',{original:'成员自己的分享',sharer:'冒名'},memberCookie);assert.equal(posted.d.item.sharer,'READER');
 });
 await test('reading style is a validated per-user preference',async()=>{
  assert.equal((await call('/api/me/preferences',{readingStyle:'red'},memberCookie,'PATCH')).r.status,200);
  assert.equal((await call('/api/auth/me',undefined,memberCookie)).d.user.readingStyle,'red');
  assert.equal((await call('/api/me/preferences',{readingStyle:'myspace'},memberCookie,'PATCH')).r.status,400);
  assert.equal((await call('/api/auth/me',undefined,adminCookie)).d.user.readingStyle,'x');
 });
 await test('subscriptions import only the newest posts first, then only newer ones, skipping replies',async()=>{
  await call('/api/admin/config',{config:{x:{mode:'twitterapi_io',initialCount:2}},secrets:{twitterapi:'tw-key'}},adminCookie,'PUT');
  const tweet=(id,extra={})=>({id,text:`Post ${id}`,author:{name:'Open',userName:'openai',id:'42'},createdAt:'2026-10-13T00:00:00Z',...extra});
  let timeline=[tweet('105'),tweet('104',{isReply:true}),tweet('103'),tweet('102')];const paths=[];
  globalThis.fetch=async url=>{const u=new URL(url);paths.push(u.pathname+u.search);if(u.pathname==='/twitter/user/info')return Response.json({status:'success',data:{id:'42',name:'OpenAI',userName:'OpenAI',profilePicture:'https://pbs.twimg.com/profile_images/1/a_normal.jpg'}});if(u.pathname==='/twitter/user/last_tweets')return Response.json({status:'success',tweets:timeline,has_next_page:false,next_cursor:''});return new Response('{}',{status:404});};
  const created=await call('/api/admin/subscriptions',{handle:'https://x.com/OpenAI',focus:'模型发布'},adminCookie);assert.equal(created.r.status,201);
  assert.equal((await call('/api/admin/subscriptions',{handle:'@openai'},adminCookie)).r.status,409);
  sql.exec("UPDATE usage_windows SET count=0 WHERE key='xapi:slot'");
  await subs.pollSubscriptions();
  let rows=sql.prepare("SELECT url,source,status,sharer FROM shares WHERE source='subscription' AND subscription_id<>'' ORDER BY url").all();
  assert.deepEqual(rows.map(r=>r.url),['https://x.com/openai/status/103','https://x.com/openai/status/105']);assert.equal(rows[0].status,'pending');assert.equal(rows[0].sharer,'订阅 · @openai');
  timeline=[tweet('107'),tweet('106',{isReply:true}),...timeline];sql.exec("UPDATE subscriptions SET next_check_at=0");sql.exec("UPDATE usage_windows SET count=0 WHERE key='xapi:slot'");
  await subs.pollSubscriptions();
  rows=sql.prepare("SELECT url FROM shares WHERE subscription_id<>'' ORDER BY url").all();assert.deepEqual(rows.map(r=>r.url),['https://x.com/openai/status/103','https://x.com/openai/status/105','https://x.com/openai/status/107']);
  assert.equal(sql.prepare('SELECT last_tweet_id FROM subscriptions').get().last_tweet_id,'107');
  const strip=(await call('/api/subscriptions',undefined,memberCookie)).d.subscriptions;assert.equal(strip.length,1);assert.equal(strip[0].handle,'openai');assert.equal(strip[0].focus,undefined,'members do not see admin notes');assert.ok(paths.some(p=>p.includes('userId=42')),'later polls use the stable user id');
 });
 await test('daily reports summarise the day and only link to real items',async()=>{
  const day=config.beijingDay();sql.exec(`UPDATE shares SET status='ready',collected_at='${new Date().toISOString()}',translated_at='${new Date().toISOString()}' WHERE id IN ('s1','s2')`);
  let prompt='';globalThis.fetch=async(url,init)=>{prompt=JSON.parse(init.body).messages[1].content;return deepseekReply({title:'今日 AI',lead:'导语',markdown:'## 今日要点\n**发布** [阅读全文](/read/s1) [伪造](/read/forged)\n## 趋势与洞察\n- 观察'});};
  const {r,d}=await call(`/api/reports/${day}/generate`,{},adminCookie);assert.equal(r.status,200);assert.equal(d.report.status,'ready');
  assert.match(prompt,/id=s1/);assert.match(d.report.content,/\(\/read\/s1\)/);assert.doesNotMatch(d.report.content,/forged/);
  assert.equal((await call(`/api/reports/${day}/generate`,{},memberCookie)).r.status,403);
  assert.equal((await call(`/api/reports/${day}`,undefined,memberCookie)).d.report.title,'今日 AI');
  assert.equal((await call('/api/reports/not-a-day',undefined,memberCookie)).r.status,404);
 });
 await test('push sends each ready item once after enabling, signs Feishu cards and respects score filters',async()=>{
  const sent=[];globalThis.fetch=async(url,init)=>{sent.push({url:String(url),body:JSON.parse(init.body)});return Response.json({code:0,msg:'success'});};
  await call('/api/admin/config',{config:{push:{feishu:{enabled:true,minScore:90}}}},adminCookie,'PUT');
  await push.deliverPushes();assert.equal(sent.length,0,'items translated before enabling are not back-filled');
  const later=new Date(Date.now()+1000).toISOString();
  sql.prepare("INSERT INTO shares(id,fingerprint,title,summary,original,status,shared_at,updated_at,translated_at,source,score) VALUES('p1','f-p1','<@all> 新资讯','摘要','o','ready',?,?,?,'share',-1)").run(later,later,later);
  sql.prepare("INSERT INTO shares(id,fingerprint,title,summary,original,status,shared_at,updated_at,translated_at,source,score) VALUES('p2','f-p2','低相关','摘要','o','ready',?,?,?,'subscription',40)").run(later,later,later);
  await push.deliverPushes();await push.deliverPushes();
  assert.equal(sent.length,1);assert.equal(sent[0].url,'https://open.feishu.cn/open-apis/bot/v2/hook/abc-123');
  assert.equal(sent[0].body.sign,await push.feishuSign(sent[0].body.timestamp,'sign-secret'));assert.doesNotMatch(JSON.stringify(sent[0].body),/<@all>/);assert.match(JSON.stringify(sent[0].body),/\/read\/p1/);
  assert.equal(sql.prepare("SELECT state FROM deliveries WHERE target_id='p2'").get().state,'skipped');
  const day=config.beijingDay();sql.prepare("UPDATE daily_reports SET updated_at=? WHERE day=?").run(later,day);await push.deliverPushes();
  assert.equal(sent.length,2);assert.match(JSON.stringify(sent[1].body),new RegExp(`/reports/${day}`));
  globalThis.fetch=async()=>{throw new Error('network');};sql.prepare("INSERT INTO shares(id,fingerprint,title,summary,original,status,shared_at,updated_at,translated_at) VALUES('p3','f-p3','t','s','o','ready',?,?,?)").run(later,later,later);
  await push.deliverPushes();await push.deliverPushes();assert.equal(sql.prepare("SELECT state FROM deliveries WHERE target_id='p3'").get().state,'uncertain');
 });
 await test('MCP endpoint authenticates personal tokens and answers from the knowledge base',async()=>{
  const rpc=(body,token,headers={})=>call('/mcp',body,undefined,'POST',{...(token?{authorization:'Bearer '+token}:{}),...headers});
  assert.equal((await rpc({jsonrpc:'2.0',id:1,method:'initialize',params:{}})).r.status,401);
  const shortcut=(await call('/api/me/shortcut',undefined,adminCookie)).d.token;assert.equal((await rpc({jsonrpc:'2.0',id:1,method:'ping'},shortcut)).r.status,401,'share tokens cannot read');
  const {d:created}=await call('/api/me/mcp',{},adminCookie);assert.match(created.token,/^ihmcp_[\w-]{43}$/);const token=created.token;
  let {r,d}=await rpc({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'test',version:'1'}}},token);
  assert.equal(r.status,200);assert.equal(d.result.protocolVersion,'2025-06-18');assert.equal(d.result.serverInfo.name,'information-hub');
  assert.equal((await rpc({jsonrpc:'2.0',method:'notifications/initialized'},token)).r.status,202);
  ({d}=await rpc({jsonrpc:'2.0',id:2,method:'tools/list'},token));assert.ok(d.result.tools.some(t=>t.name==='search_articles'));
  ({d}=await rpc({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'search_articles',arguments:{query:'低相关'}}},token));assert.match(d.result.content[0].text,/\/read\/p2/);assert.equal(d.result.isError,false);
  ({d}=await rpc({jsonrpc:'2.0',id:4,method:'tools/call',params:{name:'get_article',arguments:{id:'s1',format:'both'}}},token));assert.match(d.result.content[0].text,/译文/);assert.match(d.result.content[0].text,/Original text/);
  ({d}=await rpc({jsonrpc:'2.0',id:5,method:'resources/read',params:{uri:'ihub://reports/latest'}},token));assert.match(d.result.contents[0].text,/今日 AI/);assert.match(d.result.contents[0].text,/https:\/\/reading\.example\.com\/read\/s1/);
  ({d}=await rpc({jsonrpc:'2.0',id:6,method:'tools/call',params:{name:'share_link',arguments:{input:'https://example.com/mcp-share'}}},token));assert.match(d.result.content[0].text,/已收录/);assert.equal(sql.prepare("SELECT sharer_id FROM shares WHERE url='https://example.com/mcp-share'").get().sharer_id,ownerId);
  ({d}=await rpc([{jsonrpc:'2.0',id:7,method:'ping'},{jsonrpc:'2.0',id:8,method:'nope'}],token));assert.equal(d.length,2);assert.equal(d[1].error.code,-32601);
  assert.equal((await rpc({jsonrpc:'2.0',id:9,method:'ping'},token,{origin:'https://evil.example'})).r.status,403);
  await call('/api/me/mcp',{revoke:true},adminCookie);assert.equal((await rpc({jsonrpc:'2.0',id:10,method:'ping'},token)).r.status,401);
 });
 await test('reset links set a new password once and invalidate older sessions',async()=>{
  const {d}=await call(`/api/admin/users/${memberId}/reset-link`,{},adminCookie);const token=d.resetUrl.split('token=')[1];
  assert.equal((await call(`/api/admin/users/${ownerId}/reset-link`,{},adminCookie)).r.status,400,'own account uses the account page');
  const done=await call('/api/auth/reset',{token,password:'Brand-new-reset-pass-1'});assert.equal(done.r.status,200);
  assert.equal((await call('/api/auth/reset',{token,password:'Another-reset-pass-22'})).r.status,401);
  assert.equal((await call('/api/shares',undefined,memberCookie)).r.status,401,'old session revoked');
  assert.equal((await call('/api/auth/login',{username:'reader',password:'Brand-new-reset-pass-1'})).r.status,200);
 });
 await test('twenty single-use recovery codes reset a forgotten password',async()=>{
  const session=cookieOf((await call('/api/auth/login',{username:'reader',password:'Brand-new-reset-pass-1'})).r);
  assert.equal((await call('/api/me/recovery-codes',{currentPassword:'wrong'},session)).r.status,400);
  const {d}=await call('/api/me/recovery-codes',{currentPassword:'Brand-new-reset-pass-1'},session);assert.equal(d.codes.length,20);assert.equal(new Set(d.codes).size,20);assert.match(d.codes[0],/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.ok(!JSON.stringify(sql.prepare('SELECT * FROM recovery_codes').all()).includes(d.codes[0]));
  assert.equal((await call('/api/me/recovery-codes',undefined,session)).d.remaining,20);
  assert.equal((await call('/api/auth/recover',{username:'reader',code:'AAAA-BBBB-CCCC',password:'Recovered-pass-1234'})).r.status,401);
  const ok=await call('/api/auth/recover',{username:'reader',code:d.codes[3].toLowerCase().replace(/-/g,' '),password:'Recovered-pass-1234'});assert.equal(ok.r.status,200);
  assert.equal((await call('/api/auth/recover',{username:'reader',code:d.codes[3],password:'Recovered-pass-5678'})).r.status,401,'codes are single use');
  assert.equal((await call('/api/auth/login',{username:'reader',password:'Recovered-pass-1234'})).r.status,200);
  assert.equal((await call('/api/me/recovery-codes',undefined,cookieOf(ok.r))).d.remaining,19);
 });
}finally{globalThis.fetch=originalFetch;await rm(dir,{recursive:true,force:true});}
