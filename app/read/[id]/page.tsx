import { getDb } from "../../../db";
import { shares } from "../../../db/schema";
import { eq,desc,ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { coverOf,topicOf } from "../../../lib/content";
import {headers} from "next/headers";
import {getUser,favoriteIds} from "../../../lib/auth";
import Reader from "./reader";
export const dynamic="force-dynamic";
type Props={params:Promise<{id:string}>};
async function find(id:string){return getDb().select().from(shares).where(eq(shares.id,id)).get();}
export async function generateMetadata({params}:Props){const i=await find((await params).id);return {title:i?`${i.title} · X to Group`:"内容未找到",description:i?.summary||"阅读原文和中文译文",openGraph:{title:i?.title||"X to Group",description:i?.summary||"团队资讯阅读库",type:"article",...(i&&coverOf(i)?{images:[coverOf(i)]}:{})}};}
export default async function ReadingPage({params}:Props){const item=await find((await params).id);if(!item)notFound();const recent=await getDb().select().from(shares).where(ne(shares.id,item.id)).orderBy(desc(shares.sharedAt)).limit(50);const same=recent.filter(i=>topicOf(i)===topicOf(item));const related=[...same,...recent.filter(i=>topicOf(i)!==topicOf(item))].slice(0,3);const me=await getUser(new Request("https://internal/",{headers:await headers()}));const favorites=me?await favoriteIds(me.id):new Set();return <Reader initial={{...item,favorite:favorites.has(item.id)?1:0}} related={related.map(i=>({...i,favorite:favorites.has(i.id)?1:0}))}/>;}
