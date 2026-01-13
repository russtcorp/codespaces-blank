type Env = {
  KV: KVNamespace;
};

const TENANT_DOMAIN_INDEX_PREFIX = 'tenant-domains:';

/**
 * Invalidate cached tenant data in KV so public site refetches
 */
export async function invalidateTenantCache(env: Env, tenantId: string) {
  const indexKey = `${TENANT_DOMAIN_INDEX_PREFIX}${tenantId}`;
  const hosts = ((await env.KV.get(indexKey, 'json')) as string[] | null) ?? [];

  await Promise.all(hosts.map((host) => env.KV.delete(`tenant:${host}`)));
  await env.KV.delete(indexKey);
}

/**
 * Invalidate public site cache after menu/hours/theme changes
 */
export async function invalidatePublicCache(env: Env, tenantId: string) {
  await invalidateTenantCache(env, tenantId);
  
  // Additional cache keys that might need clearing
  // await env.KV.delete(`menu:${tenantId}`);
  // await env.KV.delete(`theme:${tenantId}`);
  
  // Note: Actual PWA service worker cache is invalidated client-side
  // via postMessage to the service worker after successful updates
}

