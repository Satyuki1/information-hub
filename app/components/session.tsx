"use client";
import {useEffect,useState} from 'react';
export type CurrentUser={id:string;username:string;name:string;role:string;mustChange:boolean};
export function useSession(){const[user,setUser]=useState<CurrentUser|null>(null);useEffect(()=>{fetch('/api/auth/me',{cache:'no-store'}).then(r=>r.json() as Promise<{user:CurrentUser|null}>).then(d=>setUser(d.user)).catch(()=>{});},[]);return user;}
export async function requestJSON(path:string,value?:unknown,method='POST'){const r=await fetch(path,value===undefined?{cache:'no-store'}:{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});const data=await r.json() as any;if(!r.ok)throw new Error(data.error||'操作未完成，请稍后重试。');return data;}
