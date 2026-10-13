import ReportView from './report-view';
export const dynamic="force-dynamic";
export const metadata={title:'每日日报 · 资讯汇集'};
export default async function Page({params}:{params:Promise<{day:string}>}){return <ReportView day={(await params).day}/>;}
