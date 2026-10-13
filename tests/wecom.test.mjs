import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
const dir=await mkdtemp(join(tmpdir(),'zeng-wecom-'));
const compile=(source)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
await writeFile(join(dir,'message.mjs'),compile(await readFile('lib/wecom-message.ts','utf8')));
await writeFile(join(dir,'sender.mjs'),compile((await readFile('lib/wecom.ts','utf8')).replace('import { env } from "cloudflare:workers";','const env=globalThis.testWecomEnv;').replace('"./wecom-message"','"./message.mjs"')));
const sql=new DatabaseSync(':memory:');
for(const filename of ['0000_awesome_mantis.sql','0001_curious_carmella_unuscione.sql','0002_skinny_glorian.sql'])sql.exec(await readFile('drizzle/'+filename,'utf8'));
globalThis.testWecomEnv={
 WECOM_WEBHOOK_URL:'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-only',
 DB:{prepare(query){
   const st=sql.prepare(query);
   return {bind(...args){return {
     async run(){return st.run(...args)},
     async first(){return st.get(...args)},
     async all(){return {results:st.all(...args)}}
   }}};
 }}
};
const {deliverNotifications}=await import(join(dir,'sender.mjs'));
const {buildWecomMessage}=await import(join(dir,'message.mjs'));
let sent=[];
function fixture(status='pending',processing='ready') {sql.exec('DELETE FROM shares');sent=[];sql.prepare("INSERT INTO shares(id,fingerprint,title,original,summary,shared_at,updated_at,status,notify_status) VALUES(?,?,?,?,?,?,?,?,?)").run('unit','unique','接入测试','Original stays exact.\n\n- Item','测试摘要','2026-10-12','2026-10-12',processing,status);}
function row(){return sql.prepare('SELECT * FROM shares').get();}
const originalFetch=globalThis.fetch;
try {
 await test('message preserves a reading link within UTF-8 limit and cannot inject a mention',()=>{const value=buildWecomMessage({id:'unit',title:'<@all> [link](https://example.com)',summary:'中'.repeat(3000),original:'😀'.repeat(3000),contentKind:'x_preview',originalAuthor:'人'.repeat(100),sharer:'甲'.repeat(100)}).markdown.content;assert.ok(Buffer.byteLength(value)<4096);assert.ok(!value.includes('<@all>'));assert.match(value,/\/read\/unit/);assert.match(value,/仅基于 X 公开预览/);});
 await test('concurrent scheduled runs send once, preserve original, and do not resend success',async()=>{fixture();globalThis.fetch=async(_u,opts)=>{sent.push(JSON.parse(opts.body));return Response.json({errcode:0})};await Promise.all([deliverNotifications(),deliverNotifications()]);await deliverNotifications();assert.equal(sent.length,1);assert.equal(row().notify_status,'sent');assert.equal(row().original,'Original stays exact.\n\n- Item');});
 await test('translation-in-progress and historic records do not notify',async()=>{fixture('pending','processing');await deliverNotifications();assert.equal(sent.length,0);fixture('none');await deliverNotifications();assert.equal(sent.length,0);});
 await test('explicit rate limit rejection retries at most three times',async()=>{fixture();globalThis.fetch=async()=>{sent.push(1);return Response.json({errcode:45009})};for(let i=0;i<4;i++){await deliverNotifications();sql.prepare("UPDATE shares SET notify_next_at='' ").run();}assert.equal(sent.length,3);assert.equal(row().notify_status,'failed');});
 await test('network ambiguity and interrupted delivery are not blindly resent',async()=>{fixture();globalThis.fetch=async()=>{sent.push(1);throw new Error('timeout')};await deliverNotifications();await deliverNotifications();assert.equal(sent.length,1);assert.equal(row().notify_status,'uncertain');fixture('sending');await deliverNotifications();assert.equal(sent.length,0);assert.equal(row().notify_status,'uncertain');});
} finally {globalThis.fetch=originalFetch;sql.close();await rm(dir,{recursive:true,force:true});}
