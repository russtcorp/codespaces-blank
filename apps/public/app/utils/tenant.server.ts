import { createDb, tenants } from '@diner/db';
import { eq } from 'drizzle-orm';

type Env = {
  DB: D1Database;
  KV: KVNamespace;
};

const KV_TENANT_TTL_SECONDS = 60 * 60; // 60 minutes
const TENANT_DOMAIN_INDEX_PREFIX = 'tenant-domains:';

function normalizeHost(host: string) {
  // Remove port and lowercase
  const base = host.split(':')[0] ?? host;
  return base.toLowerCase();
}

export async function resolveTenantId(request: Request, env: Env): Promise<string | null> {
  const hostHeader = request.headers.get('host');
  if (!hostHeader) return null;
  const host = normalizeHost(hostHeader);

  // 1) KV cache lookup
  const cached = await env.KV.get(`tenant:${host}`);
  if (cached) return cached;

  // 2) DB lookup by custom domain OR slug (for dev, host may equal slug.local)
  const db = createDb(env.DB);
  const byDomain = await db.query.tenants.findFirst({
    where: eq(tenants.customDomain, host),
  });

  let match = byDomain;
  if (!match) {
    // Try slug == host without dots (for local dev you might map host to slug)
    match = await db.query.tenants.findFirst({ where: eq(tenants.slug, host) });
  }

  if (match?.id) {
    await env.KV.put(`tenant:${host}`, match.id, { expirationTtl: KV_TENANT_TTL_SECONDS });

    // Track domains per tenant to enable invalidation later
    const indexKey = `${TENANT_DOMAIN_INDEX_PREFIX}${match.id}`;
    const existing = (await env.KV.get(indexKey, 'json')) as string[] | null;
    const next = Array.from(new Set([...(existing ?? []), host]));
    await env.KV.put(indexKey, JSON.stringify(next), { expirationTtl: KV_TENANT_TTL_SECONDS });
    return match.id;
  }

  return null;
}

export async function invalidateTenantCache(env: Env, host: string) {
  await env.KV.delete(`tenant:${normalizeHost(host)}`);
}

export async function invalidateTenantDomains(env: Env, tenantId: string) {
  const indexKey = `${TENANT_DOMAIN_INDEX_PREFIX}${tenantId}`;
  const hosts = ((await env.KV.get(indexKey, 'json')) as string[] | null) ?? [];
  await Promise.all(hosts.map((h) => env.KV.delete(`tenant:${h}`)));
  await env.KV.delete(indexKey);
}