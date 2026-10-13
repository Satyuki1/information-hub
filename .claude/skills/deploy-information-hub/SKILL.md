---
name: deploy-information-hub
description: Deploy or update information-hub (资讯汇集) on Cloudflare Workers + D1 with one command, then hand the owner the first-admin setup link. Use when asked to deploy, publish, redeploy, upgrade or set up this project on Cloudflare, or to reset a forgotten admin password.
---

# Deploy information-hub to Cloudflare

1. **Prerequisites.** Check `node -v` is ≥ 22.13. Run `npm ci` if `node_modules` is missing.
2. **Cloudflare access.** Run `npx wrangler whoami`.
   - If it says "not authenticated", ask the human to run `npx wrangler login` and approve it in their browser (an OAuth consent only they can give). Wait for them to confirm, then re-check.
   - CI / headless: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` environment variables work instead.
   - Several accounts listed → ask which one and pass `CLOUDFLARE_ACCOUNT_ID`.
3. **Deploy.** `npm run deploy` (first time optionally `npm run deploy -- --name=<worker-name>`).
   The script reuses or creates the D1 database, builds, applies migrations, deploys, creates `DATA_ENCRYPTION_KEY` once and backs it up under `work/production-security/`.
4. **Hand-off to the owner.** Report the site URL. If the script printed a setup file (`work/bootstrap/管理员初始化.md`), tell the owner to open the link in it themselves to create the super administrator and to download the 20 recovery codes shown afterwards. Do not post the link in shared chats. Remind them to back up the encryption key file.
5. **Verify.** `curl -sI <url>/welcome` returns 200; `<url>/login` redirects to `/setup` until the admin exists.
6. **Configure (owner, in the browser).** `/admin → 抓取与模型` (LLM provider + key, X channel), `推送` (Feishu / WeCom bots), `日报与分析`. Nothing else needs secrets.

## Updating an existing deployment

`git pull && npm ci && npm run deploy`. Migrations are additive; the key and data are kept.

## Password recovery

- Owner lost the password and the recovery codes: `npm run reset-password -- <username>` → one-hour link saved in `work/reset/<username>.md` for the owner.
- No admin created yet and the link expired: `npm run setup-link`.

## Troubleshooting

- `Authentication error` / `10000`: the login expired → step 2.
- Migration asks for confirmation in a TTY: answer yes (the script sets `CI=true` to skip it).
- `DATA_ENCRYPTION_KEY` missing errors on the site (“安全存储尚未初始化”): re-run `npm run deploy`; it only creates the key when absent.
