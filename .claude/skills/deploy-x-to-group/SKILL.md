---
name: deploy-x-to-group
description: Deploy or update X to Group on Cloudflare Workers + D1 with one command, then hand the owner the first-admin setup link. Use when asked to deploy, publish, redeploy, upgrade or set up this project on Cloudflare, or to reset a forgotten admin password.
---

# Deploy X to Group to Cloudflare

1. **Prerequisites.** Check `node -v` is ≥ 22.15. Run `npm ci` if `node_modules` is missing.
2. **Cloudflare access.** Run `npx wrangler whoami`.
   - If it says "not authenticated", ask the human to run `npx wrangler login` and approve it in their browser (an OAuth consent only they can give). Wait for them to confirm, then re-check.
   - CI / headless: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` environment variables work instead.
   - Several accounts listed → ask which one and pass `CLOUDFLARE_ACCOUNT_ID`.
3. **Deploy.** `npm run deploy` (first time optionally `npm run deploy -- --name=<worker-name>`).
   The script reuses or creates the D1 database, builds, applies migrations, deploys, creates `DATA_ENCRYPTION_KEY` once and backs it up under `work/production-security/`.
4. **Hand-off to the owner.** Report the site URL. If the script printed a setup file (`work/bootstrap/管理员初始化.md`), tell the owner to open the link in it themselves to create the super administrator and to download the 20 recovery codes shown afterwards. Do not post the link in shared chats. Remind them to back up the encryption key file.
5. **Verify.** The deploy script checks `/welcome` and `/setup` return 200 and anonymous `/api/shares` returns 401. Additionally, `<url>/login` redirects to `/setup` until the admin exists.
6. **Configure (owner, in the browser).** `/admin → 抓取与模型` (LLM provider + key, X channel), `推送` (Feishu / WeCom bots), `日报与分析`. Nothing else needs secrets.

## Updating an existing deployment

`git pull && npm ci && npm run deploy`. Preserve (or restore from the original checkout) the ignored `cloudflare/resources.json`. Migrations are additive; the key and data are kept. Resource/secret lookup failures stop deployment rather than creating replacements. First-admin creation always requires the private setup link.

## Password recovery

- Owner lost the password and the recovery codes: `npm run reset-password -- <username>` → one-hour link saved in `work/reset/<username>.md` for the owner.
- No admin created yet and the link expired: `npm run setup-link`.

## Troubleshooting

- `Authentication error` / `10000`: the login expired → step 2.
- Migration asks for confirmation in a TTY: answer yes (the script sets `CI=true` to skip it).
- Missing `DATA_ENCRYPTION_KEY`: a brand-new database gets a key backed up before upload. If accounts, encrypted configuration or a local backup already exist, the script stops: restore the original key from the owner’s backup, never generate a replacement.
- Secret-list permission/network errors: fix access and re-run; do not infer that a key is absent.
- First deployment interrupted before issuing a setup link: finish deployment, then use `npm run setup-link`; an anonymous visitor cannot claim the instance.

## Local and private-server targets

For a request that is not specifically Cloudflare, read `public/agent-install.md` and confirm the intended target from the conversation. `npm run install:hub -- --target=local` runs the standalone Node + SQLite service; `--target=server` requires `HUB_DOMAIN`, Docker Compose, DNS and ports 80/443. Preserve existing data directories and master keys. The Node database is separate from Wrangler development data; never silently swap them. Each member obtains their own shortcut at `/shortcut`. The human docs are `/docs/zh/start` and `/docs/en/start`.
