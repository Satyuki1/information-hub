import handler from "vinext/server/fetch-handler";
import { deliverNotifications } from "../lib/wecom";
import { processShare } from "../lib/shares";

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname === "/auth/login") return Response.redirect(url.origin, 303);
    if (["POST", "PATCH", "DELETE"].includes(request.method)) {
      const origin=request.headers.get("origin");
      if(origin && origin !== url.origin) return Response.json({error:"请求来源无效。"},{status:403});
      if(env.DB) {
        const bucket="write:"+(request.headers.get("cf-connecting-ip")||"unknown")+":"+Math.floor(Date.now()/60000);
        const limited=await env.DB.prepare("INSERT INTO usage_windows (key, count) VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<30 RETURNING count").bind(bucket).first();
        if(!limited) return Response.json({error:"操作太频繁，请一分钟后重试。"},{status:429,headers:{"Retry-After":"60"}});
      }
    }
    if ((request.method === "GET" || request.method === "HEAD") && !url.pathname.startsWith("/api/") && env.ASSETS) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) {
        if (url.pathname.endsWith(".shortcut") && asset.ok) {
          const download = new Response(asset.body, asset);
          download.headers.set("Content-Type", "application/octet-stream");
          download.headers.set("Content-Disposition", "attachment; filename*=UTF-8''" + encodeURIComponent("分享到资讯汇集.shortcut"));
          return download;
        }
        return asset;
      }
    }
    const response = await handler.fetch(request, env, ctx);
    if (request.method === "POST" && ["/api/shares", "/api/collect"].includes(url.pathname) && response.status === 201) {
      const saved = await response.clone().json() as { item?: { id: string; status: string } };
      if (saved.item?.status === "pending") ctx.waitUntil(processShare(saved.item.id));
    }
    // Team records must not be cached by shared proxies.
    const secured = new Response(response.body, response);
    if ((url.pathname.startsWith("/api/") && url.pathname!=="/api/media") || response.headers.get("content-type")?.includes("text/html")) secured.headers.set("Cache-Control", "no-store");
    secured.headers.set("X-Content-Type-Options", "nosniff");
    secured.headers.set("Referrer-Policy", "same-origin");
    return secured;
  },
  async scheduled(_controller: ScheduledController, env: Cloudflare.Env) {
    if (!env.DB) return;
    // D1 retains work if the request's 30-second background window expires.
    const stale = new Date(Date.now() - 120000).toISOString();
    const queued = await env.DB.prepare("SELECT id FROM shares WHERE status='pending' OR (status='processing' AND updated_at < ?) ORDER BY shared_at ASC LIMIT 3").bind(stale).all<{ id: string }>();
    await deliverNotifications();
    for (const item of queued.results) await processShare(item.id);
    await deliverNotifications();
  }
};
