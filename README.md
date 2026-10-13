# 资讯汇集

按北京时间归档的团队分享阅读库，已直接部署到用户自己的 Cloudflare Workers + D1。

正式地址：https://zeng-daily-shares.tangcheng475899188.workers.dev

后续部署使用下方 Cloudflare 流程；.openai/hosting.json 仅保留早期 Sites 版本的来源信息，不再作为发布目标。

## 已实现
- 新增链接、原文、分享人、日期与分享理由；重复来源去重。
- DeepSeek 服务端中文标题、摘要、全文翻译、主题标签。
- 按日期筛选、近七天视图、全文搜索、云端收藏、中文与原文切换。
- 链接缺少正文时保存为待补充；翻译失败保留原文，支持重试。
- 网站公开，无需登录；DeepSeek 密钥仅在服务端。公开写入每 IP 每分钟 30 次，AI 整理每日最多 100 次，超额时保留原文供次日重试。

- iPhone 签名快捷指令：`/install.html`，POST `/api/collect`，无需密钥。链接或文字立即保存，后台自动整理。
- D1 pending 状态持久保存任务，waitUntil 尝试立即处理；每分钟 Cron 恢复 pending 或超过 120 秒的 processing，失败状态由用户重试。原子抢占防止重复处理，每次 Cron 最多处理 3 条。

- 企业微信群机器人：完成整理后写入 D1 推送状态，Cron 每分钟发送 Markdown 标题、摘要、原文摘录与阅读链接。历史 ready 记录不追溯群发。
- 白色简约资讯站：首页重点资讯、最近更新、按日资讯流，适配手机与桌面。
- 主题分类：新资讯、人工智能、科技数码、商业财经、产品设计、行业观察；自动识别，详情页支持手动调整，手动分类不会被后续 AI 整理覆盖。
- 手机阅读页 `/read/:id`：原文、中文译文、双语对照、字号调整、原始文字查看和 `.md` 导出。
- Markdown 支持标题、列表、引用、表格、代码与 HTTPS 图片，首图可作为封面，也可手动指定；图片加载失败显示替代入口。表格与代码块独立横向滚动。
- 详情时间轴显示收录、中文整理完成、企业微信推送时间。新增记录使用实际阶段时间；历史数据没有翻译完成时间时明确标注，不使用最后修改时间代替。
- 收录弹窗支持 Markdown 编辑/预览、插入图片地址；详情页可补充原文与图片，保存后重新整理译文。

## 尚未接入

- 完整线程自动展开与视频转写尚未接入；视频仅展示封面。X 图文接口失败时退回公开预览，并明确标注。


## 环境变量
- DEEPSEEK_API_KEY：通过 Cloudflare Worker Secrets 配置。
- DEEPSEEK_MODEL：默认 deepseek-flash。
- WECOM_WEBHOOK_URL：企业微信消息推送地址，通过 Worker Secrets 配置，禁止写入源码或前端。
- X 公开预览不需要 API Key，访问 publish.x.com/oembed，结果仅作为摘录。

不要把密钥放入源码、浏览器或 hosting.json。

## 本地开发

```sh
npm ci
npm run dev
```

## 校验
npx tsc --noEmit
npm run build

D1 结构由 db/schema.ts 定义，drizzle/ 保存迁移；直接部署前需要使用 Wrangler 应用远程迁移。

## 直接部署到自己的 Cloudflare 账号

1. 使用 Wrangler 登录，并授予 Workers 与 D1 权限。
2. 将 `cloudflare/resources.example.json` 复制为 `cloudflare/resources.json`，填入自己的 account_id 与 database_id。本地配置已被 Git 忽略。
3. 运行 DEPLOY_TARGET=cloudflare npm run build，再运行 node scripts/prepare-cloudflare.mjs。
4. 使用 dist/server/wrangler.cloudflare.json 配置应用远程 D1 迁移、部署 Worker。
5. 使用 wrangler secret 配置 DEEPSEEK_API_KEY，密钥从 stdin 输入。

Cloudflare 版本按用户要求公开访问，Secrets 不写入源码。X 预览只提取纯文字，保留原作者，不在页面执行外部嵌入 HTML。

## 重建快捷指令

运行 `python3 scripts/build-shortcut.py`，再用苹果 `shortcuts sign --mode anyone --input outputs/zeng-share-unsigned.shortcut --output public/shortcuts/分享到资讯汇集.shortcut` 签名。文件不含密钥。已在 macOS 快捷指令中使用真实 X 链接完成端到端验证；iPhone 分享菜单需在真机安装后使用。

## 群消息可靠性与验证

`notify_status` 随内容的 ready 更新同时落库。Cron 使用条件 UPDATE 原子认领，每轮最多 3 条；成功后记录 notified_at，不重复发送。企业微信明确返回临时错误（-1 / 45009）时最多尝试 3 次。网络超时、不可解析的响应、发送中断会记为 uncertain，避免在不知道是否已经送达时重复群发；详情页展示状态。修改已推送文章不再次群发。原文独立保存，AI 只生成摘要、译文和标题，不覆盖原文。

验证：`node --test tests/*.test.mjs` 覆盖并发认领、成功不重发、历史记录不追溯、重试上限、网络结果不确定，以及消息 UTF-8 长度和 @ 提及隔离。真实联调示例：`/read/1b4db758-fd90-4f99-8f26-6b490168de68`，分享人为系统联调，保留供已发送测试消息打开阅读。服务端收到 errcode=0，一次发送，Markdown 导出原文逐字一致。手机 390px 宽度已检查无横向溢出。

## 紧凑图文资讯流

首页使用紧凑图文列表，减少标语与重复推荐区。X 配图、封面、引用长文章通过 TwitterAPI.io 获取，原始内容块转换成 Markdown，正文图片保留位置；已有分享链接不变。

`TWITTERAPI_IO_KEY` 存在 Cloudflare Worker Secret，未充值或订阅，使用账号试用额度。每天最多 300 次图文接口请求，按免费账号的请求间隔排队。图片只转发 `pbs.twimg.com` 指定图片路径，拒绝跳转、非图片与超过 10MB 的响应；浏览器通过同站地址加载，原始图片 URL 仍保留在 Markdown 中。

历史 X 预览补全基于已验证的响应，重新生成译文。已推送条目保持 sent；此前未推送的历史条目标记 skipped，不追溯群发。变更前快照保存在本地 outputs/twitterapi-trial/before-enrichment.json。

### X 风格阅读界面

首页采用固定左侧导航、600px 信息流和右侧主题栏；平板收起文字导航，手机显示底部导航和悬浮收录按钮。原文预览可展开，普通帖子的图片采用网格展示并支持全屏查看、翻页和键盘操作。长文章进入详情后支持 Markdown 图文、原文/译文/双语阅读、字号切换与真实处理时间轴。

`source_meta`（迁移 0004）只保存公开的分享帖作者、账号、头像、发布时间和分享帖文字，独立于引用文章的作者信息。历史数据缺少这些信息时使用已有作者与来源账号，不编造发布时间。X 头像与正文配图均通过受限图片代理加载。桌面导航中的探索、收藏、主题和时间轴均使用实际资讯数据。
