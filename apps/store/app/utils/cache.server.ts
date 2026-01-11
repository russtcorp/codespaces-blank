type Env = {
  KV: KVNamespace;
};

/**
 * Invalidate cached tenant data in KV so public site refetches
 */
export async function invalidateTenantCache(env: Env, tenantId: string) {
  // Get all domains for this tenant from DB would be ideal,
  // but for now we'll use a pattern-based approach
  
  // Clear the domain->tenant mapping
  // In production, you'd track all domains per tenant
  const prefix = `tenant:`;
  
  // Note: KV doesn't support prefix deletion easily
  // Best practice: track domain mappings in a separate KV key
  // For now, we'll document that cache will expire naturally (60min TTL)
  
  console.log(`Cache invalidation requested for tenant: ${tenantId}`);
  
  // TODO: Implement proper domain tracking per tenant
  // await env.KV.delete(`tenant:${domain}`);
}

/**
 * Invalidate public site cache after menu/hours/theme changes
 */
export async function invalidatePublicCache(env: Env, tenantId: string) {
  await invalidateTenantCache(env, tenantId);
  
  // Additional cache keys that might need clearing
  // await env.KV.delete(`menu:${tenantId}`);
  // await env.KV.delete(`theme:${tenantId}`);
}
