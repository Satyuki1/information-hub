import { getDb } from "../../../db";
import { shares } from "../../../db/schema";
import { eq,desc,ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { coverOf,topicOf } from "../../../lib/content";
import Reader from "./reader";
export const dynamic="force-dynamic";
type Props={params:Promise<{id:string}>};
async function find(id:string){return getDb().select().from(shares).where(eq(shares.id,id)).get();}
export async function generateMetadata({params}:Props){const i=await find((await params).id);return {title:i?`${i.title} · 资讯汇集`:"内容未找到",description:i?.summary||"阅读原文和中文译文",openGraph:{title:i?.title||"资讯汇集",description:i?.summary||"团队资讯阅读库",type:"article",...(i&&coverOf(i)?{images:[coverOf(i)]}:{})}};}
export default async function ReadingPage({params}:Props){const item=await find((await params).id);if(!item)notFound();const recent=await getDb().select().from(shares).where(ne(shares.id,item.id)).orderBy(desc(shares.sharedAt)).limit(50);const same=recent.filter(i=>topicOf(i)===topicOf(item));const related=[...same,...recent.filter(i=>topicOf(i)!==topicOf(item))].slice(0,3);return <Reader initial={item} related={related}/>;}
