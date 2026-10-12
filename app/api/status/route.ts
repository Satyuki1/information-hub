import { env } from "cloudflare:workers";
import { json } from "../../../lib/shares";
export async function GET() { return json({ translationConfigured: Boolean(env.DEEPSEEK_API_KEY), xConfigured: Boolean(env.X_BEARER_TOKEN), wecomConfigured: false }); }
