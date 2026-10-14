import {cookies} from 'next/headers';
export type SiteLanguage = 'zh' | 'en';
export async function siteLanguage(requested?: string | string[]): Promise<SiteLanguage> {
  if (requested === 'en' || requested === 'zh') return requested;
  return (await cookies()).get('xtg-language')?.value === 'en' ? 'en' : 'zh';
}
