import {ArrowRight,ShieldCheck,HelpCircle} from 'lucide-react';
import {LogoMark,Wordmark,GithubIcon} from '../components/brand';
import ShortcutTutorial from '../components/iphone-tutorial';
export const metadata={title:'iPhone 快捷指令教程 · information-hub',description:'图文教程：安装“分享到资讯汇集”快捷指令，在 X 里一键收录到团队资讯库。'};
export default function Guide(){
 return <div className="site">
  <header className="site-nav"><div className="site-wrap"><a href="/welcome" className="site-logo" aria-label="information-hub 首页"><LogoMark size={30}/><Wordmark size={18}/></a><nav aria-label="官网导航"><a href="/welcome#features">功能</a><a href="/welcome#ai">AI 友好</a><a href="/welcome#deploy">部署</a></nav><div className="site-actions"><a href="https://github.com/Satyuki1/information-hub" className="site-ghost" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><GithubIcon size={18}/></a><a href="/login" className="site-btn">登录</a></div></div></header>
  <main>
   <section className="site-section guide-hero"><div className="site-wrap"><div className="section-head"><span className="site-kicker">iPhone 快捷指令 · 图文教程</span><h2>六步，从安装到团队一起读。</h2><p>用 iPhone 的 Safari 登录 information-hub，在「快捷指令」页点一下按钮即可开始。整个过程只需要粘贴一次。</p><div className="hero-cta center"><a href="/shortcut" className="site-btn big">登录并获取我的快捷指令<ArrowRight size={18}/></a></div></div><ShortcutTutorial/></div></section>
   <section className="site-section faq"><div className="site-wrap narrow">
    <div className="guide-notes"><div><ShieldCheck size={20}/><b>为什么要粘贴连接地址？</b><p>iPhone 只能安装经过 Apple 签名的快捷指令，服务器无法为每个人单独签名。所以大家安装同一份文件，连接地址里带着你自己的站点和口令，系统由此知道分享来自谁。</p></div><div><HelpCircle size={20}/><b>分享菜单里找不到？</b><p>在分享菜单最下方点“编辑操作…”，把“分享到资讯汇集”加入收藏；或在「快捷指令」App 中长按它 → 详细信息，打开“在共享表单中显示”。</p></div></div>
    <details><summary>连接地址填错了，或者想换一个？</summary><p>在「快捷指令」App 中编辑这条快捷指令，替换第二个“文本”里的地址；或删除后重新安装。口令可以在网站「快捷指令」页随时重置，旧地址立即失效。</p></details>
    <details><summary>没有账号可以用吗？</summary><p>如果管理员允许匿名分享，可以在连接地址处填写 <code>https://站点地址/api/collect</code>，内容会以匿名身份收录；阅读整理后的内容仍需要账号。</p></details>
    <details><summary>电脑上怎么收录？</summary><p>登录后在首页输入框粘贴 X 链接即可；也可以在 AI 助手里通过 MCP 的 share_link 工具收录。</p></details>
   </div></section>
  </main>
  <footer className="site-footer"><div className="site-wrap"><a href="/welcome" className="site-logo"><LogoMark size={26}/><Wordmark size={16}/></a><span>由人精选、AI 协助整理的团队私有知识库</span><nav><a href="/welcome">产品介绍</a><a href="/login">登录</a></nav></div></footer>
 </div>;
}
