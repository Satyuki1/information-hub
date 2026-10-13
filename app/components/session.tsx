"use client";
import {useCallback,useEffect,useState} from 'react';
export type ReadingStyle='x'|'red'|'news';
export type CurrentUser={id:string;username:string;name:string;role:string;mustChange:boolean;owner?:boolean;loginType?:string;readingStyle?:ReadingStyle};
export const STYLE_OPTIONS:{id:ReadingStyle;label:string;hint:string}[]=[{id:'x',label:'X 风格',hint:'信息流 · 简洁克制'},{id:'red',label:'小红书风格',hint:'瀑布流卡片 · 图片优先'},{id:'news',label:'今日头条风格',hint:'新闻列表 · 信息密度高'}];
let cached:Promise<CurrentUser|null>|null=null;
function loadMe(){cached??=fetch('/api/auth/me',{cache:'no-store'}).then(r=>r.json() as Promise<{user:CurrentUser|null}>).then(d=>d.user).catch(()=>null);return cached;}
export function useSession(){const[user,setUser]=useState<CurrentUser|null>(null);useEffect(()=>{loadMe().then(setUser);},[]);return user;}
function storedStyle():ReadingStyle{try{const v=localStorage.getItem('reading-style');if(v==='x'||v==='red'||v==='news')return v;}catch{}return 'x';}
export function applyStyle(style:ReadingStyle){document.documentElement.dataset.style=style;try{localStorage.setItem('reading-style',style);}catch{}}
// The last choice is cached locally so the right layout paints before the session request returns.
export function useReadingStyle(me:CurrentUser|null){
 const[style,setStyle]=useState<ReadingStyle>('x');
 useEffect(()=>{const s=storedStyle();setStyle(s);applyStyle(s);},[]);
 useEffect(()=>{if(me?.readingStyle){setStyle(me.readingStyle);applyStyle(me.readingStyle);}},[me?.readingStyle]);
 const change=useCallback(async(next:ReadingStyle)=>{setStyle(next);applyStyle(next);cached=null;try{await requestJSON('/api/me/preferences',{readingStyle:next},'PATCH');}catch{}},[]);
 return [style,change] as const;
}
export async function requestJSON(path:string,value?:unknown,method='POST'){const r=await fetch(path,value===undefined?{cache:'no-store'}:{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});const data=await r.json().catch(()=>({})) as any;if(!r.ok)throw new Error(data.error||data.message||'操作未完成，请稍后重试。');return data;}
export function initials(name:string){return (name||'?').trim().slice(0,1).toUpperCase();}
const HUES=[204,262,330,14,36,152,188,286];
export function hueOf(value:string){let h=0;for(const c of value)h=(h*31+c.charCodeAt(0))>>>0;return HUES[h%HUES.length];}
