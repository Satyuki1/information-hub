import { getDb } from "../../../db";
import { shares } from "../../../db/schema";
import { desc } from "drizzle-orm";
import { createShare, InputError, json, mutationAllowed, readBody } from "../../../lib/shares";
import { loadConfig } from "../../../lib/config";
import {requireUser,favoriteIds,getUser} from "../../../lib/auth";
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
    const me = await getUser(req);
    const config = await loadConfig();
    if ((!me || me.must_change) && !config.site.anonymousCollect) return json({ error: "当前只接受登录用户或专属快捷指令的分享。" }, 403);
    // Members always share under their own name; administrators may record a share on someone's behalf.
    const actor = me && !me.must_change ? { sharer: me.role === "admin" && typeof body.sharer === "string" && body.sharer.trim() ? body.sharer.trim() : me.name, sharerId: me.id } : { sharer: config.site.anonymousSharer, sharerId: "" };
    const saved = await createShare(body, actor);
    return json(saved.duplicate ? { item: saved.item, duplicate: true } : { item: saved.item }, saved.duplicate ? 200 : 201);
  } catch (e) { return json({ error: e instanceof SyntaxError ? "提交格式不正确。" : e instanceof InputError || e instanceof Error ? e.message : "保存失败，请重试。" }, 400); }
}
