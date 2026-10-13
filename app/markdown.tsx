import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArticleImage } from "./components/common";
export default function Markdown({text}:{text:string}) {
  return <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{
    p:({children})=><div className="markdown-paragraph">{children}</div>,
    a:({href,children})=>href?.startsWith("/")?<a href={href}>{children}</a>:<a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
    img:({src,alt})=><ArticleImage src={typeof src==="string"?src:""} alt={alt||"原文配图"}/>,
    table:({children})=><div className="markdown-table"><table>{children}</table></div>
  }}>{text}</ReactMarkdown></div>;
}
