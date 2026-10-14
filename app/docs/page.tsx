import {redirect} from 'next/navigation';
import {siteLanguage} from '../site-locale';
export default async function Page(){redirect(`/docs/${await siteLanguage()}/deploy`);}
