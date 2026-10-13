import { getDb } from "../../../../../db";
import { shares } from "../../../../../db/schema";
import { topicOf, safeImageUrl } from "../../../../../lib/content";
import { eq } from "drizzle-orm";
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}) {
 const item=await getDb().select().from(shares).where(eq(shares.id,(await params).id)).get();
 if(!item) return Response.json({error:"分享不存在"},{status:404});
 const markdown=[`# ${item.title}`,`分享人：${item.sharer}`,`主题：${topicOf(item)}`,safeImageUrl(item.coverUrl)?`![文章封面](${safeImageUrl(item.coverUrl)})`:"",item.originalAuthor?`原作者：${item.originalAuthor}`:"",item.url?`来源：${item.url}`:"",item.contentKind==="x_preview"?"> 仅为 X 公开预览摘录，可能不包含完整长文、线程、图片或视频。":"",item.summary?`## 中文摘要\n\n${item.summary}`:"",`## 原文\n\n${item.original}`,`## 中文译文\n\n${item.translation||"尚未生成"}`].filter(Boolean).join("\n\n");
 return new Response(markdown,{headers:{"Content-Type":"text/markdown; charset=utf-8","Content-Disposition":`attachment; filename="share-${item.id}.md"`,"Cache-Control":"no-store"}});
}
