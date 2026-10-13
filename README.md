# 资讯汇集

Cloudflare Workers + D1（SQLite）的团队资讯阅读库。公开收录、登录阅读，白色紧凑图文界面适配桌面和手机。

正式地址：[资讯汇集](https://zeng-daily-shares.tangcheng475899188.workers.dev)

## 功能

- iPhone 快捷指令和 `/collect` 无需登录即可提交链接或文字。匿名响应只确认收到，不返回已有文章或私有阅读链接。
- X 帖子、长文章和图片通过 TwitterAPI.io 获取；失败时回退公开预览并明确标注。DeepSeek 生成中文摘要、全文译文和主题分类，原文独立保留。
- 原文、中文、双语对照、Markdown 图文阅读和下载；按日期/主题/关键词筛选。收藏按用户隔离。
- 用户名与密码登录；后台 `/admin` 创建管理员/阅读成员、设置初始密码、重置密码、停用账号、查看审计。初始密码必须更改；停用或重置立即使旧会话失效。
- `/account` 连接本人飞书账号。后台提供官方 CLI 协议的快速应用创建入口、手动配置入口、权限和发布指引；无需在 Worker 或用户电脑运行 CLI。
- 新建飞书知识库或选择已有知识库；每个账号/知识库按北京时间收录日期创建每日文档，按处理顺序追加带时间标题的资讯，含摘要、原文、译文与配图。正常队列按收录时间处理；后补的旧资讯追加在当天文档末尾。
- 管理员可开启后续新资讯自动归档；文章详情“保存到我的飞书”支持个人手动归档。归档历史和状态显示在网页时间轴，真实飞书文档可直接打开。
- 企业微信自动推送已停用。旧推送时间保留为历史，不追溯发送。

## 飞书初始化

首次管理员登录后，进入「管理后台 → 飞书归档」：

1. 点击“快速创建飞书应用”，打开飞书授权页确认创建。这个入口采用 [飞书官方 CLI](https://github.com/larksuite/cli/blob/main/internal/auth/app_registration.go) 的协议，不跳过用户确认。若组织策略不允许快速创建，可到[开发者后台](https://open.feishu.cn/app)创建企业自建应用并手动填 App ID/Secret。
2. 根据后台指引开通知识库、文档编辑和素材上传权限、发布应用并设置可用成员；在“连接我的飞书”页面完成本人授权。
3. 创建知识库，或选已有且可编辑的知识库。新建知识库默认 `open_sharing=closed`，互联网不可公开访问；飞书成员权限由飞书管理。
4. 管理员开启“新资讯自动归档”。每分钟 Cron 处理待归档队列；开启前已整理的旧资讯请在详情页手动归档。

应用凭证及用户访问令牌在服务端 AES-GCM 加密保存。自动归档使用开启它的管理员本人的授权；其他用户手动归档到各自的知识库。管理员失效、账号解除连接或授权过期时自动归档会停止或报告错误，不会绕过飞书权限。

所需 scope 以后台和 `lib/feishu.ts` 为准。快速创建入口已与飞书真实服务验证能返回确认链接；完整的云文档写入测试使用模拟接口，仍需用户完成真实账号授权后联调。

## 环境与部署

要求 Node.js 22.13+、Cloudflare 账号、Workers/D1 管理权限。不需要独立云服务器。实际可用量以 Cloudflare 和 API 服务商账号配额为准。

```sh
npm ci
npm run build
```

默认构建走带登录网关的 Cloudflare Worker。早期 `.openai/hosting.json` / Sites 文件仅用于保留来源信息；`DEPLOY_TARGET=sites` 会直接拒绝构建，避免绕开权限网关。

1. `npx wrangler login`。
2. 复制 `cloudflare/resources.example.json` 为 `cloudflare/resources.json`，填自己的 account_id / database_id。文件被 Git 忽略。
3. `node scripts/prepare-cloudflare.mjs` 生成 `dist/server/wrangler.cloudflare.json`。
4. 应用数据库迁移：

```sh
npx wrangler d1 migrations apply DB --remote --config dist/server/wrangler.cloudflare.json
```

5. 通过 Wrangler Secret 配置下列服务端密钥，交互或 stdin 输入，禁止提交源码：

| Secret | 用途 |
|---|---|
| `DATA_ENCRYPTION_KEY` | 必需。随机 32 字节的 base64url 编码；密码 pepper 和飞书凭证加密。请妥善备份，不能直接覆盖。 |
| `DEEPSEEK_API_KEY` | 资讯摘要与翻译 |
| `TWITTERAPI_IO_KEY` | X 长文章、正文图片；未配置时使用公开预览 |

`DEEPSEEK_MODEL` 由部署配置设置，默认 deepseek-flash。旧 `WECOM_WEBHOOK_URL` 与 `SITE_ACCESS_KEY` 不再使用。

```sh
npx wrangler secret put DATA_ENCRYPTION_KEY --config dist/server/wrangler.cloudflare.json
npx wrangler deploy --config dist/server/wrangler.cloudflare.json
node scripts/bootstrap-admin.mjs https://YOUR-WORKER.workers.dev
npx wrangler d1 execute DB --remote --file work/bootstrap/setup.sql --config dist/server/wrangler.cloudflare.json
```

本地 `work/bootstrap/管理员初始化.md` 内包含一次性初始化链接，24 小时有效。由网站所有者打开并设置自己的用户名和密码，不提供默认管理员密码。已存在用户时脚本不会覆盖管理员。应用完 SQL 后删除本地一次性凭证文件。

## 本地运行与校验

```sh
npm run build
node scripts/prepare-cloudflare.mjs
npx wrangler d1 migrations apply DB --local --persist-to .wrangler/state --config dist/server/wrangler.cloudflare.json
```

把**独立的本地** `DATA_ENCRYPTION_KEY` 放在 `dist/server/.dev.vars`（被忽略），用同样的 bootstrap SQL 流程初始化本地数据库，然后 `npm start`。本地开发也可 `npm run dev`，其本地 D1 与上述预览存储分离。不要把本地测试账号或密钥同步到生产。

```sh
npx tsc --noEmit
npm test
npm run build
```

测试使用真实 SQLite / Web Crypto，覆盖访问控制、会话撤销、初始化竞争、登录限流、凭证隔离、并发归档、图片上传和结果不确定时不重复追加；另保留原 X 内容转换/历史推送单测。浏览器检查登录、后台与手机布局。详见 [安全模型](SECURITY.md)。

## 处理边界

- 当前是单团队访问控制：启用的阅读成员可读取全部资讯，没有逐篇文章 ACL / 多租户 / MFA。
- 飞书与网站的权限独立。停用网站账号不自动移除飞书知识库成员。
- X 图文获取依赖第三方接口的权限、额度与可用性，不保证私有、删除或付费内容可取；未接入完整线程展开或视频转写。
- 飞书归档保留文本与基础 Markdown 结构；支持 X `pbs.twimg.com` 图片上传内嵌，其他图片或上传失败时保留原图链接；复杂嵌套/表格不保证与网页完全相同。
- 日文档创建或正文追加发生网络中断，标记 `uncertain`，避免不知结果时重复写入。未开始写入的失败任务可在网页重试；不确定结果需核对飞书实际文档后由运维修复。
- 公开收录每 IP 每分钟 30 次，AI 每日最多 100 次，X 图文请求每日最多 300 次。需要时可进一步增加收录验证码、邀请码或人工审核。

## iPhone 快捷指令

打开 `/install.html` 安装签名快捷指令。它向 `/api/collect` 提交 `{"input":"链接或正文"}`，不含任何服务密钥。分享仍可公开提交，查看内容需登录。

重建：`python3 scripts/build-shortcut.py`，再使用 macOS `shortcuts sign --mode anyone --input outputs/zeng-share-unsigned.shortcut --output public/shortcuts/分享到资讯汇集.shortcut`。iPhone 系统分享菜单需要在真机安装后使用。
