# Diner Website as a Service - Monorepo

A Multi-Tenant SaaS platform hosting hundreds of rural diner websites from a single codebase.

## Architecture

- **Infrastructure:** Cloudflare-Exclusive (Pages, Workers, D1, R2, Durable Objects)
- **Intelligence:** Workers AI (Llama 3, Vision, Whisper, Translation)
- **State:** Durable Objects (The "Brain" for every diner)
- **Frontend:** Remix (SSR + Edge Caching)

## Project Structure

```
/monorepo
├── apps/
│   ├── admin/           # Super Admin Dashboard (Remix + Pages)
│   ├── store/           # Tenant Dashboard (Remix + Pages)
│   ├── public/          # Visitor PWA Sites (Remix + Pages)
│   └── services/
│       └── agent/       # Durable Objects + Twilio Worker (Cloudflare Workers)
│
├── packages/
│   ├── db/              # Drizzle ORM Schema & Client
│   ├── ui/              # Shared Shadcn/UI Components & Tailwind Config
│   ├── config/          # Shared Constants & Configuration
│   └── ts-config/       # Shared TypeScript Configurations
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.0.0
- Cloudflare account with Workers/Pages access

### Installation

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Build all packages
pnpm build

# Deploy to Cloudflare
pnpm deploy
```

## Development

Each app runs on a different port during development:
- **Public Site:** http://localhost:8788
- **Store Dashboard:** http://localhost:8789
- **Admin Dashboard:** http://localhost:8790
- **Agent Worker:** http://localhost:8791

## Phase 1: Foundation (Current)

✅ Monorepo structure initialized
✅ TypeScript configured with strict mode
✅ ESLint and Prettier setup
✅ Turborepo pipeline configured
✅ Package structure created

## License

Proprietary - All Rights Reserved
