"use client";
import {useEffect,useState} from 'react';
export type CurrentUser={id:string;username:string;name:string;role:string;mustChange:boolean;owner?:boolean;loginType?:string};
let cached:Promise<CurrentUser|null>|null=null;
function loadMe(){cached??=fetch('/api/auth/me',{cache:'no-store'}).then(r=>r.json() as Promise<{user:CurrentUser|null}>).then(d=>d.user).catch(()=>null);return cached;}
export function useSession(){const[user,setUser]=useState<CurrentUser|null>(null);useEffect(()=>{loadMe().then(setUser);},[]);return user;}
export async function requestJSON(path:string,value?:unknown,method='POST'){const r=await fetch(path,value===undefined?{cache:'no-store'}:{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});const data=await r.json().catch(()=>({})) as any;if(!r.ok)throw new Error(data.error||data.message||'操作未完成，请稍后重试。');return data;}
export function initials(name:string){return (name||'?').trim().slice(0,1).toUpperCase();}
const HUES=[204,262,330,14,36,152,188,286];
export function hueOf(value:string){let h=0;for(const c of value)h=(h*31+c.charCodeAt(0))>>>0;return HUES[h%HUES.length];}
