# 曾总分享

按北京时间归档的团队分享阅读库，运行于 Cloudflare Workers + D1，由 Sites 托管。

## 已实现
- 新增链接、原文、分享人、日期与分享理由；重复来源去重。
- DeepSeek 服务端中文标题、摘要、全文翻译、主题标签。
- 按日期筛选、近七天视图、全文搜索、云端收藏、中文与原文切换。
- 链接缺少正文时保存为待补充；翻译失败保留原文，支持重试。
- 当前为 owner-private 站点，由 Sites 的登录与访问控制保护。服务调用使用平台提供的服务凭证；浏览器不持有密钥。

## 尚未接入
- iPhone 快捷指令与企业微信群推送。
- X 正文自动获取需要服务端 X_BEARER_TOKEN，并且要用真实链接验证内容完整性。当前默认保存链接，补充正文后翻译。
- 尚无后台持久任务队列。网页保存后发起翻译请求，失败可重试；后续接入快捷指令时需部署持久队列。

## 环境变量
- DEEPSEEK_API_KEY：通过 Sites 的运行时 secret 配置。
- DEEPSEEK_MODEL：默认 deepseek-flash。
- X_BEARER_TOKEN：可选，X 官方 API。

不要把密钥放入源码、浏览器或 hosting.json。

## 本地开发
npm run dev

## 校验
npx tsc --noEmit
npm run build

D1 结构由 db/schema.ts 定义，drizzle/ 保存迁移；部署平台在上线时自动应用。
