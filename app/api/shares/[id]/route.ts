import {topicNames} from '../../../../lib/library';
import { getDb } from "../../../../db";
import { shares } from "../../../../db/schema";
import { eq, and, or, ne, lt } from "drizzle-orm";
import { json, mutationAllowed, readBody } from "../../../../lib/shares";
import { safeImageUrl } from "../../../../lib/content";
import {env} from "cloudflare:workers";
import {requireUser,favoriteIds} from "../../../../lib/auth";
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}) {
 const me=await requireUser(_req);const favorites=await favoriteIds(me.id);
 const item=await getDb().select().from(shares).where(eq(shares.id,(await params).id)).get();
 return item?json({item:{...item,favorite:favorites.has(item.id)?1:0}}):json({error:"资讯不存在。"},404);
}
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!mutationAllowed(req)) return json({ error: "请求来源无效。" }, 403);
  const { id } = await params;
  try {
    const me=await requireUser(req);
    const body = await readBody(req);
    if(me.role!=="admin"&&Object.keys(body).some(k=>k!=="favorite"))return json({error:"只有管理员可以修改资讯正文和分类。"},403);
    const update: Partial<typeof shares.$inferInsert> = {};
    if (body.category !== undefined) {
      if (!((await topicNames()).includes(String(body.category)))) return json({error:"请选择有效的主题分类。"},400);
      update.category=String(body.category); update.categorySource="manual";
    }
    if (body.coverUrl !== undefined) {
      if(typeof body.coverUrl!=="string" || body.coverUrl.length>2048 || (body.coverUrl && !safeImageUrl(body.coverUrl))) return json({error:"配图需使用有效的公开 HTTPS 图片地址。"},400);
      update.coverUrl=body.coverUrl;
    }
    if (typeof body.favorite === "boolean") {
      const item=await getDb().select().from(shares).where(eq(shares.id,id)).get();if(!item)return json({error:"资讯不存在。"},404);
      if(body.favorite)await env.DB!.prepare('INSERT OR IGNORE INTO user_favorites(id,user_id,share_id) VALUES(?,?,?)').bind(me.id+':'+id,me.id,id).run();
      else await env.DB!.prepare('DELETE FROM user_favorites WHERE user_id=? AND share_id=?').bind(me.id,id).run();
      if(Object.keys(body).length===1)return json({item:{...item,favorite:body.favorite?1:0}});
    }
    if (typeof body.original === "string") {
      if (!body.original.trim() || body.original.length > 12000) return json({ error: "正文需为 1 至 12,000 字。" }, 400);
      Object.assign(update, { original: body.original.trim(), contentKind: "provided", originalAuthor: "", sourceMeta:"{}", translation: "", translatedAt:"", processingStartedAt:"", summary: "", tags: "[]", status: "pending", error: "", updatedAt: new Date().toISOString() });
    }
    if (!Object.keys(update).length) return json({ error: "没有可更新的内容。" }, 400);
    const guard = body.original !== undefined ? and(eq(shares.id, id), or(ne(shares.status, "processing"), lt(shares.updatedAt, new Date(Date.now()-120000).toISOString()))) : eq(shares.id, id);
    const updated = await getDb().update(shares).set(update).where(guard).returning();
    return updated.length ? json({ item: {...updated[0],favorite:(await favoriteIds(me.id)).has(id)?1:0} }) : json({ error: "分享不存在或仍在翻译中，请稍后重试。" }, 409);
  } catch { return json({ error: "修改失败，请稍后重试。" }, 400); }
}
