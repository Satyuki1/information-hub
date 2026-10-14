import {fromMarkdown} from 'mdast-util-from-markdown';
import {safeImageUrl,coverOf,dayOf,dateLabel,topicOf,type Article} from './content';
type Node={type:string;value?:string;depth?:number;url?:string;alt?:string;ordered?:boolean;children?:Node[]};
type Element={text_run:{content:string;text_element_style?:Record<string,unknown>}};
export type DocBlock={block_type:number;[key:string]:unknown};
export type Part={block:DocBlock;image?:string};
function textOf(n:Node):string{return n.value??n.alt??(n.children||[]).map(textOf).join('');}
function inline(n:Node,style:Record<string,unknown>={}):Element[]{
 if(n.type==='strong')style={...style,bold:true};if(n.type==='emphasis')style={...style,italic:true};if(n.type==='inlineCode')style={...style,inline_code:true};
 if(n.type==='link'&&/^https?:\/\//.test(n.url||''))style={...style,link:{url:n.url}};
 if(n.children)return n.children.flatMap(c=>inline(c,style));
 const text=n.type==='break'?'\n':textOf(n);const parts:Element[]=[];for(let i=0;i<text.length;i+=1800)parts.push({text_run:{content:text.slice(i,i+1800),...(Object.keys(style).length?{text_element_style:style}:{})}});return parts;
}
const block=(type:number,key:string,elements:Element[]):Part=>({block:{block_type:type,[key]:{elements:elements.length?elements:[{text_run:{content:' '}}]}}});
export function markdownParts(markdown:string):Part[]{
 const result:Part[]=[];
 function visit(n:Node){
  if(n.type==='root'){n.children?.forEach(visit);return;}
  if(n.type==='image'){
   const url=safeImageUrl(n.url||'');if(!url)return;
   if(new URL(url,'https://local.invalid').hostname==='pbs.twimg.com'&&/^\/(media|amplify_video_thumb|ext_tw_video_thumb|tweet_video_thumb)\/[\w/.-]+$/.test(new URL(url).pathname))result.push({block:{block_type:27,image:{}},image:url});
   else result.push(block(2,'text',[{text_run:{content:`配图：${n.alt||'查看原图'}`,text_element_style:{link:{url}}}}]));return;
  }
  if(n.type==='paragraph'&&n.children?.some(c=>c.type==='image')){let acc:Node[]=[];for(const c of n.children){if(c.type==='image'){if(acc.length){visit({type:'paragraph',children:acc});acc=[];}visit(c);}else acc.push(c);}if(acc.length)visit({type:'paragraph',children:acc});return;}
  if(n.type==='list'){n.children?.forEach(li=>{for(const child of li.children||[]){const start=result.length;visit(child);for(const p of result.slice(start)){if(p.block.block_type===2){p.block={block_type:n.ordered?13:12,[n.ordered?'ordered':'bullet']:p.block.text};}}}});return;}
  if(n.type==='blockquote'){for(const child of n.children||[]){const start=result.length;visit(child);for(const p of result.slice(start)){if(p.block.block_type===2)p.block={block_type:15,quote:p.block.text};}}return;}
  if(n.type==='thematicBreak'){result.push({block:{block_type:22,divider:{}}});return;}
  if(n.type==='code'){for(let i=0;i<(n.value||'').length;i+=1800)result.push(block(14,'code',[{text_run:{content:n.value!.slice(i,i+1800)}}]));return;}
  if(n.type==='heading'){const depth=Math.min(n.depth||1,6);result.push(block(depth+2,'heading'+depth,inline(n)));return;}
  result.push(block(n.type==='blockquote'?15:2,n.type==='blockquote'?'quote':'text',inline(n)));
 }
 visit(fromMarkdown(markdown) as Node);return result;
}
export function dailyKey(user:string,space:string,date:string){return `${user}:${space}:${dayOf(date)}`;}
const escape=(text:string)=>text.replace(/[\\`*_[\]<>]/g,'\\$&');
export function archiveMarkdown(item:Article,origin:string){return [`## ${dateLabel(item.collectedAt||item.sharedAt,true)} · ${escape(item.title)}`,`${escape(item.sharer)} 分享 · ${topicOf(item)}`,`[在 X to Group阅读全文](${origin}/read/${item.id})`,item.url?`[原始来源](${item.url})`:'',coverOf(item)&&!item.original.includes(coverOf(item))?`![封面](${coverOf(item)})`:'',item.note?`分享备注：${escape(item.note)}`:'',`### 中文摘要\n\n${item.summary}`,`### 原文\n\n${item.original}`,`### 中文译文\n\n${item.translation||'暂无译文'}`,'---'].filter(Boolean).join('\n\n');}
