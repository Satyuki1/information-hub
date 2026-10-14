import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';

test('removing layout preferences preserves existing accounts, sessions and integrations',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  const files=(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort();
  for(const file of files.filter(f=>f<'0008'))db.exec(await readFile('drizzle/'+file,'utf8'));
  for(const style of ['x','red','news'])db.prepare("INSERT INTO users(id,username,name,password_hash,created_at,reading_style) VALUES(?,?,?,?,?,?)").run(style,style,style,'existing-password-hash','2026-10-13',style);
  db.exec("INSERT INTO sessions(hash,user_id,version,expires,created) VALUES('session','red',1,9999999999999,1); INSERT INTO settings(key,value) VALUES('feishu_app','existing-sealed-credentials'); INSERT INTO user_tokens(id,user_id,kind,hash,sealed,created_at) VALUES('token','red','collect','token-hash','existing-token','2026-10-13');");
  for(const file of files.filter(f=>f>='0008'))db.exec(await readFile('drizzle/'+file,'utf8'));
  assert.ok(!db.prepare('PRAGMA table_info(users)').all().some(c=>c.name==='reading_style'));
  assert.equal(db.prepare('SELECT count(*) n FROM users').get().n,3);
  assert.equal(db.prepare("SELECT password_hash FROM users WHERE id='red'").get().password_hash,'existing-password-hash');
  assert.equal(db.prepare("SELECT u.id FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.hash='session'").get().id,'red');
  assert.equal(db.prepare("SELECT value FROM settings WHERE key='feishu_app'").get().value,'existing-sealed-credentials');
  assert.equal(db.prepare("SELECT sealed FROM user_tokens WHERE id='token'").get().sealed,'existing-token');
 }finally{db.close();}
});
