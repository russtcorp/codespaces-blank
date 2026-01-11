# Node.js Installation Required

This workspace is running Alpine Linux v3.22. Node.js and pnpm need to be installed before proceeding.

## Installation Steps

### 1. Install Node.js

```bash
# Using Alpine's package manager
apk add --update nodejs npm

# Verify installation
node --version
npm --version
```

### 2. Install pnpm

```bash
npm install -g pnpm@9.15.0

# Verify installation
pnpm --version
```

### 3. Continue with Phase 1 Setup

Once Node.js and pnpm are installed, follow the instructions in `PHASE1_SETUP.md`:

```bash
pnpm install
```

## Alternative: Use a Dev Container

For a pre-configured environment, consider adding a `.devcontainer/devcontainer.json`:

```json
{
  "name": "Diner SaaS Development",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:20",
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "20"
    }
  },
  "postCreateCommand": "npm install -g pnpm@9.15.0 && pnpm install"
}
```
