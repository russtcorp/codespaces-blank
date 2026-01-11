import { and, eq, isNull } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';

// Tables that carry tenant_id directly
const TENANT_TABLES_WITH_TENANT_ID = [
  schema.themeConfig,
  schema.authorizedUsers,
  schema.businessInfo,
  schema.categories,
  schema.menuItems,
  schema.operatingHours,
  schema.specialDates,
] as const;

type TenantScopedTable = (typeof TENANT_TABLES_WITH_TENANT_ID)[number] | typeof schema.tenants;

const hasDeletedAt = (table: TenantScopedTable) => 'deletedAt' in table;
const hasTenantId = (table: TenantScopedTable) => 'tenantId' in table;

function tenantWhere(table: TenantScopedTable, tenantId: string, extra?: any) {
  const conditions: any[] = [];

  if (table === schema.tenants) {
    conditions.push(eq(schema.tenants.id, tenantId));
  } else if (hasTenantId(table)) {
    conditions.push(eq((table as any).tenantId, tenantId));
  }

  if (hasDeletedAt(table)) {
    conditions.push(isNull((table as any).deletedAt));
  }

  if (extra) conditions.push(extra);

  if (!conditions.length) return extra ?? undefined;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

function withTenantId<T extends Record<string, any>>(table: TenantScopedTable, tenantId: string, values: T) {
  if (table === schema.tenants) {
    return { ...values, id: tenantId } as T;
  }
  if (hasTenantId(table)) {
    return { ...values, tenantId } as T;
  }
  return values;
}

export type TenantDb = ReturnType<typeof createTenantDb>;

/**
 * Creates a tenant-scoped database helper that automatically enforces tenant isolation
 * and respects soft-deletes (deleted_at IS NULL).
 */
export function createTenantDb(db: DrizzleD1Database<typeof schema>, tenantId: string) {
  return {
    tenantId,

    select<T extends TenantScopedTable>(table: T, where?: any) {
      return db.select().from(table).where(tenantWhere(table, tenantId, where));
    },

    update<T extends TenantScopedTable>(table: T, values: Record<string, any>, where?: any) {
      return db.update(table).set(values).where(tenantWhere(table, tenantId, where));
    },

    insert<T extends TenantScopedTable>(table: T, values: Record<string, any>) {
      const withTenant = withTenantId(table, tenantId, values);
      return db.insert(table).values(withTenant);
    },

    softDelete<T extends TenantScopedTable>(table: T, where?: any) {
      if (!hasDeletedAt(table)) {
        throw new Error('softDelete called on a table without deleted_at');
      }
      return db
        .update(table)
        .set({ deletedAt: new Date().toISOString() } as any)
        .where(tenantWhere(table, tenantId, where));
    },
  } as const;
}
