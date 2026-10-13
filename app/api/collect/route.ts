import { createShare, json, mutationAllowed, readBody } from "../../../lib/shares";
import { loadConfig } from "../../../lib/config";
import { tokenUser } from "../../../lib/auth";
export const dynamic = "force-dynamic";
// Used by the iPhone shortcut and /collect. A personal token (ihub_…) attributes the share to its owner.
export async function POST(req: Request) {
  if (!mutationAllowed(req)) return json({message:"提交失败：请求来源无效。"}, 403);
  try {
    const body = await readBody(req);
    const input = String(body.input || "").trim();
    if (!input) return json({message:"没有收到分享内容。请在 X 中点分享，或运行快捷指令后粘贴链接。"}, 400);
    // The shortcut posts to its personal connection URL (…/api/collect?token=ihub_…); body and header also work.
    const raw = String(body.token || new URL(req.url).searchParams.get("token") || req.headers.get("x-share-token") || "").trim();
    const token = raw && !/^(粘贴|paste)/i.test(raw) ? raw : "";
    const owner = token ? await tokenUser(token, "collect") : null;
    if (token && !owner) return json({message:"提交失败：专属口令无效或已重置。请登录资讯汇集，在「快捷指令」页重新复制口令。"}, 403);
    const config = await loadConfig();
    if (!owner && !config.site.anonymousCollect) return json({message:"提交失败：需要专属口令。请登录资讯汇集，在「快捷指令」页下载属于你的快捷指令。"}, 403);
    const url = input.match(/https?:\/\/[^\s<>"“”]+/i)?.[0] || "";
    const saved = await createShare({ url, original: url ? "" : input }, owner ? { sharer: owner.name, sharerId: owner.id } : { sharer: config.site.anonymousSharer, sharerId: "" });
    const who = owner ? `${owner.name}，` : "";
    const message = saved.duplicate ? `${who}这条内容已经收录，可到资讯汇集网站查看。` : saved.item.status === "needs_content" ? `${who}链接已保存。这个网站暂不能自动读取，请到网站补充正文。` : `${who}已提交到资讯汇集。后台正在翻译整理，可以关闭；稍后到网站查看中文摘要。`;
    return json({ item: saved.item, duplicate: saved.duplicate, identified: !!owner, message }, saved.duplicate ? 200 : 201);
  } catch (e) { return json({message:`提交失败：${e instanceof Error ? e.message : "内容格式无效，请重试。"}`},400); }
}
