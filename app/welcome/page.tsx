import {ArrowRight,Smartphone,Radio,Target,Newspaper,Send,Bot,KeyRound,Languages,Rows3,PlugZap} from 'lucide-react';
import {GithubIcon} from '../components/brand';
import {SiteNav,SiteFooter,REPO} from '../components/site-chrome';
export const metadata={title:'information-hub · 团队私有资讯库',description:'由人精选、AI 协助整理的团队私有知识库。把 X 上的好内容分享进来，整理原文、图片和译文，让团队在同一个地方阅读、查找和积累。'};
const FEATURES=[
 {icon:Smartphone,title:'一键收录',text:'iPhone 快捷指令：在 X 里点分享即可收录。每人一个连接地址，记在本人名下。'},
 {icon:Languages,title:'原文与译文',text:'保留原文、图片和排版，生成中文译文、摘要和主题分类，可双语对照。'},
 {icon:Radio,title:'订阅账号',text:'订阅值得长期关注的 X 账号，新帖定时抓取并翻译，按账号查看。'},
 {icon:Target,title:'定向分析',text:'写下团队关注方向，每条资讯给出分析要点和 0–100 相关度。'},
 {icon:Newspaper,title:'每日日报',text:'每天汇总要点、分主题速览、趋势与建议，只引用站内资讯。'},
 {icon:Send,title:'群推送与归档',text:'新资讯和日报推送到飞书、企业微信群，也能按天归档到飞书知识库。'},
 {icon:Bot,title:'多种模型',text:'DeepSeek、OpenAI、Claude、通义千问、Kimi、智谱、豆包，或任意 OpenAI 兼容接口。'},
 {icon:KeyRound,title:'账号与安全',text:'免密登录链接、20 个恢复码、密钥加密存储，数据都在你自己的 Cloudflare。'},
];
export default function Welcome(){
 return <div className="site">
  <SiteNav/>
  <main>
   <section className="hero"><div className="wrap">
    <p className="eyebrow">开源 · 部署在你自己的 Cloudflare</p>
    <h1>一个人看到的好内容，<br/>整个团队都能读到。</h1>
    <p className="lede"><strong>information-hub</strong> 是一个由人精选、AI 协助整理的团队私有知识库。把你在 X 上发现的好内容分享进来，整理原文、图片和译文，让团队在同一个地方阅读、查找和积累。</p>
    <div className="cta"><a href="/login" className="btn btn-primary btn-lg">登录</a><a href="#deploy" className="btn btn-secondary btn-lg">部署你自己的<ArrowRight size={16}/></a></div>
    <figure className="shot browser"><div className="shot-bar"><i/><i/><i/></div><img src="/site/home-x.jpg" alt="information-hub 首页（X 风格）" width={1440} height={900}/></figure>
    <figure className="shot phone hero-phone"><img src="/site/mobile-x.jpg" alt="information-hub 手机首页（X 风格）" width={390} height={844}/></figure>
   </div></section>
   <section id="why" className="block"><div className="wrap two">
    <h2 className="label">为什么做这个项目</h2>
    <div className="prose">
     <p>做这个项目，起因是一个观察：在 X 上，能看到不少开发者、研究者和创业者直接交流技术进展、实践经验和自己的判断。有些讨论还没有变成正式文章，却已经值得团队关注。</p>
     <blockquote>但一个人看到了，不代表整个团队都能读到。</blockquote>
     <p>把链接发进群里，伙伴可能打不开，也可能没有时间读完外文。手动复制、翻译、整理图片很费事；经过几轮转述，原作者的表达也容易走样。</p>
     <p>information-hub 让“一个人看到”变成“整个团队读到”：在 X 里点一下分享，原文、图片和中文译文被完整保存，按天归档、按主题整理；谁分享的、什么时候分享的，一目了然。</p>
    </div>
   </div></section>
   <section className="block"><div className="wrap"><ol className="flow">{[['分享','iPhone 快捷指令、网页或 AI 助手，把链接交给 information-hub。'],['整理','抓取原文和图片，翻译全文，生成摘要、分类和定向分析。'],['阅读','团队按自己习惯的风格阅读、搜索和收藏，每天还有一份日报。']].map(([t,d],n)=><li key={t}><span>0{n+1}</span><h3>{t}</h3><p>{d}</p></li>)}</ol></div></section>
   <section id="features" className="block"><div className="wrap two"><h2 className="label">功能</h2><ul className="features">{FEATURES.map(f=><li key={f.title}><f.icon size={20} strokeWidth={1.75}/><div><h3>{f.title}</h3><p>{f.text}</p></div></li>)}</ul></div></section>
   <section id="styles" className="block"><div className="wrap"><div className="head"><h2>每个人用自己习惯的方式读</h2><p>X 信息流、小红书瀑布流、今日头条新闻列表。在头像菜单里切换，手机和电脑一致。</p></div>
    <div className="phones">{[['mobile-x','X'],['mobile-red','小红书'],['mobile-news','今日头条']].map(([f,l])=><figure key={f}><div className="shot phone"><img src={`/site/${f}.jpg`} alt={`${l}风格`} width={390} height={844} loading="lazy"/></div><figcaption>{l}</figcaption></figure>)}</div>
   </div></section>
   <section className="block"><div className="wrap split">
    <div><h2>分享一次，整理成好读的一页</h2><p>在 X 里点 分享 → 分享到资讯汇集。后台抓取原文和图片，翻译成中文，写好摘要，并按团队关注点给出分析和相关度；原文与译文随时对照。</p><a className="link" href="/guide">iPhone 快捷指令教程 <ArrowRight size={14}/></a></div>
    <figure className="shot"><img src="/site/reader.jpg" alt="整理后的阅读页：摘要、定向分析和中文译文" width={1440} height={900} loading="lazy"/></figure>
   </div></section>
   <section id="ai" className="block"><div className="wrap"><div className="head"><h2>交给 AI 部署，也让 AI 来读</h2></div>
    <div className="ai-grid">
     <div><h3><Rows3 size={18} strokeWidth={1.75}/>部署</h3><p>仓库自带 <code>AGENTS.md</code>、Claude Code 部署 skill 和一条命令的部署脚本。把仓库地址交给 Codex、Claude Code 或 WorkBuddy，它们就能部署到你的 Cloudflare。</p><pre><code>{`git clone ${REPO}.git
cd information-hub && npm ci
npx wrangler login
npm run deploy`}</code></pre></div>
     <div><h3><PlugZap size={18} strokeWidth={1.75}/>MCP</h3><p>每位成员在账号页生成令牌，就能在 Claude Code、Codex、Cursor 里搜索资讯、阅读全文、查看日报、提问，或让 AI 帮你收录链接。</p><pre><code>{`claude mcp add --transport http information-hub \\
  https://你的站点/mcp \\
  --header "Authorization: Bearer ihmcp_…"`}</code></pre></div>
    </div>
   </div></section>
   <section id="deploy" className="block"><div className="wrap"><div className="head"><h2>十分钟拥有团队自己的 information-hub</h2><p>运行在你自己的 Cloudflare 账号（Workers + D1），数据和密钥都在你手中。</p></div>
    <ol className="flow">{[['部署','运行 npm run deploy：创建数据库、执行迁移、生成主密钥并发布。'],['创建管理员','用部署生成的私有链接设置超级管理员，下载 20 个恢复码。'],['配置','在后台选择模型并填写 Key、选择 X 抓取渠道，按需开启推送与日报。'],['邀请团队','添加成员或生成免密链接，大家各自安装快捷指令。']].map(([t,d],n)=><li key={t}><span>0{n+1}</span><h3>{t}</h3><p>{d}</p></li>)}</ol>
    <div className="cta center"><a href={REPO} className="btn btn-primary btn-lg" target="_blank" rel="noopener noreferrer"><GithubIcon size={17}/>在 GitHub 查看</a></div>
   </div></section>
   <section className="block"><div className="wrap two"><h2 className="label">常见问题</h2><div className="faq">
    {[['数据存在哪里？','全部在你自己的 Cloudflare 账号：资讯和账号在 D1 数据库，API Key 用你的主密钥加密保存。'],['需要哪些费用？','Cloudflare 免费额度通常足够团队使用；大模型和 X 数据接口按服务商计费，后台可设每日上限。'],['没有 X API 能用吗？','能。选择“仅公开预览”可读取单条帖子的文字；订阅账号与长文章需要 TwitterAPI.io 或 X 官方 API。'],['成员需要注册吗？','不需要。管理员添加成员，或生成免密登录链接发给对方。'],['忘记管理员密码怎么办？','用创建账号时下载的恢复码重置；恢复码也丢失时，运维运行 npm run reset-password 生成一次性重置链接。']].map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}
   </div></div></section>
  </main>
  <SiteFooter/>
 </div>;
}
