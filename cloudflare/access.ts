const encoder = new TextEncoder();
const cookieName = "zeng_session";
async function same(a: string, b: string) {
  const [x, y] = await Promise.all([a,b].map(s=>crypto.subtle.digest("SHA-256",encoder.encode(s))));
  const left = new Uint8Array(x), right = new Uint8Array(y);
  let difference = 0; for (let i=0;i<left.length;i++) difference |= left[i]^right[i];
  return difference === 0;
}
async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const result = await crypto.subtle.sign("HMAC",key,encoder.encode(value));
  return Array.from(new Uint8Array(result),x=>x.toString(16).padStart(2,"0")).join("");
}
export async function authorize(request: Request, secret: string): Promise<boolean|Response> {
  const url = new URL(request.url);
  if (url.pathname === "/auth/login" && request.method === "POST") {
    if(request.headers.get("origin") !== url.origin) return new Response("Forbidden",{status:403});
    if(Number(request.headers.get("content-length") || 0)>4096) return new Response("Too large",{status:413});
    const raw=await request.text();
    if(raw.length>4096) return new Response("Too large",{status:413});
    const access = new URLSearchParams(raw).get("access") || "";
    if(!await same(access,secret)) return loginPage("访问口令不正确，请重新输入。",401);
    const expires=String(Date.now()+30*86400000);
    const signature=await sign(expires,secret);
    return new Response(null,{status:303,headers:{Location:"/","Cache-Control":"no-store","Set-Cookie":`${cookieName}=${expires}.${signature}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`}});
  }
  const bearer=request.headers.get("authorization");
  if(bearer?.startsWith("Bearer ") && await same(bearer.slice(7),secret)) return true;
  const cookie=request.headers.get("cookie")?.split(";").map(s=>s.trim()).find(s=>s.startsWith(cookieName+"="))?.slice(cookieName.length+1);
  if(!cookie) return false;
  const [expires,signature]=cookie.split(".");
  if(!/^\d{13}$/.test(expires) || !/^[a-f0-9]{64}$/.test(signature||"") || Number(expires)<=Date.now() || Number(expires)>Date.now()+31*86400000) return false;
  return same(signature,await sign(expires,secret));
}
export function loginPage(error="",status=200) {
  return new Response(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>资讯汇集 · 进入阅读空间</title><style>*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#f3f5ed;color:#33462f;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;padding:24px}.card{width:100%;max-width:410px;padding:38px;background:#fff;border:1px solid #e3e8dc;border-radius:16px;box-shadow:0 12px 60px #384b2910}.mark{width:44px;height:48px;background:#293f33;border-radius:12px 12px 12px 2px;color:white;display:grid;place-items:center;font:27px serif}.overline{font-size:8px;letter-spacing:2px;color:#a0aa93;margin-top:28px}h1{font:600 27px serif;margin:13px 0}p{font-size:13px;color:#8a967f;line-height:1.8;margin-bottom:27px}label{font-size:12px;display:block}input{width:100%;padding:13px;border:1px solid #d9e0d1;border-radius:7px;font:inherit;margin-top:9px;outline-color:#bb8056}button{width:100%;padding:13px;background:#c76b3e;color:white;border:0;border-radius:7px;margin-top:20px;cursor:pointer;font-size:13px}.error{font-size:12px;color:#b46040;margin:12px 0 0}.footer{font-size:10px;color:#a8b29c;margin-top:24px;text-align:center}</style></head><body><main class="card"><div class="mark">曾</div><div class="overline">THE DAILY COLLECTION</div><h1>进入团队阅读空间</h1><p>曾总发现的好文章、好观点，都在这里。<br>输入访问口令，开始今天的阅读。</p><form method="POST" action="/auth/login"><label for="access">访问口令</label><input id="access" name="access" type="password" autocomplete="current-password" required maxlength="128" autofocus>${error?'<div class="error" role="alert">'+error+'</div>':""}<button>进入资讯汇集 →</button></form><div class="footer">每天一点，打开新视野。</div></main></body></html>`,{status,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'","X-Content-Type-Options":"nosniff"}});
}
