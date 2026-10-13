import { POST as saveShare } from "../shares/route";
import { json, mutationAllowed, readBody } from "../../../lib/shares";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  if (!mutationAllowed(req)) return json({message:"提交失败：请求来源无效。"}, 403);
  try {
    const body = await readBody(req);
    const input = String(body.input || "").trim();
    if (!input) return json({message:"没有收到分享内容。请在 X 中点分享，或运行快捷指令后粘贴链接。"}, 400);
    const url = input.match(/https?:\/\/[^\s<>"“”]+/i)?.[0] || "";
    const response = await saveShare(new Request(req.url, { method:"POST", headers:req.headers, body:JSON.stringify({ url, original:url ? "" : input, sharer:"曾总" }) }));
    const result = await response.json() as {item?:{id:string;status:string};duplicate?:boolean;error?:string};
    const message = result.error ? `提交失败：${result.error}` : result.duplicate ? "这条内容已经收录，可到资讯汇集网站查看。" : result.item?.status === "needs_content" ? "链接已保存。这个网站暂不能自动读取，请到分享库补充正文。" : "已提交到资讯汇集。后台正在整理，可以关闭；稍后到网站查看中文摘要。";
    return json({...result,message},response.status);
  } catch { return json({message:"提交失败：内容格式无效，请重试。"},400); }
}
