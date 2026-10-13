/** Public oEmbed preview only; never treat it as an entire article or thread. */
export function xPostUrl(value: string): string | null {
  let url: URL; try { url = new URL(value); } catch { return null; }
  if (!["x.com","www.x.com","twitter.com","www.twitter.com","mobile.twitter.com","mobile.x.com"].includes(url.hostname.toLowerCase())) return null;
  const match = url.pathname.match(/^\/([A-Za-z0-9_]+|i\/web)\/status\/(\d+)(?:\/|$)/);
  return match ? `https://x.com/${match[1]}/status/${match[2]}` : null;
}
export function parseOembedText(html: string) {
  const paragraph=html.match(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/i)?.[1];
  if(!paragraph) return "";
  const named: Record<string,string> = {amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" ",mdash:"—",ndash:"–",hellip:"…",lsquo:"‘",rsquo:"’",ldquo:"“",rdquo:"”"};
  return paragraph.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"").replace(/<br\s*\/?\s*>/gi,"\n").replace(/<[^>]*>/g,"").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(raw,key:string)=>{
    if(key.startsWith("#")) { const n=key[1].toLowerCase()==="x"?parseInt(key.slice(2),16):Number(key.slice(1)); return n>0&&n<=0x10ffff?String.fromCodePoint(n):raw; }
    return named[key.toLowerCase()] ?? raw;
  }).trim();
}
export async function fetchXPreview(value: string) {
  const canonical=xPostUrl(value);
  if(!canonical) throw new Error("请使用 X 帖子的完整链接（包含 /status/）。");
  const endpoint=new URL("https://publish.x.com/oembed");
  endpoint.search=new URLSearchParams({url:canonical,omit_script:"true",hide_thread:"true",dnt:"true"}).toString();
  const response=await fetch(endpoint,{signal:AbortSignal.timeout(15000),redirect:"manual"});
  if(!response.ok) throw new Error(response.status===429?"X 公开预览暂时限流，请稍后重试或粘贴正文。":"这条帖子没有可用的公开预览。链接已保留，可粘贴正文生成摘要。");
  const raw=await response.text();
  if(raw.length>100000) throw new Error("公开预览内容异常，请手动补充正文。");
  const data=JSON.parse(raw) as {html?:string;author_name?:string};
  const text=parseOembedText(data.html||"");
  if(!text || !text.replace(/https?:\/\/\S+/g,"").trim()) throw new Error("公开预览里没有足够的文字，可能只有图片、视频或文章链接；请补充正文。");
  if(text.length>12000) throw new Error("公开预览超过长度限制，请分段粘贴正文。");
  return {text,author:String(data.author_name||"").slice(0,120)};
}
