# Public App (Phase 3)

Multi-tenant Remix PWA served on Cloudflare Pages/Workers.

## Endpoints
- `/` — main site (tenant-resolved by Host header)
- `/menu.json` — menu payload for PWA cache
- `/api.manifest` — per-tenant web app manifest
- `/doomsday` — static fallback stub

## Tenant resolution
- KV cache: `host -> tenant_id` (TTL 60m)
- D1 fallback on miss; caches result

## Data loading
- Uses `createTenantDb` to enforce tenant isolation and soft-delete filtering.
- Loads theme_config, business_info, categories, menu_items, operating_hours, special_dates.
- Hides categories with no available items.

## Status logic
- Priority: emergency (stubbed false) > special date > weekly schedule.
- Supports multiple blocks per day.

## Theming / FOUC prevention
- Loader injects CSS variables into `<style>` SSR for immediate theming.

## PWA / Offline
- Service worker (`public/sw.js`) pre-caches `/`, `/menu.json`, `/api.manifest`.
- Stale-while-revalidate for `menu.json`; navigations fall back to cached `/` when offline.

## Image optimization
- `app/components/OptimizedImage.tsx` rewrites R2 URLs to Cloudflare Image Delivery when possible.

## Running (once Node/pnpm available)
```bash
pnpm install
pnpm dev  # starts public app at 8788
```

## Env/bindings required
- D1: `DB`
- KV: `KV` (domain cache)
- (Optional) R2 for assets if using image delivery

## Next steps
- Wire emergency flag source
- Add icon assets for manifest
- Expand doomsday fallback to fetch from R2
