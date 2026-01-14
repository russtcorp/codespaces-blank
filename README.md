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

## Phase 1: Architecture & Infrastructure ✅

All Phase 1 requirements from the Master Plan are **PRODUCTION-READY**:

- ✅ **Apps**: public (PWA), store (tenant dashboard), admin (super-admin), agent (Durable Object)
- ✅ **Services**: jobs (cron/queues), workflows (Cloudflare Workflows)
- ✅ **Packages**: db (D1/Drizzle), ui (Tailwind components), ai (prompts), scraper (social media), config (env types)
- ✅ **Bindings**: D1 (`diner-core`), KV (`diner-cache`), R2 (`ASSETS`), Durable Objects (`agent-worker`), Queues (4x), Workers AI, Vectorize
- ✅ **Auth**: Magic links + Turnstile + 2FA OTP
- ✅ **Multi-Tenancy**: Host-based routing with KV cache + D1 fallback
- ✅ **CI/CD**: GitHub Actions (deploy.yml, sync-secrets.yml)

## Phase 2: Database Schema & Tenant Isolation ✅

All Phase 2 requirements from the Master Plan are **PRODUCTION-READY**:

### D1 Schema (`packages/db/migrations/0001_init_schema.sql`)
All tables include `tenant_id` for multi-tenant isolation:

- ✅ **tenants** - Primary registry (custom domains, status, embedding model config)
- ✅ **theme_config** - Branding (colors, logo URLs, CSS overrides)
- ✅ **business_settings** - Contact info, social handles, Zaraz pixels
- ✅ **authorized_users** - Staff logins with magic link tokens
- ✅ **operating_hours** - Split-shift hours (lunch/dinner) with `deleted_at`
- ✅ **special_dates** - Holiday overrides with `deleted_at`
- ✅ **menu_items** - Dishes with `embedding_version`, `deleted_at` (soft delete preserves AI training data)
- ✅ **categories** - Menu sections with display order
- ✅ **sessions** - Magic link sessions (30-day expiry, user agent tracking)
- ✅ **host_mapping** - Hostname → tenant_id cache

### Safe Query Middleware (`packages/db/src/safe-query.ts`)
Enforces tenant isolation at ORM level:

```typescript
// All queries REQUIRE tenantId context
const db = createSafeDb(env.DB, { tenantId: "abc123" });

// Type-safe wrappers with automatic tenant_id filtering
const items = await db.menuItems().findMany();
const hours = await db.operatingHours().findMany();

// Super admin bypass (for impersonation in admin dashboard)
const db = createSafeDb(env.DB, { tenantId: "admin", isSuperAdmin: true });
```

**Key Features:**
- ✅ Mandatory `tenantId` context - prevents cross-tenant data leaks
- ✅ Super admin bypass flag for admin dashboard
- ✅ Type-safe wrappers for all tables
- ✅ Drizzle ORM integration with `.where()` clause injection

### Additional Modules
- ✅ **hostname-cache.ts** - KV-backed tenant resolution with D1 fallback
- ✅ **session-store.ts** - Magic link session CRUD (30-day expiry)
- ✅ **menu-crud.ts** - Menu item soft delete (preserves embeddings)
- ✅ **hours-logic.ts** - Business hours calculation (emergency close > special dates > operating hours)
- ✅ **emergency-button.ts** - Instant close toggle with custom message

**Note:** All seed scripts and test data have been removed for production. Tenant onboarding is handled via [admin.onboarding.tsx](apps/admin/app/routes/admin.onboarding.tsx).

## Phase 3: Public Site (Visitor Experience) ✅

All Phase 3 requirements from the Master Plan are **PRODUCTION-READY**:

### Core Functionality
- ✅ **Hostname-based Tenant Resolution** - KV cache with D1 fallback (60-min TTL)
- ✅ **Menu Display** - MenuSection & MenuItem components with empty category hiding
- ✅ **Hours Display** - HoursDisplay component implementing Truth Hierarchy:
  1. Emergency Close Reason (highest priority)
  2. Special Dates (holidays, events)
  3. Weekly Operating Hours (split-shift support)
- ✅ **Theming Engine** - Server-side CSS variable injection in root.tsx (prevents FOUC)
- ✅ **Service Worker** - Offline capability caching menu.json, CSS, fonts
- ✅ **Doomsday Fallback** - R2 static snapshot served on 500 errors

### User Experience Features
- ✅ **Call Interception Modal** - When closed, shows "We open in X minutes. Call anyway?"
- ✅ **Print Mode CSS** - `@media print` stylesheet (black-and-white, two-column layout)
- ✅ **Hiring Banner** - Conditional sticky banner if `business_settings.is_hiring === true`
- ✅ **Liability Disclaimer** - Footer with AI dietary tag disclaimer
- ✅ **Dynamic SEO** - Satori Open Graph image generation ([api.og.ts](apps/public/app/routes/api.og.ts))
- ✅ **Empty Category Hiding** - Filters out categories with zero available items

### Technical Implementation
- Route: [apps/public/app/routes/_index.tsx](apps/public/app/routes/_index.tsx)
- Components: [MenuSection.tsx](apps/public/app/components/MenuSection.tsx), [HoursDisplay.tsx](apps/public/app/components/HoursDisplay.tsx), [CallInterceptModal.tsx](apps/public/app/components/CallInterceptModal.tsx), [HiringBanner.tsx](apps/public/app/components/HiringBanner.tsx)
- Service Worker: [public/service-worker.js](apps/public/public/service-worker.js)
- Doomsday Handler: [entry.server.tsx](apps/public/app/entry.server.tsx)

### Doomsday Snapshot Generation
After deployment, generate static snapshots for R2 fallback:

```bash
cd apps/public
# Optional tenant slug arg (defaults to "demo"): pass with --
pnpm build:snapshot -- demo
wrangler r2 object put diner-assets/fallback/demo.html --file=./build/doomsday/demo.html
```

---

## Notes

- The Store app binds to the Durable Object class `DinerAgent` using the worker script name `agent-worker` per spec.
- All R2 bindings use the name `ASSETS` across apps for consistency.
- Observability can remain enabled in production.

## Support

If you need local development later, see the disabled files:
- `wrangler.localdev.toml.disabled`
- `.dev.vars.example.disabled`
- `DATABASE_WORKAROUND.md.disabled`
