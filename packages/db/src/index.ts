import { drizzle } from 'drizzle-orm/d1';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';
import { createTenantDb } from './tenant-db';

/**
 * Initialize Drizzle client with D1 binding
 */
export function createDb(d1: D1Database): DrizzleD1Database<typeof schema> {
  return drizzle(d1, { schema });
}

/**
 * Tenant-scoped helper enforcing tenantId and soft-delete filters
 */
export { createTenantDb };

/**
 * Export schema and types
 */
export * from './schema';
export type { DrizzleD1Database };
