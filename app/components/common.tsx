"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, ImageOff } from "lucide-react";
import MediaGrid from "./media";
import { safeImageUrl, imageSrc, type Article } from "../../lib/content";
export function ArticleImage({src,alt="资讯配图",cover=false}:{src:string;alt?:string;cover?:boolean}){
 const [failed,setFailed]=useState(false); const safe=safeImageUrl(src);
 useEffect(()=>setFailed(false),[src]);
 if(!safe)return <span className="image-unavailable"><ImageOff size={17}/>图片地址不可用</span>;
 if(failed)return <a className="image-unavailable" href={imageSrc(safe)} target="_blank" rel="noopener noreferrer"><ImageOff size={17}/>图片暂时无法加载 · 打开查看<ArrowUpRight size={14}/></a>;
 return <span className={cover?"article-image is-cover":"article-image"}><MediaGrid images={[safe]} title={alt}/>{!cover&&alt&&<span className="image-caption">{alt}</span>}</span>;
}
export async function api<T = {item:Article;items:Article[];duplicate?:boolean}>(path:string,body?:unknown,method="POST"):Promise<T>{
 const res=await fetch(path,body===undefined?{cache:"no-store"}:{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 const data=await res.json() as T & {error?:string;message?:string}; if(!res.ok)throw new Error(data.error||data.message||"操作未完成，请稍后再试。"); return data;
}
