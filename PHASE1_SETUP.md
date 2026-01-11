# Phase 1 Setup Guide

## Prerequisites Installed ✅

- Node.js >= 18.0.0
- pnpm >= 9.0.0

## Installation Steps

### 1. Install Dependencies

From the root directory:

```bash
pnpm install
```

This will install all dependencies across the monorepo using the workspace configuration.

### 2. Build Packages

```bash
pnpm build
```

This builds all shared packages in the correct dependency order.

### 3. Set Up Environment Variables

Create a `.dev.vars` file in the root for local development:

```bash
# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_D1_DATABASE_ID=your-database-id
CLOUDFLARE_API_TOKEN=your-api-token

# Twilio (for agent service)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-phone
```

### 4. Initialize D1 Database

```bash
# Create the D1 database
wrangler d1 create diner-core

# Note the database ID and update wrangler.toml files
```

### 5. Run Database Migrations

```bash
cd packages/db
pnpm db:generate  # Generate migration files
wrangler d1 migrations apply diner-core --local  # Apply locally
```

### 6. Start Development Servers

From the root directory:

```bash
pnpm dev
```

This starts all applications simultaneously:
- **Public Site:** http://localhost:8788
- **Store Dashboard:** http://localhost:8789
- **Admin Dashboard:** http://localhost:8790
- **Agent Worker:** http://localhost:8791

## Verification Checklist

- [ ] All dependencies installed without errors
- [ ] TypeScript compilation successful
- [ ] All four services running on different ports
- [ ] Can access each service in browser

## Phase 1 Complete! 🎉

### What We Built

✅ **Monorepo Structure**
- Turborepo with pnpm workspaces
- Shared TypeScript configurations
- ESLint & Prettier setup

✅ **Shared Packages**
- `@diner/ts-config` - TypeScript configs
- `@diner/ui` - Shadcn/UI components with Tailwind
- `@diner/config` - Shared constants and types
- `@diner/db` - Drizzle ORM schema

✅ **Applications**
- `@diner/public` - Visitor PWA (Remix + Cloudflare Pages)
- `@diner/store` - Tenant Dashboard (Remix + Cloudflare Pages)
- `@diner/admin` - Super Admin (Remix + Cloudflare Pages)

✅ **Services**
- `@diner/agent` - Durable Objects Worker for AI chat

### Next Steps (Phase 2)

1. Implement complete database schema with soft deletes
2. Create tenant isolation middleware
3. Build seed scripts for test data
4. Set up Drizzle Studio for database management

## Troubleshooting

### pnpm install fails
- Ensure pnpm version >= 9.0.0: `pnpm --version`
- Clear cache: `pnpm store prune`

### TypeScript errors
- These are expected until dependencies are installed
- Run `pnpm install` to resolve

### Port conflicts
- Check if ports 8788-8791 are available
- Kill existing processes: `lsof -ti:8788 | xargs kill`

### Wrangler authentication
- Login: `wrangler login`
- Verify: `wrangler whoami`
