"use client";
import {useEffect,type ReactNode} from 'react';
import XShell from './x-shell';
// All reading and account pages use the same X shell.
const TITLES:Record<string,string>={settings:'设置',reports:'每日日报',shortcut:'快捷指令',account:'我的账号',admin:'管理后台'};
export default function AppFrame({active,aside,children}:{active:string;aside?:ReactNode;children:ReactNode}){
 useEffect(()=>{if(TITLES[active])document.title=`${TITLES[active]} · X to Group`;},[active]);
 return <XShell active={active} aside={aside}>{children}</XShell>;
}
