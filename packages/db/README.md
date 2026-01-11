# Database Package

This package contains the Drizzle ORM schema, migrations, and tenant-safety helpers for the D1 database.

## Setup

1. Set environment variables:
```bash
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_D1_DATABASE_ID="your-database-id"
export CLOUDFLARE_API_TOKEN="your-api-token"
```

2. Generate migrations (if you change the schema):
```bash
pnpm db:generate
```

3. Apply migrations:
```bash
pnpm migrate:local   # applies to local D1
pnpm migrate:remote  # applies to remote D1
```

4. Seed local data (Joe's Diner example):
```bash
pnpm seed:local
```

5. Open Drizzle Studio:
```bash
pnpm db:studio
```

## Schema Overview

- **tenants**: Core tenant data
- **theme_config**: Visual customization per tenant
- **authorized_users**: User access and roles
- **business_info**: Business details and settings
- **categories**: Menu organization
- **menu_items**: Food items with AI metadata (versioned)
- **operating_hours**: Schedule (supports split shifts)
- **special_dates**: Holiday/exception handling

## Soft Deletes

Tables with `deleted_at` column support soft deletion:
- tenants
- authorized_users
- menu_items

Always filter by `WHERE deleted_at IS NULL` in queries.

## Tenant Safety Helper

Use `createTenantDb(db, tenantId)` to enforce tenant scoping and soft-delete filtering automatically:

```ts
import { createDb, createTenantDb } from '@diner/db';

const db = createDb(env.DB);
const tenantDb = createTenantDb(db, 'tenant-joes-diner');

// Select categories for this tenant (deleted rows filtered out automatically)
const categories = await tenantDb.select(schema.categories);

// Insert a menu item with tenant_id auto-filled
await tenantDb.insert(schema.menuItems, {
	categoryId: 1,
	name: 'Soup of the Day',
	price: 6.5,
});

// Soft-delete an item
await tenantDb.softDelete(schema.menuItems, eq(schema.menuItems.id, 3));
```

> The helper requires a `tenantId` for all operations and applies `deleted_at IS NULL` for tables that support soft deletes.
