import { env } from "cloudflare:workers";
import { buildWecomMessage, type MessageShare } from "./wecom-message";
export async function deliverNotifications() {
  if(!env.DB || !env.WECOM_WEBHOOK_URL) return;
  const webhook=new URL(env.WECOM_WEBHOOK_URL);
  if(webhook.origin!=="https://qyapi.weixin.qq.com" || webhook.pathname!=="/cgi-bin/webhook/send") throw new Error("机器人地址配置无效");
  const now=new Date().toISOString();
  // Webhooks provide no idempotency key. Never blindly resend an ambiguous delivery.
  await env.DB.prepare("UPDATE shares SET notify_status='uncertain', notify_error='发送中断，送达状态待确认；为避免重复提醒，未自动重发。' WHERE notify_status='sending' AND notify_next_at < ?").bind(now).run();
  const jobs=await env.DB.prepare("SELECT id FROM shares WHERE status='ready' AND notify_status='pending' AND notify_next_at <= ? ORDER BY updated_at ASC LIMIT 3").bind(now).all<{id:string}>();
  for(const job of jobs.results) {
    const lease=crypto.randomUUID();
    const claimed=await env.DB.prepare("UPDATE shares SET notify_status='sending', notify_attempts=notify_attempts+1, notify_lease=?, notify_next_at=? WHERE id=? AND status='ready' AND notify_status='pending' AND notify_next_at<=? RETURNING id,title,summary,original,content_kind AS contentKind,original_author AS originalAuthor,sharer,notify_attempts AS attempts")
      .bind(lease,new Date(Date.now()+120000).toISOString(),job.id,now).first<MessageShare & {attempts:number}>();
    if(!claimed) continue;
    let state="uncertain", error="发送未确认；为避免重复提醒，未自动重发。";
    try {
      const response=await fetch(webhook.toString(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(buildWecomMessage(claimed)),signal:AbortSignal.timeout(10000),redirect:"manual"});
      const result=await response.json() as {errcode?:number};
      if(response.ok && result.errcode===0) { state="sent"; error=""; }
      else if(typeof result.errcode==="number" && result.errcode!==0) {
        const retryable=[-1,45009].includes(result.errcode);
        state=retryable&&claimed.attempts<3?"pending":"failed";
        error=`企业微信拒绝推送（${result.errcode}）${state==="pending"?"，稍后自动重试。":"，请检查机器人配置。"}`;
      }
    } catch { /* Network errors may happen after delivery; keep their outcome uncertain. */ }
    await env.DB.prepare("UPDATE shares SET notify_status=?, notify_error=?, notified_at=?, notify_next_at=? WHERE id=? AND notify_status='sending' AND notify_lease=?")
      .bind(state,error,state==="sent"?new Date().toISOString():"",new Date(Date.now()+claimed.attempts*60000).toISOString(),job.id,lease).run();
  }
}
