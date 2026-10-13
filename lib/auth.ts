import { env } from 'cloudflare:workers';
const enc=new TextEncoder();
export const COOKIE='__Host-info_session';
export type User={id:string;username:string;name:string;role:string;active:number;must_change:number;version:number;owner:number;login_type:string;reading_style:string};
export const STYLES=['x','red','news'];
export type SessionUser=User&{sessionHash:string};
export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
export const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export function randomToken(){return b64(crypto.getRandomValues(new Uint8Array(32)));}
function b64(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function unb64(value:string){return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
export async function digest(value:string){return b64(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value))));}
function master(){if(!env.DATA_ENCRYPTION_KEY||unb64(env.DATA_ENCRYPTION_KEY).length!==32)throw new HttpError(503,'安全存储尚未初始化，请联系管理员。');return unb64(env.DATA_ENCRYPTION_KEY);}
async function pepper(password:string){const key=await crypto.subtle.importKey('raw',master(),{name:'HMAC',hash:'SHA-256'},false,['sign']);return crypto.subtle.sign('HMAC',key,enc.encode('password-v1:'+password));}
export function validatePassword(password:unknown){if(typeof password!=='string'||password.trim().length<12||password.length>128||/^(.)\1+$/.test(password)||/^(123456|password|qwerty|admin)[\d!@#]*$/i.test(password))throw new HttpError(400,'密码需为 12–128 个字符，请使用较长且不重复的密码或口令。');}
export async function passwordHash(password:string,salt=randomToken()){
 // Workers Web Crypto caps PBKDF2 at 100,000 iterations. A separately stored
 // HMAC pepper prevents offline password guessing from a D1-only disclosure.
 const key=await crypto.subtle.importKey('raw',await pepper(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',iterations:100000,salt:enc.encode(salt)},key,256);
 return `pbkdf2-peppered-v1$100000$${salt}$${b64(new Uint8Array(bits))}`;
}
export async function verifyPassword(password:string,stored:string){const parts=stored.split('$');const actual=await passwordHash(password,parts.length===4?parts[2]:'unregistered-user-constant-salt');return secureEqual(actual,stored);}
export function secureEqual(a:string,b:string){const x=enc.encode(a),y=enc.encode(b);let different=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)different|=(x[i]||0)^(y[i]||0);return different===0;}
export async function seal(value:unknown,context:string){const iv=crypto.getRandomValues(new Uint8Array(12));const key=await crypto.subtle.importKey('raw',master(),'AES-GCM',false,['encrypt']);const bytes=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(context)},key,enc.encode(JSON.stringify(value)));return `${b64(iv)}.${b64(new Uint8Array(bytes))}`;}
export async function unseal<T>(value:string,context:string):Promise<T>{const [iv,bytes]=value.split('.');const key=await crypto.subtle.importKey('raw',master(),'AES-GCM',false,['decrypt']);return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv),additionalData:enc.encode(context)},key,unb64(bytes))));}
export function cookie(value:string,maxAge=43200){return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;}
export async function getUser(request:Request):Promise<SessionUser|null>{
 const token=request.headers.get('cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 if(!token||!/^[\w-]{43}$/.test(token)||!env.DB)return null;
 const hash=await digest(token);const u=await env.DB.prepare('SELECT u.id,u.username,u.name,u.role,u.active,u.must_change,u.version,u.owner,u.login_type,u.reading_style FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.hash=? AND s.expires>? AND u.active=1 AND s.version=u.version').bind(hash,Date.now()).first<User>();return u?{...u,sessionHash:hash}:null;
}
export async function requireUser(request:Request,admin=false){const u=await getUser(request);if(!u)throw new HttpError(401,'请先登录。');if(u.must_change)throw new HttpError(403,'请先修改初始密码。');if(admin&&u.role!=='admin')throw new HttpError(403,'此操作需要管理员权限。');return u;}
export function publicUser(u:User){return {id:u.id,username:u.username,name:u.name,role:u.role,mustChange:!!u.must_change,owner:!!u.owner,loginType:u.login_type||'password',readingStyle:STYLES.includes(u.reading_style)?u.reading_style:'x'};}
export async function auditEvent(actor:string,action:string,target=''){await env.DB!.prepare('INSERT INTO audit_log(id,actor,action,target,at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),actor,action,target,new Date().toISOString()).run();}
export async function rateLimit(key:string,limit:number,window=900000){const bucket=`auth:${window}:${await digest(key)}:${Math.floor(Date.now()/window)}`;const row=await env.DB!.prepare('INSERT INTO usage_windows(key,count) VALUES(?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<? RETURNING count').bind(bucket,limit).first();if(!row)throw new HttpError(429,'操作过于频繁，请稍后再试。');}
export async function body(request:Request,max=65000):Promise<Record<string,unknown>>{if(!request.headers.get('content-type')?.includes('application/json'))throw new HttpError(415,'请使用 JSON 提交。');const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'提交内容为空。');let length=0;const chunks:Uint8Array[]=[];for(;;){const n=await reader.read();if(n.done)break;length+=n.value.length;if(length>max){await reader.cancel();throw new HttpError(413,'提交内容过大。');}chunks.push(n.value);}const data=new Uint8Array(length);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length;}try{const parsed=JSON.parse(new TextDecoder().decode(data));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw 0;return parsed;}catch{throw new HttpError(400,'提交格式无效。');}}
export async function setting(key:string){return (await env.DB!.prepare('SELECT value FROM settings WHERE key=?').bind(key).first<{value:string}>())?.value||'';}
export async function setSetting(key:string,value:string){await env.DB!.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,value).run();}
async function startSession(user:User,extra:Record<string,unknown>={}){const token=randomToken();await env.DB!.prepare('INSERT INTO sessions(hash,user_id,version,expires,created) VALUES(?,?,?,?,?)').bind(await digest(token),user.id,user.version,Date.now()+43200000,Date.now()).run();return new Response(JSON.stringify({...extra,user:publicUser(user)}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':cookie(token)}});}
function username(value:unknown){const name=String(value||'').trim().toLowerCase();if(!/^[a-z0-9][a-z0-9_.-]{2,31}$/.test(name))throw new HttpError(400,'用户名需为 3–32 位英文字母、数字、点、横线或下划线。');return name;}
export async function authRoute(request:Request):Promise<Response>{
 const path=new URL(request.url).pathname;const db=env.DB!;const me=await getUser(request);const ip=request.headers.get('cf-connecting-ip')||'local';
 if(path==='/api/auth/me'&&request.method==='GET')return json({user:me?publicUser(me):null});
 if(path==='/api/auth/setup'&&request.method==='GET')return json(await setupState());
 if(path==='/api/auth/logout'&&request.method==='POST'){if(me)await db.prepare('DELETE FROM sessions WHERE hash=?').bind(me.sessionHash).run();return new Response('{}',{headers:{'Content-Type':'application/json','Set-Cookie':cookie('',0)}});}
 if(request.method!=='POST')throw new HttpError(405,'请求方式无效。');
 const input=await body(request,8192);
 if(path==='/api/auth/setup'){
  await rateLimit('setup:'+ip,5);const state=await setupState();if(state.initialized)throw new HttpError(409,'系统已初始化，请使用管理员账号登录。');
  // A link from the deploy script is required once issued; a deployment that never
  // issued one lets the first visitor create the super administrator.
  if(state.tokenExpired)throw new HttpError(403,'初始化链接已过期。请在项目目录运行 npm run setup-link 重新生成。');
  if(state.tokenRequired&&(typeof input.token!=='string'||!secureEqual(await digest(input.token),await setting('bootstrap_hash'))))throw new HttpError(403,'初始化链接无效或已使用。请使用部署时生成的初始化链接。');
  const account=username(input.username);validatePassword(input.password);const id=crypto.randomUUID();const hash=await passwordHash(input.password as string);
  const r=await db.prepare("INSERT INTO users(id,username,name,password_hash,role,active,must_change,version,created_at,owner) SELECT ?,?,?,?,'admin',1,0,1,?,1 WHERE NOT EXISTS(SELECT 1 FROM users)").bind(id,account,String(input.name||'管理员').slice(0,40),hash,new Date().toISOString()).run();
  if(!r.meta.changes)throw new HttpError(409,'系统已初始化，请使用管理员账号登录。');
  await db.prepare("DELETE FROM settings WHERE key IN ('bootstrap_hash','bootstrap_expires')").run();await auditEvent(id,'admin.bootstrap');
  // Existing shared bookmarks belong to the initial owner, not every new reader.
  await db.prepare("INSERT OR IGNORE INTO user_favorites(id,user_id,share_id) SELECT ?||':'||id,?,id FROM shares WHERE favorite=1").bind(id,id).run();
  return startSession((await db.prepare('SELECT * FROM users WHERE id=?').bind(id).first<User>())!,{recoveryCodes:await issueRecoveryCodes(id)});
 }
 if(path==='/api/auth/recover'){
  await rateLimit('recover-ip:'+ip,10);const account=String(input.username||'').trim().toLowerCase();if(account.length>64)throw new HttpError(400,'用户名无效。');await rateLimit('recover-user:'+account,5);validatePassword(input.password);
  const u=await db.prepare('SELECT * FROM users WHERE username=? AND active=1').bind(account).first<User>();
  const used=u?await db.prepare("UPDATE recovery_codes SET used_at=? WHERE user_id=? AND hash=? AND used_at='' RETURNING id").bind(new Date().toISOString(),u.id,await codeHash(u.id,String(input.code||''))).first():null;
  if(!u||!used){await auditEvent('anonymous','password.recover_failed',await digest(account));throw new HttpError(401,'用户名或恢复码不正确，或该恢复码已经用过。');}
  return resetPassword(u,input.password as string,'password.recovered');
 }
 if(path==='/api/auth/reset'){
  await rateLimit('reset-ip:'+ip,10);validatePassword(input.password);const u=await tokenUser(String(input.token||''),'reset');if(!u)throw new HttpError(401,'重置链接无效或已过期，请重新生成。');
  await db.prepare("DELETE FROM user_tokens WHERE user_id=? AND kind='reset'").bind(u.id).run();return resetPassword(u,input.password as string,'password.reset_link');
 }
 if(path==='/api/auth/login'){
  const account=String(input.username||'').trim().toLowerCase();const password=String(input.password||'');if(account.length>64||password.length>128)throw new HttpError(400,'登录信息格式无效。');
  await rateLimit('login-ip:'+ip,20);await rateLimit('login-user:'+account,10);
  const u=await db.prepare('SELECT * FROM users WHERE username=?').bind(account).first<User&{password_hash:string}>();
  const valid=await verifyPassword(password,u?.password_hash||'invalid');if(!u||!valid||!u.active){await auditEvent('anonymous','login.failed',await digest(account));throw new HttpError(401,'用户名或密码不正确，或账号已停用。');}
  await auditEvent(u.id,'login.success');return startSession(u);
 }
 if(path==='/api/auth/magic'){
  await rateLimit('magic-ip:'+ip,20);const u=await tokenUser(String(input.token||''),'magic');
  if(!u){await auditEvent('anonymous','login.magic_failed');throw new HttpError(401,'登录链接无效、已过期或已被撤销，请联系管理员重新获取。');}
  await auditEvent(u.id,'login.magic');return startSession(u);
 }
 if(path==='/api/auth/password'){
  if(!me)throw new HttpError(401,'请先登录。');await rateLimit('password:'+me.id,5);validatePassword(input.password);
  const u=await db.prepare('SELECT password_hash FROM users WHERE id=?').bind(me.id).first<{password_hash:string}>();
  if(!u||!await verifyPassword(String(input.currentPassword||''),u.password_hash))throw new HttpError(400,'当前密码不正确。');
  if(input.password===input.currentPassword)throw new HttpError(400,'新密码不能与当前密码相同。');
  await db.batch([db.prepare('UPDATE users SET password_hash=?,must_change=0,version=version+1 WHERE id=?').bind(await passwordHash(input.password as string),me.id),db.prepare('DELETE FROM sessions WHERE user_id=?').bind(me.id)]);await auditEvent(me.id,'password.changed');return startSession({...me,must_change:0,version:me.version+1});
 }
 throw new HttpError(404,'接口不存在。');
}
export async function adminRoute(request:Request){
 const me=await requireUser(request,true);const db=env.DB!;const path=new URL(request.url).pathname;
 if(path==='/api/admin/users'&&request.method==='GET')return json({users:(await db.prepare("SELECT u.id,u.username,u.name,u.role,u.active,u.must_change,u.created_at,u.owner,u.login_type,u.reading_style,m.expires magic_expires,m.last_used_at magic_used,m.created_at magic_created,(SELECT count(*) FROM shares WHERE sharer_id=u.id) share_count,(SELECT last_used_at FROM user_tokens WHERE user_id=u.id AND kind='collect') shortcut_used FROM users u LEFT JOIN user_tokens m ON m.user_id=u.id AND m.kind='magic' ORDER BY u.created_at").all()).results});
 if(path==='/api/admin/audit'&&request.method==='GET')return json({events:(await db.prepare('SELECT a.*,u.name actor_name FROM audit_log a LEFT JOIN users u ON a.actor=u.id ORDER BY at DESC LIMIT 100').all()).results});
 const input=await body(request,8192);
 if(path==='/api/admin/users'&&request.method==='POST'){
  await rateLimit('create-user:'+me.id,10);const account=username(input.username);const link=input.loginType==='link';if(!link)validatePassword(input.password);const id=crypto.randomUUID();
  if(await db.prepare('SELECT id FROM users WHERE username=?').bind(account).first())throw new HttpError(409,'用户名已存在。');
  // Link-only accounts get an unusable random password; they sign in through their private link.
  await db.prepare('INSERT INTO users(id,username,name,password_hash,role,created_at,login_type,must_change) VALUES(?,?,?,?,?,?,?,?)').bind(id,account,String(input.name||account).slice(0,40),await passwordHash(link?randomToken():input.password as string),input.role==='admin'?'admin':'member',new Date().toISOString(),link?'link':'password',link?0:1).run();await auditEvent(me.id,'user.created',id);
  if(link){const token=await issueToken(id,'magic',expiryDays(input.days));await auditEvent(me.id,'user.magic_created',id);return json({ok:true,id,magicUrl:new URL(request.url).origin+'/magic#token='+token},201);}
  return json({ok:true,id},201);
 }
 const resetFor=path.match(/^\/api\/admin\/users\/([\w-]+)\/reset-link$/)?.[1];
 if(resetFor&&request.method==='POST'){
  const target=await db.prepare('SELECT id,owner FROM users WHERE id=? AND active=1').bind(resetFor).first<{id:string;owner:number}>();if(!target)throw new HttpError(404,'用户不存在或已停用。');
  if(target.owner&&!me.owner)throw new HttpError(403,'超级管理员账号只能由本人管理。');if(resetFor===me.id)throw new HttpError(400,'请在“我的账号”中修改自己的密码。');
  await rateLimit('reset-create:'+me.id,20);const token=await issueToken(resetFor,'reset',1);await auditEvent(me.id,'user.reset_link',resetFor);return json({resetUrl:new URL(request.url).origin+'/reset#token='+token});
 }
 const magic=path.match(/^\/api\/admin\/users\/([\w-]+)\/magic$/)?.[1];
 if(magic){
  const target=await db.prepare('SELECT id,owner,active FROM users WHERE id=?').bind(magic).first<{id:string;owner:number;active:number}>();if(!target)throw new HttpError(404,'用户不存在。');
  if(target.owner&&!me.owner)throw new HttpError(403,'超级管理员账号只能由本人管理。');
  if(request.method==='DELETE'){await db.prepare("DELETE FROM user_tokens WHERE user_id=? AND kind='magic'").bind(magic).run();await auditEvent(me.id,'user.magic_revoked',magic);return json({ok:true});}
  if(request.method==='POST'){await rateLimit('magic-create:'+me.id,20);const token=await issueToken(magic,'magic',expiryDays(input.days));await auditEvent(me.id,'user.magic_created',magic);return json({magicUrl:new URL(request.url).origin+'/magic#token='+token});}
 }
 const id=path.match(/^\/api\/admin\/users\/([\w-]+)$/)?.[1];
 if(id&&request.method==='PATCH'){
  if(id===me.id)throw new HttpError(400,'请从账号设置修改自己的密码；不能停用或降级自己。');
  const target=await db.prepare('SELECT id,owner,role FROM users WHERE id=?').bind(id).first<{id:string;owner:number;role:string}>();if(!target)throw new HttpError(404,'用户不存在。');
  if(target.owner&&!me.owner)throw new HttpError(403,'超级管理员账号只能由本人管理。');
  if(input.role!==undefined){if(!['admin','member'].includes(String(input.role)))throw new HttpError(400,'请选择有效权限。');if(target.owner)throw new HttpError(400,'超级管理员始终保留管理员权限。');const changed=await db.prepare("UPDATE users SET role=?,version=version+1 WHERE id=? AND (?='admin' OR role<>'admin' OR (SELECT count(*) FROM users WHERE role='admin' AND active=1)>1) RETURNING id").bind(input.role,id,input.role).first();if(!changed)throw new HttpError(409,'需保留一名可用管理员。');await auditEvent(me.id,input.role==='admin'?'user.promoted':'user.demoted',id);}
  else if(input.password!==undefined){validatePassword(input.password);await db.prepare("UPDATE users SET password_hash=?,must_change=1,login_type='password',version=version+1 WHERE id=?").bind(await passwordHash(input.password as string),id).run();await auditEvent(me.id,'user.password_reset',id);}
  else if(typeof input.active==='boolean'){const changed=await db.prepare("UPDATE users SET active=?,version=version+1 WHERE id=? AND EXISTS(SELECT 1 FROM users actor WHERE actor.id=? AND actor.active=1 AND actor.version=?) AND (?=1 OR role<>'admin' OR (SELECT count(*) FROM users WHERE role='admin' AND active=1)>1) RETURNING id").bind(input.active?1:0,id,me.id,me.version,input.active?1:0).first();if(!changed)throw new HttpError(409,'需保留一名可用管理员，请刷新后重试。');await auditEvent(me.id,input.active?'user.enabled':'user.disabled',id);}
  else throw new HttpError(400,'请选择有效操作。');
  await db.prepare('DELETE FROM sessions WHERE user_id=?').bind(id).run();return json({ok:true});
 }
 throw new HttpError(404,'接口不存在。');
}
export async function favoriteIds(userId:string){const rows=await env.DB!.prepare('SELECT share_id FROM user_favorites WHERE user_id=?').bind(userId).all<{share_id:string}>();return new Set(rows.results.map(i=>i.share_id));}

// Personal tokens: the hash identifies the owner, the sealed copy lets the owner see it again.
const TOKEN_PREFIX={collect:'ihub_',magic:'',reset:'',mcp:'ihmcp_'};
export type TokenKind=keyof typeof TOKEN_PREFIX;
export function expiryDays(value:unknown){const days=Number(value);return [1,7,30,90,365].includes(days)?days:days===0?0:30;}
export async function issueToken(userId:string,kind:TokenKind,days=0){
 const token=TOKEN_PREFIX[kind]+randomToken();const now=new Date().toISOString();
 await env.DB!.batch([env.DB!.prepare('DELETE FROM user_tokens WHERE user_id=? AND kind=?').bind(userId,kind),env.DB!.prepare('INSERT INTO user_tokens(id,user_id,kind,hash,sealed,created_at,expires) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),userId,kind,await digest(token),await seal(token,`user-token:${userId}:${kind}`),now,days?Date.now()+days*86400000:0)]);
 return token;
}
export async function readToken(userId:string,kind:TokenKind){const row=await env.DB!.prepare('SELECT sealed,created_at,last_used_at,expires FROM user_tokens WHERE user_id=? AND kind=?').bind(userId,kind).first<{sealed:string;created_at:string;last_used_at:string;expires:number}>();if(!row)return null;return {token:await unseal<string>(row.sealed,`user-token:${userId}:${kind}`),createdAt:row.created_at,lastUsedAt:row.last_used_at,expires:row.expires};}
export async function tokenUser(token:string,kind:TokenKind):Promise<User|null>{
 const prefix=TOKEN_PREFIX[kind];if(!token.startsWith(prefix)||!/^[\w-]{43}$/.test(token.slice(prefix.length)))return null;
 const row=await env.DB!.prepare("SELECT u.*,t.id token_id FROM user_tokens t JOIN users u ON u.id=t.user_id WHERE t.hash=? AND t.kind=? AND u.active=1 AND (t.expires=0 OR t.expires>?)").bind(await digest(token),kind,Date.now()).first<User&{token_id:string}>();
 if(!row)return null;await env.DB!.prepare('UPDATE user_tokens SET last_used_at=? WHERE id=?').bind(new Date().toISOString(),row.token_id).run();return row;
}
export async function meRoute(request:Request){
 const me=await requireUser(request);const path=new URL(request.url).pathname;
 if(path==='/api/me/recovery-codes'&&request.method==='GET')return json(await env.DB!.prepare("SELECT count(*) total,sum(used_at='') remaining,max(created_at) created_at FROM recovery_codes WHERE user_id=?").bind(me.id).first());
 if(path==='/api/me/mcp'&&request.method==='GET')return json(await readToken(me.id,'mcp')||{token:null});
 if(path==='/api/me/shortcut'&&request.method==='GET'){let t=await readToken(me.id,'collect');if(!t){await issueToken(me.id,'collect');t=await readToken(me.id,'collect');}return json({...t,name:me.name});}
 if(request.method!=='GET'&&request.method!=='HEAD'){
  const input=await body(request,4096);
  if(path==='/api/me/shortcut/reset'){await rateLimit('shortcut-reset:'+me.id,5);await issueToken(me.id,'collect');await auditEvent(me.id,'shortcut.reset');return json({...await readToken(me.id,'collect'),name:me.name});}
  if(path==='/api/me/recovery-codes'){
   await rateLimit('recovery-codes:'+me.id,5);const u=await env.DB!.prepare('SELECT password_hash,login_type FROM users WHERE id=?').bind(me.id).first<{password_hash:string;login_type:string}>();
   if(u?.login_type!=='link'&&!await verifyPassword(String(input.currentPassword||''),u?.password_hash||'invalid'))throw new HttpError(400,'当前密码不正确。');
   const codes=await issueRecoveryCodes(me.id);await auditEvent(me.id,'recovery.regenerated');return json({codes});
  }
  if(path==='/api/me/mcp'){await rateLimit('mcp-token:'+me.id,10);if(input.revoke){await env.DB!.prepare("DELETE FROM user_tokens WHERE user_id=? AND kind='mcp'").bind(me.id).run();await auditEvent(me.id,'mcp.revoked');return json({token:null});}await issueToken(me.id,'mcp');await auditEvent(me.id,'mcp.created');return json(await readToken(me.id,'mcp'));}
  if(path==='/api/me/preferences'){if(!STYLES.includes(String(input.readingStyle)))throw new HttpError(400,'请选择有效的阅读风格。');await env.DB!.prepare('UPDATE users SET reading_style=? WHERE id=?').bind(input.readingStyle,me.id).run();return json({ok:true,readingStyle:input.readingStyle});}
 }
 throw new HttpError(404,'接口不存在。');
}

// Once a setup link has been issued it is always required (expired links must be regenerated).
export async function setupState(){const users=await env.DB!.prepare('SELECT count(*) n FROM users').first<{n:number}>();const hash=await setting('bootstrap_hash');return {initialized:(users?.n||0)>0,tokenRequired:!!hash,tokenExpired:!!hash&&Number(await setting('bootstrap_expires'))<Date.now()};}
// Twenty single-use recovery codes (60 bits each). Only hashes are stored; the plaintext is shown once.
const CODE_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function recoveryCode(){return Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>CODE_ALPHABET[b&31]).join('').match(/.{4}/g)!.join('-');}
async function codeHash(userId:string,code:string){return digest(`recovery:${userId}:${code.toUpperCase().replace(/[^A-Z0-9]/g,'')}`);}
export async function issueRecoveryCodes(userId:string){
 const codes=Array.from({length:20},recoveryCode);const now=new Date().toISOString();const db=env.DB!;
 await db.batch([db.prepare('DELETE FROM recovery_codes WHERE user_id=?').bind(userId),...await Promise.all(codes.map(async c=>db.prepare('INSERT INTO recovery_codes(id,user_id,hash,created_at) VALUES(?,?,?,?)').bind(crypto.randomUUID(),userId,await codeHash(userId,c),now)))]);
 return codes;
}
async function resetPassword(u:User,password:string,action:string){
 const db=env.DB!;await db.batch([db.prepare("UPDATE users SET password_hash=?,must_change=0,login_type='password',version=version+1 WHERE id=?").bind(await passwordHash(password),u.id),db.prepare('DELETE FROM sessions WHERE user_id=?').bind(u.id)]);
 await auditEvent(u.id,action);return startSession({...u,must_change:0,login_type:'password',version:u.version+1});
}
