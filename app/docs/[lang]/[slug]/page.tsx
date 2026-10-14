import {notFound} from 'next/navigation';
import {DOCS,type Language} from '../../../../lib/docs-content';
import DocsView from '../../docs-view';
export default async function Page({params}:{params:Promise<{lang:string;slug:string}>}){const {lang,slug}=await params;if(!(lang==='zh'||lang==='en')||!DOCS[lang].some(p=>p.slug===slug))notFound();return <DocsView lang={lang as Language} slug={slug}/>;}

export async function generateMetadata({params}:{params:Promise<{lang:string;slug:string}>}){const {lang,slug}=await params;const page=(DOCS[lang as Language]||[]).find(p=>p.slug===slug);return {title:page?`${page.title} · X to Group Docs`:'Documentation',description:page?.description};}
