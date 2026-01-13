# CI/CD and Deployment Setup

## GitHub Actions Workflows

Two workflows have been configured:

### 1. CI Workflow (`.github/workflows/ci.yml`)
Runs on every push and pull request to main:
- Lints all code
- Type-checks TypeScript
- Builds all apps
- Runs tests

### 2. Deploy Workflow (`.github/workflows/deploy.yml`)
Runs on push to main or manual trigger:
- Builds and deploys public app to Cloudflare Pages
- Runs D1 database migrations automatically
- Deploys store dashboard
- Deploys admin dashboard
- Deploys agent worker

## Required GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Pages, Workers, and D1 permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

## Database Migrations

Migrations run automatically during the deploy process:
```bash
cd packages/db
pnpm wrangler d1 migrations apply diner-core --remote
```

This ensures the database schema is always up-to-date before deploying new code.

## Local Development

Run the full stack locally:
```bash
pnpm dev
```

Run migrations locally:
```bash
cd packages/db
pnpm migrate:local
```

## Manual Deployment

To deploy manually from your local machine:

```bash
# Deploy all apps
pnpm deploy

# Deploy specific app
pnpm --filter @diner/public deploy
pnpm --filter @diner/store deploy
pnpm --filter @diner/admin deploy

# Deploy agent worker
cd services/agent
pnpm wrangler deploy
```

## Cloudflare Pages Configuration

Each app needs a Cloudflare Pages project:
- `diner-public` - Public visitor sites
- `diner-store` - Tenant dashboard
- `diner-admin` - Super admin dashboard

Configure these in the Cloudflare dashboard or via Wrangler.
