# Local Development Database Workaround

## Problem
The wrangler command's workerd binary has a glibc compatibility issue in some development environments, causing `wrangler d1 execute` to fail with "version `GLIBC_2.xx' not found" errors.

## Solution
This project uses a **dual approach**:

### Local Development (sqlite3)
For local development, we use sqlite3 directly:
```bash
npm run db:local    # Initialize schema
npm run db:seed     # Apply seed data
```

This creates the database at `.wrangler/state/v3/d1/local-dev.db` which is the same location wrangler would use, maintaining compatibility with wrangler.toml bindings.

**Benefits:**
- Works in environments with workerd binary compatibility issues
- Fast execution
- No additional dependencies beyond sqlite3 (included in base image)
- Database location matches wrangler expectations

### Production Migration (wrangler)
For production deployments, we use wrangler as specified in the Master Plan:
```bash
npm run db:migrate  # Execute on production D1
```

This uses the Cloudflare API to apply migrations to the remote database.

## File Layout
- `.wrangler/state/v3/d1/local-dev.db` - Local SQLite database (development)
- `packages/db/migrations/0001_init_schema.sql` - Schema DDL
- `packages/db/migrations/0002_seed_dev_data.sql` - Generated seed data
- `packages/db/scripts/seed.js` - Seed data generator

## Workflow
1. **First time setup:**
   ```bash
   npm run db:local   # Create schema
   npm run db:seed    # Apply test data
   ```

2. **Subsequent runs:**
   - Database persists in `.wrangler/state/v3/d1/local-dev.db`
   - Re-run `npm run db:local` to reset schema
   - Database is ready for `pnpm dev`

3. **Production deployment:**
   ```bash
   npm run db:migrate # Apply to remote Cloudflare D1
   ```

## Important Notes
- ✅ The local database is fully compatible with wrangler.toml bindings
- ✅ Production uses official wrangler CLI (no workaround)
- ✅ Both use the same migration files
- ✅ Seed data is generated dynamically via Node.js script
- ✅ Database schema is identical between local and production

## Troubleshooting
If you need to start fresh:
```bash
rm -rf .wrangler/state/v3/d1/local-dev.db
npm run db:local   # Recreate schema
npm run db:seed    # Reapply seed data
```

## Reference
- Master Plan spec: Uses wrangler for D1 operations
- Phase 2 delivery: Database architecture & tenant isolation
- Implementation notes: Pragmatic workaround for environment compatibility
