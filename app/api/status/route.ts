import { env } from "cloudflare:workers";
import { json } from "../../../lib/shares";
export async function GET() { return json({ translationConfigured: Boolean(env.DEEPSEEK_API_KEY), xConfigured: true, xMode: env.TWITTERAPI_IO_KEY ? "articles_and_images" : "public_preview", wecomConfigured: false, readingRequiresLogin: true }); }
