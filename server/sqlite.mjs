import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export function sqliteBinding(path){
 const sql=new DatabaseSync(path);sql.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 function prepare(query,args=[]){return {bind(...values){return prepare(query,values.map(v=>typeof v==='boolean'?Number(v):v));},async first(column){const row=sql.prepare(query).get(...args);return column?(row?.[column]??null):(row??null);},_all(){const stmt=sql.prepare(query),results=stmt.all(...args);return {success:true,results,meta:{changes:Number(sql.prepare('SELECT changes() n').get().n)}};},async all(){return this._all();},async run(){const result=sql.prepare(query).run(...args);return {success:true,results:[],meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};},async raw(options){const stmt=sql.prepare(query);stmt.setReturnArrays(true);const rows=stmt.all(...args);return options?.columnNames?[stmt.columns().map(c=>c.name),...rows]:rows;}};}
 const db={prepare,async batch(statements){sql.exec('BEGIN IMMEDIATE');try{const results=[];for(const statement of statements)results.push(statement._all());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}},async exec(query){sql.exec(query);return {count:1,duration:0};}};
 return {sql,db};
}
export async function migrate(sql,directory){
 sql.exec('CREATE TABLE IF NOT EXISTS server_migrations(name TEXT PRIMARY KEY,hash TEXT NOT NULL)');
 for(const name of (await readdir(directory)).filter(f=>/^\d+.*\.sql$/.test(f)).sort()){
  const source=await readFile(new URL(name,directory),'utf8'),hash=createHash('sha256').update(source).digest('hex'),prior=sql.prepare('SELECT hash FROM server_migrations WHERE name=?').get(name);
  if(prior){if(prior.hash!==hash)throw new Error(`Previously applied migration changed: ${name}. Restore its original content.`);continue;}
  sql.exec('BEGIN IMMEDIATE');try{sql.exec(source);sql.prepare('INSERT INTO server_migrations(name,hash) VALUES(?,?)').run(name,hash);sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}
 }
}
