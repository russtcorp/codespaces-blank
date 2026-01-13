## Purpose
- Quickstart brief for AI assistants working on the Diner SaaS (Cloudflare-native multi-tenant diner platform). There is **no code yet**—this repo currently holds the blueprint (`Diner-Saas Master Plan.md`). Follow these notes to bootstrap the future monorepo and keep decisions aligned.

## Architecture snapshot
- Target stack: **Cloudflare Workers + Durable Objects + Workflows**, Remix apps on **Cloudflare Pages**, data in **D1**, assets/logs in **R2**, embeddings in **Vectorize**, images via **Cloudflare Images**, queues via **Cloudflare Queues**; SaaS SSL via **Cloudflare for SaaS**.
- Apps (planned): `apps/public` (visitor PWA), `apps/store` (tenant dashboard), `apps/admin` (super admin), `apps/agent` (Durable Object brain), `services/jobs` (cron/queues). Shared packages: `packages/db`, `packages/ui`, `packages/ai`, `packages/scraper`, `packages/email`.
- Host-based tenancy: resolve `tenant_id` from Host header; cache mapping in KV; fall back to D1 and refresh KV when missing.

## Must-have bindings (wrangler.toml)
- D1: binding `DB` -> `diner-core` (all apps).
- R2: binding `ASSETS` -> `diner-assets` (images, logs, doomsday snapshots).
- KV: binding `KV` -> `diner-cache` (host->tenant, sessions, theme cache).
- Durable Object: `DinerAgent` bound to agent worker; store/admin/public bind to it via `services`/`durable_objects` blocks.
- Queues: `sms-inbound`, `sms-outbound`, `social-media-sync`, `roi-reports` (consumers/producers set per worker).
- Workers AI binding `AI` for agent/store; Vectorize index `diner-menu-index` (768-dim cosine for `bge-base-en-v1.5`).

## Environment & secrets (local `.dev.vars`, prod via `wrangler secret`)
- Cloudflare: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`.
- Auth: `SESSION_SECRET`, `MAGIC_LINK_SECRET` (passwordless login, Turnstile on forms).
- Payments: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (billing / Connect).
- Comms: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (SMS/voice webhooks with `X-Twilio-Signature` verify).
- Marketing: `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`, Zaraz pixel IDs stored in `business_settings`.
- AI fallback: `OPENAI_API_KEY` (optional if Workers AI quota exceeded).

## Developer workflow (expected)
- Package manager: **pnpm**; build orchestrator: **TurboRepo**.
- Common scripts: `pnpm dev` (parallel apps), `pnpm db:local` (apply schema to local D1), `pnpm db:studio` (drizzle-kit studio), `pnpm build:snapshot` (generate R2 doomsday HTML after deploy).
- Local ports: public 3000, store 3001, admin 3002, agent 8787, jobs 8788. For multi-tenant testing locally, map `*.localhost` hosts to 127.0.0.1.

## Key implementation cues
- **Tenant isolation:** every query in `packages/db` must require `tenant_id`; admin bypass only via explicit super-admin flag.
- **Hours logic hierarchy:** emergency close reason > special dates > split-shift operating hours; used by public site and agent.
- **Menu rendering:** hide empty categories; closed-call intercept modal when status is closed; `@media print` stylesheet for printable menu.
- **Doomsday fallback:** on worker error serve static snapshot from R2; keep snapshot fresh post-deploy (GitHub Action or hook).
- **Images/uploads:** Direct Creator Uploads via Cloudflare Images; signed upload URLs should allow ~30m expiry for rural connections.
- **AI agent constraints:** system prompt forbids order-taking; fuzzy “86 item” toggles availability; check deterministic hours before vector search for “are you open” queries.
- **Durable Object migrations:** when state shape changes, include upgrade path via `blockConcurrencyWhile`.

## Testing & perf
- Prefer **k6 with Cloudflare Worker extension** for load tests (esp. Durable Objects/WebSockets). Standard unit tests via **vitest**; lint with **eslint**.

## Deployment order (avoid broken bindings)
1) D1 schema/migrations, 2) create queues, 3) deploy agent worker (DO), 4) dashboards (store/admin), 5) public site, 6) run snapshot upload.

## References
- Primary spec: `Diner-Saas Master Plan.md` (this repo). Use it to rebuild folder structure and scripts when implementing.