/**
 * Safe Query Middleware
 *
 * This module provides tenant isolation at the query level.
 * Every database operation MUST be scoped by tenant_id to prevent cross-tenant data leaks.
 *
 * The middleware enforces a mandatory tenantId context for all queries.
 * For admin operations, an explicit isSuperAdmin flag can bypass tenant filtering.
 */

import { eq, and, SQLiteSelect } from "drizzle-orm";
import type {
  Database,
  tenants,
  authorizedUsers,
  businessSettings,
  themeConfig,
  menuItems,
  categories,
  operatingHours,
  specialDates,
  sessions,
  hostMapping,
} from "./schema";

/**
 * Query context that must be provided to all safe queries.
 * Ensures tenant isolation and audit trail.
 */
export interface QueryContext {
  tenantId: string;
  userId?: number;
  isSuperAdmin?: boolean;
}

/**
 * Wraps database operations to enforce tenant isolation.
 * Every table query (except tenants itself) gets a tenant_id WHERE clause.
 *
 * Usage:
 *   const safeDb = createSafeDb(db, ctx);
 *   const items = await safeDb.query.menuItems.findMany(); // Automatically scoped by ctx.tenantId
 */
export class SafeDatabase {
  private db: Database;
  private ctx: QueryContext;

  constructor(db: Database, context: QueryContext) {
    this.db = db;
    this.ctx = context;

    if (!context.tenantId) {
      throw new Error("QueryContext MUST include a valid tenantId");
    }
  }

  /**
   * Get the current tenant ID for this context
   */
  getTenantId(): string {
    return this.ctx.tenantId;
  }

  /**
   * Check if this context has super admin privileges
   */
  isSuperAdmin(): boolean {
    return Boolean(this.ctx.isSuperAdmin);
  }

  /**
   * Query menu items scoped to tenant
   */
  menuItems() {
    return {
      findMany: async () => {
        return this.db.query.menuItems
          .findMany({
            where: eq(this.db.query.menuItems.$table.tenantId, this.ctx.tenantId),
          })
          .catch((err) => {
            throw new Error(`Menu items query failed: ${err.message}`);
          });
      },
      findById: async (id: number) => {
        return this.db.query.menuItems
          .findFirst({
            where: and(
              eq(this.db.query.menuItems.$table.id, id),
              eq(this.db.query.menuItems.$table.tenantId, this.ctx.tenantId)
            ),
          })
          .catch((err) => {
            throw new Error(`Menu item lookup failed: ${err.message}`);
          });
      },
      findByCategory: async (categoryId: number) => {
        return this.db.query.menuItems
          .findMany({
            where: and(
              eq(this.db.query.menuItems.$table.categoryId, categoryId),
              eq(this.db.query.menuItems.$table.tenantId, this.ctx.tenantId)
            ),
          })
          .catch((err) => {
            throw new Error(`Category items query failed: ${err.message}`);
          });
      },
    };
  }

  /**
   * Query categories scoped to tenant
   */
  categories() {
    return {
      findMany: async () => {
        return this.db.query.categories
          .findMany({
            where: eq(this.db.query.categories.$table.tenantId, this.ctx.tenantId),
            orderBy: (cat) => cat.sortOrder,
          })
          .catch((err) => {
            throw new Error(`Categories query failed: ${err.message}`);
          });
      },
      findById: async (id: number) => {
        return this.db.query.categories
          .findFirst({
            where: and(
              eq(this.db.query.categories.$table.id, id),
              eq(this.db.query.categories.$table.tenantId, this.ctx.tenantId)
            ),
          })
          .catch((err) => {
            throw new Error(`Category lookup failed: ${err.message}`);
          });
      },
    };
  }

  /**
   * Query operating hours scoped to tenant
   */
  operatingHours() {
    return {
      findMany: async () => {
        return this.db.query.operatingHours
          .findMany({
            where: eq(this.db.query.operatingHours.$table.tenantId, this.ctx.tenantId),
            orderBy: (oh) => [oh.dayOfWeek, oh.startTime],
          })
          .catch((err) => {
            throw new Error(`Operating hours query failed: ${err.message}`);
          });
      },
      findByDay: async (dayOfWeek: number) => {
        return this.db.query.operatingHours
          .findMany({
            where: and(
              eq(this.db.query.operatingHours.$table.tenantId, this.ctx.tenantId),
              eq(this.db.query.operatingHours.$table.dayOfWeek, dayOfWeek)
            ),
            orderBy: (oh) => oh.startTime,
          })
          .catch((err) => {
            throw new Error(`Day hours query failed: ${err.message}`);
          });
      },
    };
  }

  /**
   * Query special dates scoped to tenant
   */
  specialDates() {
    return {
      findMany: async () => {
        return this.db.query.specialDates
          .findMany({
            where: eq(this.db.query.specialDates.$table.tenantId, this.ctx.tenantId),
            orderBy: (sd) => sd.dateIso,
          })
          .catch((err) => {
            throw new Error(`Special dates query failed: ${err.message}`);
          });
      },
      findByDate: async (dateIso: string) => {
        return this.db.query.specialDates
          .findFirst({
            where: and(
              eq(this.db.query.specialDates.$table.tenantId, this.ctx.tenantId),
              eq(this.db.query.specialDates.$table.dateIso, dateIso)
            ),
          })
          .catch((err) => {
            throw new Error(`Special date lookup failed: ${err.message}`);
          });
      },
    };
  }

  /**
   * Query business settings scoped to tenant
   */
  businessSettings() {
    return {
      findOne: async () => {
        return this.db.query.businessSettings
          .findFirst({
            where: eq(this.db.query.businessSettings.$table.tenantId, this.ctx.tenantId),
          })
          .catch((err) => {
            throw new Error(`Business settings query failed: ${err.message}`);
          });
      },
    };
  }

  /**
   * Query theme config scoped to tenant
   */
  themeConfig() {
    return {
      findOne: async () => {
        return this.db.query.themeConfig
          .findFirst({
            where: eq(this.db.query.themeConfig.$table.tenantId, this.ctx.tenantId),
          })
          .catch((err) => {
            throw new Error(`Theme config query failed: ${err.message}`);
          });
      },
    };
  }

  /**
   * Query authorized users scoped to tenant
   */
  authorizedUsers() {
    return {
      findMany: async () => {
        return this.db.query.authorizedUsers
          .findMany({
            where: eq(this.db.query.authorizedUsers.$table.tenantId, this.ctx.tenantId),
          })
          .catch((err) => {
            throw new Error(`Authorized users query failed: ${err.message}`);
          });
      },
      findById: async (id: number) => {
        return this.db.query.authorizedUsers
          .findFirst({
            where: and(
              eq(this.db.query.authorizedUsers.$table.id, id),
              eq(this.db.query.authorizedUsers.$table.tenantId, this.ctx.tenantId)
            ),
          })
          .catch((err) => {
            throw new Error(`User lookup failed: ${err.message}`);
          });
      },
    };
  }

  /**
   * Get raw database instance for advanced queries (use with caution!)
   * Super admin operations only
   */
  getRawDb(): Database {
    if (!this.ctx.isSuperAdmin) {
      throw new Error(
        "Cannot access raw database without super admin privileges"
      );
    }
    return this.db;
  }

  /**
   * Direct insert/update/delete operations (for migrations and seeding)
   * Use with extreme caution - these bypass tenant isolation!
   */
  async directInsert<T extends Record<string, any>>(
    operation: () => Promise<T>
  ): Promise<T> {
    if (!this.ctx.isSuperAdmin) {
      throw new Error(
        "Cannot perform direct database operations without super admin privileges"
      );
    }
    return operation();
  }
}

/**
 * Factory function to create a safe database wrapper
 */
export function createSafeDb(db: Database, context: QueryContext): SafeDatabase {
  return new SafeDatabase(db, context);
}

/**
 * Create a super admin context (use sparingly, only for migrations and admin operations)
 */
export function createAdminContext(tenantId?: string): QueryContext {
  return {
    tenantId: tenantId || "admin",
    isSuperAdmin: true,
  };
}

/**
 * Create a regular user context
 */
export function createUserContext(
  tenantId: string,
  userId: number
): QueryContext {
  return {
    tenantId,
    userId,
    isSuperAdmin: false,
  };
}

/**
 * Validate that a tenant ID is valid before creating context
 */
export async function validateTenantId(
  db: Database,
  tenantId: string
): Promise<boolean> {
  const tenant = await db.query.tenants.findFirst({
    where: eq(db.query.tenants.$table.id, tenantId),
  });
  return Boolean(tenant);
}
