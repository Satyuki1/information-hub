import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
const dir=await mkdtemp(join(tmpdir(),'info-content-'));
await writeFile(join(dir,'content.mjs'),ts.transpileModule(await readFile('lib/content.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
const {isTopic,inferTopic,topicOf,safeImageUrl,coverOf,timelineOf,authorOf}=await import(join(dir,'content.mjs'));
try {
 await test('source author handles legacy or malformed metadata without inventing a publication time',()=>{
  const item={sourceMeta:'{broken',url:'https://x.com/example/status/123',originalAuthor:'作者',sharer:'分享者'};
  assert.deepEqual(authorOf(item),{name:'作者',handle:'example',avatar:'',publishedAt:'',text:''});
  const rich=authorOf({...item,sourceMeta:JSON.stringify({name:'真实作者',handle:'real',avatar:'https://127.0.0.1/photo.jpg',publishedAt:'invalid'})});
  assert.equal(rich.name,'真实作者');assert.equal(rich.avatar,'');assert.equal(rich.publishedAt,'');
 });
 await test('manual topics override automatic inference, legacy records are classified',()=>{
  assert.equal(inferTopic('OpenAI 发布新模型'),'人工智能');
  assert.equal(inferTopic('养老保险政策'),'商业财经');
  assert.equal(topicOf({category:'新资讯',categorySource:'manual',title:'OpenAI',tags:'[]'}),'新资讯');
  assert.equal(topicOf({category:'新资讯',categorySource:'auto',title:'OpenAI',tags:'[]'}),'人工智能');
  assert.equal(isTopic('未知分类'),false);
 });
 await test('images accept public HTTPS and local media; reject executable and private URLs',()=>{
  for(const value of ['javascript:alert(1)','data:image/svg+xml,evil','http://example.com/a.jpg','https://127.0.0.1/a','https://[::ffff:192.168.0.1]/a','https://user:pass@example.com/a','https://test.local/a'])assert.equal(safeImageUrl(value),'');
  assert.equal(coverOf({coverUrl:'',original:'Text\n\n![实际配图](https://example.com/image.jpg)'}),'https://example.com/image.jpg');
  assert.equal(safeImageUrl('/media/image.svg'),'/media/image.svg');
 });
 await test('timeline retains real stage timestamps and never substitutes updatedAt for historical completion',()=>{
  const historical={sharer:'测试',sharedAt:'2026-10-10T01:00:00Z',collectedAt:'',translatedAt:'',notifiedAt:'',updatedAt:'2026-10-13T01:00:00Z',status:'ready',notifyStatus:'none',error:'',notifyError:''};
  assert.equal(timelineOf(historical)[1].time,'');assert.match(timelineOf(historical)[1].detail,/未保存完成时间/);
  const actual={...historical,collectedAt:'2026-10-10T01:01:00Z',translatedAt:'2026-10-10T01:02:00Z',notifiedAt:'2026-10-10T01:03:00Z',notifyStatus:'sent'};
  assert.deepEqual(timelineOf(actual).map(e=>e.time),[actual.collectedAt,actual.translatedAt,actual.notifiedAt]);
  assert.ok(timelineOf(actual).every(e=>e.state==='done'));
 });
}finally{await rm(dir,{recursive:true,force:true});}
