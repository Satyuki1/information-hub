import {ArrowRight,Smartphone,Radio,Target,Newspaper,Send,Bot,KeyRound,Share2,Sparkles,Users,TerminalSquare,PlugZap,Check,Languages} from 'lucide-react';
import {LogoMark,Wordmark,GithubIcon} from '../components/brand';
import ShortcutTutorial,{Phone,ReadScreen} from '../components/iphone-tutorial';
export const metadata={title:'information-hub · 团队私有资讯库',description:'由人精选、AI 协助整理的团队私有知识库。把 X 上的好内容分享进来，整理原文、图片和译文，让团队在同一个地方阅读、查找和积累。'};
const REPO='https://github.com/Satyuki1/information-hub';
const FEATURES=[
 {icon:Smartphone,title:'专属快捷指令',text:'在 X 里点一下分享即可收录。每人一个连接地址，分享自动记在本人名下。'},
 {icon:Languages,title:'原文与译文并存',text:'保留原文、图片和排版，生成中文全文译文、摘要和主题分类，支持双语对照。'},
 {icon:Radio,title:'订阅关键账号',text:'后台订阅值得长期关注的 X 账号，定时抓取新帖，自动翻译整理。'},
 {icon:Target,title:'定向分析',text:'写下团队的关注方向，每条资讯给出针对性的要点和 0–100 相关度。'},
 {icon:Newspaper,title:'AI 每日日报',text:'每天汇总要点、分主题速览、趋势洞察与跟进建议，只引用站内资讯。'},
 {icon:Send,title:'飞书 / 企业微信推送',text:'新资讯与日报推送到群，可按来源和相关度过滤；也能归档到飞书知识库。'},
 {icon:Bot,title:'模型随心切换',text:'DeepSeek、OpenAI、Claude、通义千问、Kimi、智谱、豆包，或任意 OpenAI 兼容接口。'},
 {icon:KeyRound,title:'免密链接与恢复码',text:'成员点开专属链接即可阅读；20 个一次性恢复码和运维命令，忘记密码也不慌。'},
];
function MiniX(){return <div className="mini mini-x">{[0,1,2].map(i=><div key={i} className="mx-post"><i className="mx-av"/><span><b/><em/><em className="short"/>{i===0&&<u/>}</span></div>)}</div>;}
function MiniRed(){return <div className="mini mini-red"><div className="mr-tabs"><b/><i/><i/><i/></div><div className="mr-grid">{['a','b','c','d','e','f'].map(k=><span key={k} className={`mr-card mr-${k}`}><u/><b/><em/></span>)}</div></div>;}
function MiniNews(){return <div className="mini mini-news"><div className="mn-top"><b>资讯</b><i/></div><div className="mn-tabs"><b/><i/><i/><i/></div>{[0,1,2,3].map(i=><div key={i} className={`mn-item ${i===1?'three':''}`}><span><b/><em/>{i===1&&<span className="mn-three"><u/><u/><u/></span>}<small/></span>{i!==1&&<u/>}</div>)}</div>;}
export default function Welcome(){
 return <div className="site">
  <header className="site-nav"><div className="site-wrap"><a href="/welcome" className="site-logo" aria-label="information-hub 首页"><LogoMark size={30}/><Wordmark size={18}/></a><nav aria-label="官网导航"><a href="#why">为什么</a><a href="#features">功能</a><a href="#styles">阅读风格</a><a href="#shortcut">快捷指令</a><a href="#ai">AI 友好</a><a href="#deploy">部署</a></nav><div className="site-actions"><a href={REPO} className="site-ghost" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><GithubIcon size={18}/></a><a href="/login" className="site-btn">登录</a></div></div></header>
  <main>
   <section className="site-hero"><div className="site-wrap hero-grid">
    <div className="hero-copy"><span className="site-eyebrow"><Sparkles size={14}/>团队私有资讯库 · 开源自部署</span><h1>把 X 上的好内容，<br/>变成团队一起读的<span className="nowrap">知识库。</span></h1><p><strong>information-hub</strong> 是一个由人精选、AI 协助整理的团队私有知识库。把你在 X 上发现的好内容分享进来，整理原文、图片和译文，让团队在同一个地方阅读、查找和积累。</p><div className="hero-cta"><a href="/login" className="site-btn big">进入 information-hub<ArrowRight size={18}/></a><a href="#deploy" className="site-btn ghost big">部署你自己的</a></div><ul className="hero-points"><li><Check size={15}/>Cloudflare 一条命令部署</li><li><Check size={15}/>多种大模型可选</li><li><Check size={15}/>MCP 接入 AI 助手</li></ul></div>
    <div className="hero-visual" aria-hidden="true"><div className="browser"><div className="browser-bar"><i/><i/><i/><span>information-hub</span></div><div className="browser-body"><aside><LogoMark size={20}/>{[0,1,2,3,4].map(i=><i key={i}/>)}</aside><div className="browser-feed"><div className="bf-tabs"><b>为你汇集</b><i/><i/><i/></div>{[0,1].map(i=><div key={i} className="bf-post"><span className="bf-av"/><div><b/><em/><em className="short"/>{i===0&&<div className="bf-analysis"><Target size={10}/><span>定向分析 · 相关度 92</span></div>}{i===1&&<u/>}</div></div>)}</div><div className="browser-side"><div className="bs-card"><Newspaper size={12}/><b/><em/><em/></div><div className="bs-card"><b/><em/></div></div></div></div><div className="hero-phone"><Phone><ReadScreen/></Phone></div></div>
   </div></section>
   <section id="why" className="site-section why"><div className="site-wrap why-grid"><div><span className="site-kicker">为什么做这个项目</span><h2>一个人看到了，<br/>不代表整个团队都能读到。</h2></div><div className="why-text"><p>做这个项目，起因是一个观察：在 X 上，能看到不少开发者、研究者和创业者直接交流技术进展、实践经验和自己的判断。有些讨论还没有变成正式文章，却已经值得团队关注。</p><p className="em">但一个人看到了，不代表整个团队都能读到。</p><p>把链接发进群里，伙伴可能打不开，也可能没有时间读完外文。手动复制、翻译、整理图片很费事；经过几轮转述，原作者的表达也容易走样。</p><p>information-hub 想做的，是让“一个人看到”变成“整个团队读到”：在 X 里点一下分享，原文、图片和中文译文被完整保存，按天归档、按主题整理；谁分享的、什么时候分享的，一目了然。</p></div></div></section>
   <section className="site-section flow"><div className="site-wrap"><div className="flow-grid">{[{icon:Share2,title:'分享',text:'iPhone 快捷指令、网页输入框，或通过 MCP 让 AI 助手代为收录。'},{icon:Sparkles,title:'AI 整理',text:'抓取原文与图片，翻译全文、生成摘要和分类，按团队关注方向做定向分析。'},{icon:Users,title:'团队阅读',text:'三种阅读风格、每日日报、群推送和飞书知识库归档，信息在团队里流动起来。'}].map((s,n)=><div key={s.title} className="flow-card"><span className="flow-n">0{n+1}</span><s.icon size={22}/><h3>{s.title}</h3><p>{s.text}</p></div>)}</div></div></section>
   <section id="features" className="site-section"><div className="site-wrap"><div className="section-head"><span className="site-kicker">功能</span><h2>从“看到”到“读懂”，一步到位。</h2></div><div className="feature-grid">{FEATURES.map(f=><div key={f.title} className="feature"><span className="feature-icon"><f.icon size={20}/></span><h3>{f.title}</h3><p>{f.text}</p></div>)}</div></div></section>
   <section id="styles" className="site-section styles"><div className="site-wrap"><div className="section-head"><span className="site-kicker">阅读风格</span><h2>每个人用自己习惯的方式读。</h2><p>X 信息流、小红书瀑布流、今日头条新闻列表，成员自选，手机和电脑一致，跟随系统深色模式。</p></div><div className="style-showcase"><figure><div className="mini-phone"><MiniX/></div><figcaption><b>X 风格</b>信息流 · 简洁克制</figcaption></figure><figure><div className="mini-phone"><MiniRed/></div><figcaption><b>小红书风格</b>瀑布流卡片 · 图片优先</figcaption></figure><figure><div className="mini-phone"><MiniNews/></div><figcaption><b>今日头条风格</b>新闻列表 · 信息密度高</figcaption></figure></div></div></section>
   <section id="shortcut" className="site-section"><div className="site-wrap"><div className="section-head"><span className="site-kicker">iPhone 快捷指令</span><h2>安装一次，以后点一下就收录。</h2><p>粘贴一次个人连接地址，之后在 X 里分享，内容自动整理并记在你的名下。</p></div><ShortcutTutorial compact/><p className="center"><a href="/guide" className="site-link">查看完整图文教程<ArrowRight size={15}/></a></p></div></section>
   <section id="ai" className="site-section ai"><div className="site-wrap"><div className="section-head"><span className="site-kicker">AI 友好</span><h2>交给 AI 部署，也让 AI 来读。</h2></div><div className="ai-grid">
    <div className="ai-card"><span className="feature-icon"><TerminalSquare size={20}/></span><h3>部署友好</h3><p>仓库自带 <code>AGENTS.md</code>、Claude Code 部署 skill 和一条命令的部署脚本。把仓库地址交给 Codex、Claude Code 或 WorkBuddy，它们就能克隆并部署到你的 Cloudflare。</p><pre><code>{`git clone ${REPO}.git
cd information-hub && npm ci
npx wrangler login   # 本人在浏览器授权
npm run deploy`}</code></pre></div>
    <div className="ai-card"><span className="feature-icon"><PlugZap size={20}/></span><h3>MCP 友好</h3><p>每位成员在账号页生成 MCP 令牌，就能在 Claude、Codex、Cursor 等 AI 助手里直接搜索资讯、阅读全文、查看日报、提问，或让 AI 帮你收录链接。</p><pre><code>{`claude mcp add --transport http information-hub \\
  https://你的站点/mcp \\
  --header "Authorization: Bearer ihmcp_…"`}</code></pre><div className="tool-chips">{['search_articles','get_article','get_daily_report','ask','share_link'].map(t=><span key={t}>{t}</span>)}</div></div>
   </div></div></section>
   <section id="deploy" className="site-section deploy"><div className="site-wrap"><div className="section-head"><span className="site-kicker">部署</span><h2>十分钟拥有团队自己的 <span className="nowrap">information-hub</span>。</h2><p>运行在你自己的 Cloudflare 账号里（Workers + D1），数据与密钥都在你手中。</p></div><ol className="deploy-steps"><li><b>一条命令部署</b><p><code>npm run deploy</code> 自动创建数据库、执行迁移、生成加密主密钥并发布。</p></li><li><b>创建超级管理员</b><p>首次打开站点，设置管理员账号和密码，并下载 20 个密码恢复码。</p></li><li><b>在后台填好配置</b><p>选择大模型并填写 Key、选择 X 抓取渠道、按需开启推送与日报，全部在网页里完成。</p></li><li><b>邀请团队</b><p>添加成员或生成免密链接，大家各自安装快捷指令，开始分享。</p></li></ol><div className="hero-cta center"><a href={REPO} className="site-btn big" target="_blank" rel="noopener noreferrer"><GithubIcon size={18}/>在 GitHub 查看</a><a href="/login" className="site-btn ghost big">登录</a></div></div></section>
   <section className="site-section faq"><div className="site-wrap narrow"><div className="section-head"><span className="site-kicker">常见问题</span><h2>你可能想知道</h2></div>
    {[['数据存在哪里？','全部在你自己的 Cloudflare 账号：资讯和账号在 D1 数据库，API Key 用你的主密钥加密保存。'],['需要哪些费用？','Cloudflare 免费额度通常足够团队使用；大模型和 X 数据接口按各服务商的价格计费，后台可设置每日上限。'],['没有 X API 也能用吗？','可以。默认可回退到 X 公开预览读取单条帖子的文字；订阅账号和长文章需要 TwitterAPI.io 或 X 官方 API。'],['成员需要注册吗？','不需要。管理员添加成员，或直接生成免密登录链接发给对方。'],['忘记管理员密码怎么办？','使用创建账号时下载的恢复码重置；恢复码也丢失时，运维可运行 npm run reset-password 生成一次性重置链接。']].map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}
   </div></section>
  </main>
  <footer className="site-footer"><div className="site-wrap"><a href="/welcome" className="site-logo"><LogoMark size={26}/><Wordmark size={16}/></a><span>由人精选、AI 协助整理的团队私有知识库 · 资讯汇集</span><nav><a href="/guide">快捷指令教程</a><a href={REPO} target="_blank" rel="noopener noreferrer">GitHub</a><a href="/llms.txt">llms.txt</a><a href="/login">登录</a></nav></div></footer>
 </div>;
}
