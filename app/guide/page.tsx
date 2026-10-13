import {SiteNav,SiteFooter} from '../components/site-chrome';
import ShortcutTutorial from '../components/iphone-tutorial';
export const metadata={title:'iPhone 快捷指令教程 · information-hub',description:'安装“分享到资讯汇集”快捷指令，在 X 里一键收录到团队资讯库。'};
export default function Guide(){
 return <div className="site">
  <SiteNav/>
  <main>
   <section className="hero compact"><div className="wrap"><p className="eyebrow">iPhone 快捷指令</p><h1>六步，从安装到团队一起读。</h1><p className="lede">用 iPhone 的 Safari 登录 information-hub，在“快捷指令”页点一下按钮即可开始。整个过程只需要粘贴一次。</p><div className="cta"><a href="/shortcut" className="btn btn-primary btn-lg">获取我的快捷指令</a></div></div></section>
   <section className="block"><div className="wrap"><ShortcutTutorial/></div></section>
   <section className="block"><div className="wrap two"><h2 className="label">常见问题</h2><div className="faq">
    {[['为什么要粘贴连接地址？','iPhone 只能安装经过 Apple 签名的快捷指令，服务器无法为每个人单独签名。所以大家安装同一份文件，连接地址里带着你的站点和个人口令，系统由此知道分享来自谁。'],['分享菜单里找不到？','在分享菜单最下方点“编辑操作…”，把“分享到资讯汇集”加入收藏；或在“快捷指令”App 中长按它 → 详细信息，打开“在共享表单中显示”。'],['地址填错了，或想换一个？','在“快捷指令”App 中编辑这条快捷指令，替换第二个“文本”里的地址；或删除后重新安装。口令可在网站“快捷指令”页随时重置。'],['没有账号可以用吗？','如果管理员允许匿名分享，可以把地址填成 https://站点地址/api/collect，内容以匿名身份收录；阅读整理后的内容仍需要账号。'],['电脑上怎么收录？','登录后点左侧的“+”，粘贴 X 链接即可；也可以在 AI 助手里通过 MCP 的 share_link 工具收录。']].map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}
   </div></div></section>
  </main>
  <SiteFooter/>
 </div>;
}
