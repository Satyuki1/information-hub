import {redirect,notFound} from 'next/navigation';
export default async function Page({params}:{params:Promise<{lang:string}>}){const {lang}=await params;if(lang!=='zh'&&lang!=='en')notFound();redirect(`/docs/${lang}/deploy`);}
