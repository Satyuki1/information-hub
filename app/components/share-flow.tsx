import {ArrowRight} from 'lucide-react';
import type {SiteLanguage} from '../site-locale';

export default function ShareFlow({lang}:{lang:SiteLanguage}){
 const en=lang==='en';
 return <figure className="share-flow" aria-label={en?'Share from X. Read together in your team space.':'从 X 分享，在团队空间一起阅读'}>
  <div className="flow-screen">
   <div className="flow-screen-label"><span>01</span><b>{en?'Share from your iPhone':'在 iPhone 上一键分享'}</b></div>
   <a href="/site/x-share-phone.png" target="_blank" rel="noreferrer" aria-label={en?'Enlarge the sharing preview':'放大查看分享界面'}><img src="/site/x-share-phone.png" alt={en?'iPhone X post with the Share to X to Group shortcut in the share sheet':'iPhone 上的 X 帖子与分享面板，选择「分享到 X to Group」'} width={851} height={1849} fetchPriority="high"/></a>
   <p>{en?'A personal shortcut for every member.':'一人一个快捷指令，分享记在自己名下。'}</p>
  </div>
  <div className="flow-transfer"><span className="flow-transfer-icon"><ArrowRight size={26}/></span><strong>{en?'Share once':'一键转发'}</strong><small>{en?'Summarize & translate':'自动汇总 · 翻译'}</small></div>
  <div className="flow-screen">
   <div className="flow-screen-label"><span>02</span><b>{en?'Read together as a team':'整个团队一起读'}</b></div>
   <a href="/site/team-reading-phone.png" target="_blank" rel="noreferrer" aria-label={en?'Enlarge the team reading preview':'放大查看团队阅读界面'}><img src="/site/team-reading-phone.png" alt={en?'X to Group team feed with a Chinese translation, original image and sharing status':'X to Group 团队信源，包含中文译文、原图和团队分享状态'} width={851} height={1848}/></a>
   <p>{en?'The original, its images and a translation, together.':'原文、配图、译文，一起收进团队空间。'}</p>
  </div>
  <figcaption>{en?'AI-generated interface previews based on the sharing workflow.':'根据分享流程生成的界面示意图'}</figcaption>
 </figure>;
}
