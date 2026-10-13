# AGENTS.md — information-hub

Guidance for AI coding agents (Codex, Claude Code, WorkBuddy, Cursor, …) working in this repository.
The product UI and docs are Simplified Chinese; keep user-facing text in Chinese.

## What this is

information-hub（资讯汇集）is a private team reading library on **Cloudflare Workers + D1**:
members share X posts (iPhone shortcut, web composer, or MCP), an LLM translates and summarizes them,
admins subscribe to X accounts, and the system writes an AI daily report and can push to Feishu / WeCom.
Framework: vinext (Next.js App Router on Vite) + React 19, Drizzle schema, plain CSS (`app/globals.css`, `app/platform.css`).

## Deploy (the common request)

Requirements: Node.js ≥ 22.13, a Cloudflare account.

```sh
npm ci
npx wrangler login          # a human must approve this in the browser — ask them; never automate it
npm run deploy              # creates/reuses D1, migrates, deploys, generates DATA_ENCRYPTION_KEY once
```

- Non-interactive alternative to login: `CLOUDFLARE_API_TOKEN` (Workers Scripts + D1 edit) and `CLOUDFLARE_ACCOUNT_ID` env vars.
- `npm run deploy -- --name=my-hub` picks the Worker name on a first deploy (default `information-hub`, database `<name>-db`). Names and ids are saved in `cloudflare/resources.json` (git-ignored); later runs reuse them.
- First deploy prints the path of a private file (`work/bootstrap/管理员初始化.md`) holding a one-time setup link. **Give that file/link only to the site owner**; do not paste it into public channels. Expired: `npm run setup-link`.
- A generated encryption key is backed up to `work/production-security/DATA_ENCRYPTION_KEY`. Tell the owner to store it safely; never commit it, never rotate it casually (passwords and stored API keys depend on it).
- Setup always requires the owner-only link, even after an interrupted deployment; never remove that check. Secret-list errors must stop deployment, never trigger a new key.
- Keep the ignored `cloudflare/resources.json` when updating an existing instance; restore it in a new checkout. Do not change an existing instance with `--name` or `--db`. The deploy script stores the site origin and verifies public/private routes.
- After deploy, everything else (LLM provider and key, X data channel, Feishu/WeCom bots, daily report, analysis focus) is configured in the web admin at `/admin`. No other secrets are required.

Re-deploying an existing site is the same `npm run deploy`; migrations are additive.

## Local development

```sh
npm ci
npm run dev:local           # build, local D1 + migrations, local-only key, prints a setup link, serves :8787
```

Code changes need `npm run build` (or re-run `npm run dev:local`) because `npm start` serves the built worker.

## Verify before finishing

```sh
npx tsc --noEmit
npm test                    # node:test with real SQLite + Web Crypto; no network
npm run build
```

Tests transpile sources listed at the top of `tests/security.test.mjs` and `tests/platform.test.mjs`; when you add a module imported by `cloudflare/worker.ts` or `lib/*`, add it to both lists.

## Operations

- Forgotten password: the member uses one of the 20 recovery codes on the login page, or an admin creates a reset link in `/admin → 成员`. For any account (including the super administrator): `npm run reset-password -- <username>` (writes a one-hour link to `work/reset/`).
- MCP: members create a token in “我的账号 → AI 接入”; the endpoint is `POST /mcp` (Streamable HTTP, bearer auth). Tools live in `lib/mcp.ts`.

## Map

| Path | Purpose |
|---|---|
| `cloudflare/worker.ts` | Gateway: auth, routing, security headers, cron (`scheduled`) |
| `lib/auth.ts` | Sessions, passwords, setup, recovery codes, magic/reset/share/MCP tokens, admin users |
| `lib/config.ts` | Admin-editable config + sealed secrets, provider presets, quotas |
| `lib/ai.ts` | LLM calls: OpenAI-compatible providers and Claude (Anthropic SDK) |
| `lib/shares.ts` | Create share, process (fetch → translate → analyze) |
| `lib/x-source.ts`, `lib/x-content.ts` | TwitterAPI.io / X API v2 / oEmbed preview |
| `lib/subscriptions.ts`, `lib/reports.ts`, `lib/push.ts`, `lib/feishu.ts` | Subscriptions, daily report, bot push, Feishu wiki archive |
| `lib/mcp.ts` | Remote MCP server |
| `app/` | Pages: `welcome` (landing), `login`, `setup`, `reset`, dashboard (`page.tsx`), `read/[id]`, `reports`, `shortcut`, `account`, `admin` |
| `drizzle/` | SQL migrations (generate with `npx drizzle-kit generate` after editing `db/schema.ts`) |
| `scripts/` | `deploy.mjs`, `local-dev.mjs`, `setup-link.mjs`, `reset-password.mjs`, `build-shortcut.py` |

## Rules

- Never commit `cloudflare/resources.json`, `.dev.vars`, `work/`, `outputs/` or any key; they are git-ignored.
- Secrets entered in the admin are sealed with `DATA_ENCRYPTION_KEY`; APIs must never return them.
- Keep the existing code style (compact TypeScript, Chinese UI copy) and add tests for behaviour changes.
- The iPhone shortcut must be signed on a Mac (`shortcuts sign`); the signed file in `public/shortcuts/` works for every deployment because users paste their own connection URL.
