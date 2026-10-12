import { getDb } from "../../../../db";
import { shares } from "../../../../db/schema";
import { eq, and, or, ne, lt } from "drizzle-orm";
import { json, mutationAllowed, readBody } from "../../../../lib/shares";
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!mutationAllowed(req)) return json({ error: "请求来源无效。" }, 403);
  const { id } = await params;
  try {
    const body = await readBody(req);
    const update: Partial<typeof shares.$inferInsert> = {};
    if (typeof body.favorite === "boolean") update.favorite = body.favorite ? 1 : 0;
    if (typeof body.original === "string") {
      if (!body.original.trim() || body.original.length > 12000) return json({ error: "正文需为 1 至 12,000 字。" }, 400);
      Object.assign(update, { original: body.original.trim(), translation: "", summary: "", tags: "[]", status: "pending", error: "", updatedAt: new Date().toISOString() });
    }
    if (!Object.keys(update).length) return json({ error: "没有可更新的内容。" }, 400);
    const guard = body.original !== undefined ? and(eq(shares.id, id), or(ne(shares.status, "processing"), lt(shares.updatedAt, new Date(Date.now()-120000).toISOString()))) : eq(shares.id, id);
    const updated = await getDb().update(shares).set(update).where(guard).returning();
    return updated.length ? json({ item: updated[0] }) : json({ error: "分享不存在或仍在翻译中，请稍后重试。" }, 409);
  } catch { return json({ error: "修改失败，请稍后重试。" }, 400); }
}
