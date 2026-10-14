'use client';
import {useEffect} from 'react';
import type {SiteLanguage} from '../site-locale';
export function RememberLanguage({lang}:{lang:SiteLanguage}) {
  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    document.cookie = `xtg-language=${lang}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  }, [lang]);
  return null;
}
