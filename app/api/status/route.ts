import { json } from "../../../lib/shares";
import { loadConfig, getSecret, provider } from "../../../lib/config";
import { channel } from "../../../lib/x-source";
export async function GET() { const c = await loadConfig(); const ch = await channel(c); return json({ translationConfigured: Boolean(await getSecret(`ai:${provider(c).id}` as const)), xConfigured: true, xMode: ch.mode, reportEnabled: c.report.enabled, readingRequiresLogin: true, siteName: c.site.name }); }
