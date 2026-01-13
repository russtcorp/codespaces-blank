import { createDb, tenants } from '@diner/db';
import { eq } from 'drizzle-orm';

type Env = { DB: D1Database };

function normalizeHost(host: string | null) {
  if (!host) return null;
  const base = host.split(':')[0] ?? host;
  return base.toLowerCase();
}

/**
 * Resolve tenantId for the dashboard based on host header or optional search param `tenant`.
 * Falls back to null when no tenant is found; callers may choose a default in dev.
 */
export async function resolveTenantId(request: Request, env: Env): Promise<string | null> {
  const url = new URL(request.url);
  const tenantParam = url.searchParams.get('tenant');
  if (tenantParam) return tenantParam;

  const host = normalizeHost(request.headers.get('host'));
  if (!host) return null;

  const db = createDb(env.DB);

  const byDomain = await db.query.tenants.findFirst({ where: eq(tenants.customDomain, host) });
  if (byDomain?.id) return byDomain.id;

  const bySlug = await db.query.tenants.findFirst({ where: eq(tenants.slug, host) });
  if (bySlug?.id) return bySlug.id;

  return null;
}