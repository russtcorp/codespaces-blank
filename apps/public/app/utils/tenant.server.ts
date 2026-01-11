import { createDb, tenants } from '@diner/db';
import { eq } from 'drizzle-orm';

type Env = {
  DB: D1Database;
  KV: KVNamespace;
};

const KV_TENANT_TTL_SECONDS = 60 * 60; // 60 minutes

function normalizeHost(host: string) {
  // Remove port and lowercase
  return host.split(':')[0].toLowerCase();
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
    return match.id;
  }

  return null;
}

export async function invalidateTenantCache(env: Env, host: string) {
  await env.KV.delete(`tenant:${normalizeHost(host)}`);
}