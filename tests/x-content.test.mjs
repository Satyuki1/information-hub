import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
const dir=await mkdtemp(join(tmpdir(),'info-x-content-'));
for(const [name,path] of [['content','lib/content.ts'],['x-preview','lib/x-preview.ts'],['x-content','lib/x-content.ts'],['media','app/api/media/route.ts']]){
 const source=(await readFile(path,'utf8')).replaceAll("'./content'","'./content.mjs'").replaceAll("'./x-preview'","'./x-preview.mjs'");
 await writeFile(join(dir,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
}
const {composeXContent,articleMarkdown,fetchXContent}=await import(join(dir,'x-content.mjs'));
const {GET:imageProxy}=await import(join(dir,'media.mjs'));
const originalFetch=globalThis.fetch;
const quoted={id:'456',text:'https://t.co/article',author:{name:'原作者'},entities:{urls:[{url:'https://t.co/article',expanded_url:'https://x.com/i/article/789'}]}};
try{
 await test('quoted articles keep the sharing author distinct from the article author',()=>{
  const x=composeXContent({id:'123',text:'分享点评',author:{name:'分享帖作者',userName:'sharing',profilePicture:'https://pbs.twimg.com/profile_images/1/avatar.jpg'},createdAt:'2026-10-13T01:00:00Z',quoted_tweet:quoted},{title:'完整文章',author:{name:'长文原作者'},contents:[{type:'unstyled',text:'正文'}]});
  assert.equal(x.author,'长文原作者');assert.equal(JSON.parse(x.sourceMeta).name,'分享帖作者');assert.equal(JSON.parse(x.sourceMeta).handle,'sharing');assert.equal(JSON.parse(x.sourceMeta).text,'分享点评');
 });
 await test('real media appears in original Markdown, external URLs expand, video is labelled',()=>{
  const x=composeXContent({id:'123',text:'Original https://t.co/test',entities:{urls:[{url:'https://t.co/test',expanded_url:'https://example.com/source'}]},extendedEntities:{media:[{type:'photo',media_url_https:'https://pbs.twimg.com/media/photo.jpg'},{type:'video',media_url_https:'https://pbs.twimg.com/media/poster.jpg'}]}});
  assert.match(x.text,/https:\/\/example.com\/source/);assert.match(x.text,/!\[原帖配图\]/);assert.match(x.text,/未转写视频内容/);assert.equal(x.kind,'x_post');
 });
 await test('quoted article preserves attribution and image positions',()=>{
  const x=composeXContent({id:'123',text:'分享点评',quoted_tweet:quoted},{title:'完整文章',author:{name:'原作者'},cover_media_img_url:'https://pbs.twimg.com/media/cover.jpg',contents:[{type:'header-two',text:'第一章'},{type:'unstyled',text:'Before image'},{type:'image',url:'https://pbs.twimg.com/media/figure.png'},{type:'unstyled',text:'After image'}]});
  assert.equal(x.kind,'x_article');assert.match(x.text,/分享点评/);assert.match(x.text,/原作者：原作者/);assert.match(x.text,/\/status\/456/);assert.ok(x.text.indexOf('Before image')<x.text.indexOf('figure.png'));assert.ok(x.text.indexOf('figure.png')<x.text.indexOf('After image'));assert.match(x.text,/### 第一章/);
 });
 await test('provider follows quoted article id, not the wrapper post or internal article id',async()=>{
  const calls=[];globalThis.fetch=async url=>{calls.push(url);return Response.json(calls.length===1?{status:'success',tweets:[{id:'123',text:'wrapper',quoted_tweet:quoted}]}:{status:'success',article:{title:'article',contents:[{type:'unstyled',text:'Full content'}]}})};
  const x=await fetchXContent('https://x.com/user/status/123','test-key');assert.equal(x.kind,'x_article');assert.ok(calls[1].endsWith('tweet_id=456'));
 });
 await test('empty article and failed fetch never pretend to contain full content',async()=>{
  assert.throws(()=>articleMarkdown({contents:[]}));globalThis.fetch=async()=>Response.json({status:'failed'});await assert.rejects(fetchXContent('https://x.com/user/status/123','test'));
 });
 await test('image proxy rejects private destinations and non-image responses',async()=>{
  let calls=0;globalThis.fetch=async()=>{calls++;return new Response('<html>not image</html>',{headers:{'Content-Type':'text/html'}})};
  assert.equal((await imageProxy(new Request('https://site.test/api/media?url=https://127.0.0.1/media/x.jpg'))).status,400);assert.equal(calls,0);
  assert.equal((await imageProxy(new Request('https://site.test/api/media?url=https://pbs.twimg.com/media/x.jpg'))).status,415);
 });
 await test('image proxy serves approved image MIME and caching without forwarding credentials',async()=>{
  globalThis.fetch=async(_url,init)=>{assert.equal(init.redirect,'manual');assert.equal(init.headers,undefined);return new Response(new Uint8Array([137,80,78,71]),{headers:{'Content-Type':'image/png'}})};
  const r=await imageProxy(new Request('https://site.test/api/media?url=https://pbs.twimg.com/media/x.png'));assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/png');assert.equal((await r.arrayBuffer()).byteLength,4);
 });
}finally{globalThis.fetch=originalFetch;await rm(dir,{recursive:true,force:true});}
