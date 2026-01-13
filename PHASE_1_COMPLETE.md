# Diner SaaS Monorepo - Phase 1 Complete ✅

## Overview

This is the foundation of the Diner SaaS platform—a Cloudflare-native, multi-tenant SaaS operating system for small diners.

## Phase 1: Foundation & Monorepo Configuration

### ✅ Completed Tasks

#### 1. **Monorepo Setup**
- [x] TurboRepo pipeline configured (`turbo.json`)
- [x] pnpm workspace structure (`pnpm-workspace.yaml`)
- [x] Base TypeScript configuration with Strict Mode enabled
- [x] ESLint and Prettier configured globally

#### 2. **Shared Packages**

**`@diner-saas/config`** - Centralized constants
- Supported timezones (14 US + International)
- Subscription plans (Free, Starter, Pro, Enterprise)
- User roles & permissions matrix
- Operating hours defaults
- Dietary tags (GF, V, VG, N, D, E, S, H, K, SO)
- Error messages dictionary
- Federal holidays list
- API limits & timeouts
- Cloudflare-specific configurations
- Feature flags

**`@diner-saas/db`** - Database layer with Drizzle ORM
- Complete D1 schema with 11 tables:
  - `tenants` - Tenant identity & subscription management
  - `themeConfig` - Visual branding per tenant
  - `businessSettings` - Address, phone, timezone, emergency controls
  - `authorizedUsers` - Role-based user management (owner/manager/viewer)
  - `operatingHours` - Split-shift support (multiple blocks per day)
  - `specialDates` - Holiday/closure overrides
  - `categories` - Menu organization
  - `menuItems` - Product catalog with dietary tags & embeddings
  - `sessions` - Session management
  - `hostMapping` - Subdomain/custom domain routing
- Tenant isolation middleware (Phase 2)
- Soft deletes for compliance

**`@diner-saas/ui`** - Shared design system
- Tailwind CSS configuration
- Radix UI primitive components (Button, Input, Card, Dialog, Toast)
- `cn()` utility for class merging
- Consistent visual design across all apps

**`@diner-saas/ai`** - AI wrapper & system prompts
- Diner Agent system prompt (website manager persona, NOT order-taking)
- Menu description generator prompt
- Allergen detector prompt
- Workers AI client setup (Phase 2+)

#### 3. **Applications**

**`apps/public`** (Visitor PWA)
- Remix + Cloudflare Pages
- Running on port 3000
- D1, R2, KV bindings configured
- Hello World index route
- Entry points (server/client) configured
- Stylesheet template ready

**`apps/store`** (Tenant Dashboard)
- Remix + Cloudflare Pages
- Running on port 3001
- All bindings configured
- Hello World index route
- Entry points configured
- Styled components template

**`apps/admin`** (Super Admin Dashboard)
- Remix + Cloudflare Pages
- Running on port 3002
- Bindings configured with Cloudflare Access protection
- Hello World index route
- Entry points configured
- Styled components template

**`services/jobs`** (Background Worker)
- Cloudflare Workers runtime
- Running on port 8788
- Queue producers configured (SMS, Social Sync, ROI Reports)
- Cron trigger template
- D1, R2, KV bindings

#### 4. **Environment Variables**
- [x] `.dev.vars.example` with comprehensive documentation
- [x] All required secrets documented:
  - Cloudflare infrastructure tokens
  - Authentication (Session, Magic Link)
  - Stripe (Payments, Webhooks, Connect)
  - Twilio (SMS, Voice)
  - Instagram (Marketing Sync)
  - Email (MailChannels/Resend)
  - OpenAI (AI Fallback)
  - Google Services (Maps, My Business)

#### 5. **Build Configuration**
- [x] Turbo pipeline with intelligent caching
- [x] All TypeScript configs properly inherited
- [x] Vite configuration for Remix apps
- [x] wrangler.toml bindings for all workers

---

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm 9+

### Setup

```bash
# 1. Clone and navigate
cd /workspaces/codespaces-blank

# 2. Copy environment file
cp .dev.vars.example .dev.vars
# Fill in your Cloudflare credentials and API keys

# 3. Install dependencies
pnpm install

# 4. Initialize local D1 database
pnpm db:local

# 5. Start development environment
pnpm dev
```

### Development Ports
- **Public Site**: http://localhost:3000
- **Store Dashboard**: http://localhost:3001
- **Admin Dashboard**: http://localhost:3002
- **Jobs Worker**: http://localhost:8788

### Available Scripts

```bash
# Development
pnpm dev                    # Run all apps in parallel
pnpm build                  # Build all apps
pnpm lint                   # Lint all packages
pnpm format                 # Format code with Prettier

# Database
pnpm db:local              # Apply schema to local D1
pnpm db:studio             # Launch Drizzle Studio

# Individual apps
pnpm dev -F @diner-saas/public      # Run just the public site
pnpm dev -F @diner-saas/store       # Run just the store dashboard
pnpm dev -F @diner-saas/admin       # Run just the admin dashboard
```

---

## Project Structure

```
.
├── apps/
│   ├── public/                  # Visitor PWA (Remix + Pages)
│   ├── store/                   # Tenant Dashboard (Remix + Pages)
│   ├── admin/                   # Admin Dashboard (Remix + Pages)
│   └── agent/                   # AI Brain (Durable Objects) - Phase 3+
├── packages/
│   ├── config/                  # Shared constants & config
│   ├── db/                      # Database layer (Drizzle ORM)
│   ├── ui/                      # Design system (Shadcn components)
│   ├── ai/                      # AI wrappers & prompts
│   ├── scraper/                 # Browser rendering - Phase 5+
│   └── email/                   # Email templates - Phase 5+
├── services/
│   └── jobs/                    # Background worker (Queues, Crons)
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
├── .dev.vars.example
└── Diner-Saas Master Plan.md
```

---

## Database Schema (D1)

### Core Tables

**tenants**
- `id` (PK) - Unique tenant identifier
- `slug` - Subdomain (e.g., "joes-diner")
- `customDomain` - Custom domain (e.g., "joesdiner.com")
- `businessName` - Display name
- `subscriptionStatus` - active/past_due/trial/cancelled
- `status` - building/active/paused
- Soft delete: `deletedAt`

**menu_items**
- Supports dietary tags (Gluten-Free, Vegan, Nuts, etc.)
- `is_available` - The "86" toggle
- `embeddingVersion` - Triggers Vectorize re-indexing
- `sentimentScore` - From reviews (0-1)
- Soft delete: `deletedAt`

**operatingHours**
- Supports split shifts (multiple rows per day)
- Cascading deletes with tenant

**specialDates**
- Override hours for holidays/special events
- Supports custom times for "limited" status

**authorizedUsers**
- Role-based: owner/manager/viewer
- Permission matrix
- Notification preferences (JSON)
- Security challenge code for 2FA

---

## What's Next? (Phases 2-6)

### Phase 2: Data Architecture & Tenant Isolation
- Implement "Safe Query" middleware for tenant isolation
- D1 migrations setup
- KV namespace for host->tenant mapping
- Session management

### Phase 3: The AI Brain (Durable Objects)
- DinerAgent stateful Durable Object
- Twilio SMS/Voice webhook handlers
- Queue consumer setup
- Chat history management

### Phase 4: Public Site
- Tenant resolution via Host header
- Menu display with empty category hiding
- Hours logic (Emergency Close > Special Date > Weekly)
- Service Worker for offline support
- "Doomsday" R2 fallback

### Phase 5: Store Dashboard Modules
- Magic Link authentication
- Visual Menu Editor (drag-drop)
- Operations Center (Hours Matrix, Holidays)
- AI Manager Chat Interface
- Browser Rendering for "Magic Start" onboarding

### Phase 6: Admin & Polish
- Fleet Management Dashboard
- Cloudflare for SaaS certificate automation
- WAF "Aggregator Shield" configuration
- Audit Logging to R2
- Load testing with k6

---

## Key Architectural Decisions

1. **Cloudflare Native**: No custom servers. Everything runs on Edge.
2. **Multi-Tenancy**: Tenant isolation at the database query level.
3. **Soft Deletes**: Data retention compliance (GDPR-friendly).
4. **Split Shifts**: Operating hours support multiple time blocks per day.
5. **Semantic Search**: Vectorize integration for menu queries.
6. **Durable Objects**: Stateful AI agent per tenant (strong consistency).
7. **Edge Cache**: KV-backed hostname mapping for instant tenant resolution.

---

## Important Notes

### Environment Variables
Copy `.dev.vars.example` to `.dev.vars` and fill in API keys:
- Cloudflare API token & Account ID
- Stripe webhook secret
- Twilio credentials
- Instagram tokens
- Email service credentials

### Local D1 Development
- Run `pnpm db:local` before first `pnpm dev`
- Schema file: `packages/db/schema.sql` (auto-generated by Drizzle)
- Use Drizzle Studio: `pnpm db:studio`

### Monorepo Workspaces
- All apps are isolated and can be deployed independently
- Shared packages use workspace `*` syntax for dependencies
- TurboRepo handles build caching and parallel execution

---

## Deployment

### Cloudflare Pages (Public, Store, Admin)
```bash
# Deploy all apps
pnpm deploy

# Or specific app
cd apps/public && wrangler pages deploy ./build/client
```

### Cloudflare Workers (Background Jobs)
```bash
# Deploy jobs worker
cd services/jobs && wrangler deploy
```

### D1 Database (Production)
```bash
# Apply migrations to production
wrangler d1 execute diner-core --file=./packages/db/schema.sql
```

---

## Testing Strategy

- **Unit Tests**: vitest (Phase 2+)
- **E2E Tests**: Playwright (Phase 4+)
- **Load Tests**: k6 with Cloudflare Worker extension (Phase 6+)

---

## Support & Documentation

- **Master Plan**: See `Diner-Saas Master Plan.md` for comprehensive architecture
- **Cloudflare Docs**: https://developers.cloudflare.com/
- **Remix Docs**: https://remix.run/docs
- **Drizzle Docs**: https://orm.drizzle.team/

---

**Phase 1 Status**: ✅ COMPLETE

Ready to proceed to Phase 2: Data Architecture & Tenant Isolation
