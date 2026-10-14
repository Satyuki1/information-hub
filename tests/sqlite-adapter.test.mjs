import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sqliteBinding,migrate} from '../server/sqlite.mjs';
await test('Node SQLite adapter supports D1 reads, returning writes and transactional batches',async()=>{
 const {db,sql}=sqliteBinding(':memory:');await migrate(sql,new URL('../drizzle/',import.meta.url));await migrate(sql,new URL('../drizzle/',import.meta.url));
 await db.prepare('INSERT INTO settings(key,value) VALUES(?,?)').bind('test','one').run();assert.equal(await db.prepare('SELECT value FROM settings WHERE key=?').bind('test').first('value'),'one');
 const results=await db.batch([db.prepare("UPDATE settings SET value='two' WHERE key='test' RETURNING value"),db.prepare("SELECT value FROM settings WHERE key='test'")]);assert.equal(results[0].results[0].value,'two');assert.equal(results[1].results[0].value,'two');
 await assert.rejects(db.batch([db.prepare("UPDATE settings SET value='rollback' WHERE key='test'"),db.prepare('INSERT INTO does_not_exist VALUES(1)')]));assert.equal(await db.prepare("SELECT value FROM settings WHERE key='test'").first('value'),'two');assert.deepEqual(await db.prepare("SELECT key,value FROM settings WHERE key='test'").raw(),[['test','two']]);sql.close();
});
