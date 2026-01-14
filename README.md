# Diner SaaS Monorepo (Production-Ready Phase 1)

This repository is configured for production deployment on Cloudflare (Workers + Pages). Local-only development artifacts have been disabled or removed per requirements.

## What’s included

- Monorepo with TurboRepo and `pnpm`
- Apps:
  - `apps/public` (Remix on Cloudflare Pages)
  - `apps/store` (Remix on Cloudflare Pages)
  - `apps/admin` (Remix on Cloudflare Pages)
  - `apps/agent` (Cloudflare Worker + Durable Object)
- Services:
  - `services/jobs` (Cloudflare Worker for queues/cron)
- Packages:
  - `packages/db`, `packages/ui`, `packages/ai`, `packages/config`
- Production-oriented Wrangler configs with required bindings (D1, KV, R2, Durable Objects, Queues)

## Prerequisites

- Cloudflare account with Workers Paid plan
- Created resources:
  - D1 database: `diner-core`
  - KV namespace: `diner-cache`
  - R2 bucket: `diner-assets`
  - Vectorize index: `diner-menu-index` (768-dim cosine)
  - Queues: `sms-inbound`, `sms-outbound`, `social-media-sync`, `roi-reports`
- Set the following IDs in each app’s `wrangler.toml`:
  - `database_id = "REPLACE_WITH_PROD_DB_ID"`
  - `[[kv_namespaces]].id = "REPLACE_WITH_PROD_KV_ID"`

## Secrets

Use the GitHub Actions workflow “Sync Cloudflare Secrets” to push repository secrets to Cloudflare Workers and Pages. Define these in your GitHub repo Settings → Secrets and variables → Actions.

Required/Recommended secrets (also see `packages/config/.env.example`):

- SESSION_SECRET
- MAGIC_LINK_SECRET
- TURNSTILE_SITE_KEY (Store)
- TURNSTILE_SECRET_KEY (Store)
- SITE_URL (Store; required, e.g., https://store.example.com)
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER
- INSTAGRAM_CLIENT_ID
- INSTAGRAM_CLIENT_SECRET
- OPENAI_API_KEY (optional fallback)
- MAILCHANNELS_API_TOKEN or RESEND_API_KEY (if email sending is enabled)
- EMAIL_FROM_DOMAIN, EMAIL_FROM_NAME, SUPPORT_EMAIL

The workflow syncs these to:
- Workers (apps/agent, services/jobs, services/workflows) via `wrangler secret put`
- Pages projects (diner-store, diner-admin, diner-public) via `wrangler pages secret put`

Run it from GitHub → Actions → “Sync Cloudflare Secrets” → Run workflow.

## Database

Apply schema to production D1:

```bash
wrangler d1 execute diner-core --file=./packages/db/migrations/0001_init_schema.sql
```

Note: The dev seed artifacts were disabled and are not used in production.

## Deploy

Order is important to satisfy bindings. You can either use the provided GitHub Actions workflow or deploy manually.

### Option A: GitHub Actions (recommended)
Push to `main` or trigger the “Deploy to Cloudflare” workflow in Actions. It performs:
1) D1 schema migration
2) Agent Worker (Durable Object)
3) Store/Admin/Public (Cloudflare Pages)
4) Jobs Worker
5) Workflows Worker

Make sure your `wrangler.toml` placeholders are set to real IDs before the first run.

### Option B: Manual
1) Agent Worker (Durable Object)

```bash
cd apps/agent
pnpm deploy
```

2) Store/Admin/Public (Cloudflare Pages)

```bash
cd apps/store && pnpm build && pnpm deploy
cd ../admin && pnpm build && pnpm deploy
cd ../public && pnpm build && pnpm deploy
```

3) Jobs Worker

```bash
cd services/jobs
pnpm deploy
```

## Notes

- The Store app binds to the Durable Object class `DinerAgent` using the worker script name `agent-worker` per spec.
- All R2 bindings use the name `ASSETS` across apps for consistency.
- Observability can remain enabled in production.

## Support

If you need local development later, see the disabled files:
- `wrangler.localdev.toml.disabled`
- `.dev.vars.example.disabled`
- `packages/db/scripts/seed.js.disabled`
- `packages/db/migrations/0002_seed_dev_data.sql.disabled`
