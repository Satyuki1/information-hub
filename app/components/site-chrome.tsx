"use client";
import {Globe2,ArrowUpRight} from 'lucide-react';
import {REPOSITORY_URL} from '../../lib/brand';
import {useSession} from './session';
import {LogoMark,Wordmark,GithubIcon} from './brand';
import type {SiteLanguage} from '../site-locale';
export const REPO=REPOSITORY_URL;
export function SiteNav({lang='zh'}:{lang?:SiteLanguage}){const me=useSession(),en=lang==='en';return <header className="site-nav"><div className="wrap"><a href={`/welcome?lang=${lang}`} className="brand" aria-label="X to Group"><LogoMark size={28}/><Wordmark size={17}/></a><nav aria-label={en?'Main navigation':'官网导航'}><a href={`/docs/${lang}/deploy`}>{en?'Documentation':'使用文档'}</a><a href={REPO} target="_blank" rel="noopener noreferrer">GitHub<ArrowUpRight size={13}/></a></nav><div className="site-actions"><a className="language-switch" href={`/welcome?lang=${en?'zh':'en'}`} hrefLang={en?'zh-CN':'en'} aria-label={en?'切换到中文':'Switch to English'}><Globe2 size={16}/><span>{en?'中文':'English'}</span></a><a href={me?'/':'/login'} className="btn btn-primary btn-sm">{en?(me?'Workspace':'Sign in'):(me?'工作台':'登录')}</a></div></div></header>;}
export function SiteFooter({lang='zh'}:{lang?:SiteLanguage}){const en=lang==='en';return <footer className="site-foot"><div className="wrap"><a href={`/welcome?lang=${lang}`} className="brand"><LogoMark size={22}/><Wordmark size={15}/></a><span className="footer-tagline">{en?'From X. For your group.':'从 X 出发，建立团队共同信源。'}</span><nav><a href={`/docs/${lang}/deploy`}>{en?'Documentation':'使用文档'}</a><a href={REPO} target="_blank" rel="noopener noreferrer"><GithubIcon size={15}/> GitHub</a></nav></div></footer>;}
