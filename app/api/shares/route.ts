import { getDb } from "../../../db";
import { shares } from "../../../db/schema";
import { desc, eq } from "drizzle-orm";
import { cleanUrl, fingerprint, json, mutationAllowed, readBody } from "../../../lib/shares";
import { xPostUrl } from "../../../lib/x-preview";
import { isTopic, inferTopic, safeImageUrl } from "../../../lib/content";
import {requireUser,favoriteIds} from "../../../lib/auth";
export const dynamic = "force-dynamic";
export async function GET(req:Request) {
  const me=await requireUser(req);const favorites=await favoriteIds(me.id);
  const items = await getDb().select().from(shares).orderBy(desc(shares.sharedAt)).limit(1000);
  return json({ items:items.map(i=>({...i,favorite:favorites.has(i.id)?1:0})) });
}
export async function POST(req: Request) {
  if (!mutationAllowed(req)) return json({ error: "请求来源无效。" }, 403);
  try {
    const body = await readBody(req);
    const url = cleanUrl(String(body.url || ""));
    const original = String(body.original || body.text || "").trim();
    if (!url && !original) return json({ error: "请填写链接或正文。" }, 400);
    if (original.length > 12000 || url.length > 2048) return json({ error: "正文最多 12,000 字，链接最多 2,048 字。" }, 400);
    if (body.category && !isTopic(body.category)) return json({error:"请选择有效的主题分类。"},400);
    const coverUrl=String(body.coverUrl||"").trim();
    if (coverUrl && (!safeImageUrl(coverUrl)||coverUrl.length>2048)) return json({error:"配图需使用有效的公开 HTTPS 图片地址。"},400);
    const day = body.date ? String(body.date) : "";
    if (day && (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day)))) return json({ error: "日期无效。" }, 400);
    const now = new Date().toISOString();
    const hash = await fingerprint(url || original);
    const db = getDb();
    const existing = await db.select().from(shares).where(eq(shares.fingerprint, hash)).get();
    if (existing) return json({ item: existing, duplicate: true });
    const item = { category: isTopic(body.category)?body.category: inferTopic(original), categorySource: body.category ? "manual" : "auto", coverUrl, collectedAt: now, id: crypto.randomUUID(), fingerprint: hash, title: String(body.title || original.slice(0, 55) || "待整理的链接").slice(0, 120), url, original, note: String(body.note || "").slice(0, 2000), sharer: String(body.sharer || "曾总").slice(0, 40), status: original || xPostUrl(url) ? "pending" : "needs_content", sharedAt: day ? new Date(day + "T12:00:00+08:00").toISOString() : now, updatedAt: now };
    const saved = await db.insert(shares).values(item).onConflictDoNothing().returning();
    if (!saved.length) return json({ item: await db.select().from(shares).where(eq(shares.fingerprint, hash)).get(), duplicate: true });
    return json({ item: saved[0] }, 201);
  } catch (e) { return json({ error: e instanceof SyntaxError ? "提交格式不正确。" : e instanceof Error ? e.message : "保存失败，请重试。" }, 400); }
}
