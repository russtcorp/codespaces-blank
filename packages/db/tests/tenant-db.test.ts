import { describe, expect, it, vi } from 'vitest';

vi.mock('drizzle-orm', () => ({
  and: (...conds: any[]) => ({ op: 'and', conds }),
  eq: (column: any, value: any) => ({ op: 'eq', column: column?.name ?? column, value }),
  isNull: (column: any) => ({ op: 'isNull', column: column?.name ?? column }),
  sql: (strings: TemplateStringsArray, ...values: any[]) => ({
    kind: 'sql',
    text: String.raw({ raw: strings } as any, ...values),
  }),
}));

import { createTenantDb } from '../src/tenant-db';
import * as schema from '../src/schema';

type FakeCall = { table: any; values?: any; cond?: any };

function createFakeDb() {
  const calls = { select: [] as FakeCall[], update: [] as FakeCall[], insert: [] as FakeCall[] };

  const db = {
    calls,
    select() {
      return {
        from(table: any) {
          return {
            where(cond: any) {
              calls.select.push({ table, cond });
              return Promise.resolve([]);
            },
          };
        },
      };
    },
    update(table: any) {
      return {
        set(values: any) {
          return {
            where(cond: any) {
              calls.update.push({ table, values, cond });
              return Promise.resolve();
            },
          };
        },
      };
    },
    insert(table: any) {
      return {
        values(values: any) {
          calls.insert.push({ table, values });
          return Promise.resolve();
        },
      };
    },
  } as const;

  return db;
}

describe('createTenantDb', () => {
  it('injects tenant filters and soft-delete check on select', async () => {
    const db = createFakeDb();
    const tenantDb = createTenantDb(db as any, 'tenant-1');

    await tenantDb.select(schema.menuItems);

    expect(db.calls.select).toHaveLength(1);
    const cond = db.calls.select[0]?.cond;

    expect(cond).toMatchObject({
      op: 'and',
      conds: [
        { op: 'eq', column: 'tenant_id', value: 'tenant-1' },
        { op: 'isNull', column: 'deleted_at' },
      ],
    });
  });

  it('sets tenant id on insert values', async () => {
    const db = createFakeDb();
    const tenantDb = createTenantDb(db as any, 'tenant-1');

    await tenantDb.insert(schema.menuItems, { name: 'Item', categoryId: 1, price: 5 });

    expect(db.calls.insert[0]?.values.tenantId).toBe('tenant-1');
  });

  it('uses tenant id equality for the tenants table', async () => {
    const db = createFakeDb();
    const tenantDb = createTenantDb(db as any, 'tenant-abc');

    await tenantDb.select(schema.tenants);

    const cond = db.calls.select[0]?.cond;
    expect(cond).toMatchObject({
      op: 'and',
      conds: [
        { op: 'eq', column: 'id', value: 'tenant-abc' },
        { op: 'isNull', column: 'deleted_at' },
      ],
    });
  });

  it('raises when softDelete is called on a table without deleted_at', async () => {
    const db = createFakeDb();
    const tenantDb = createTenantDb(db as any, 'tenant-1');

    await expect(() => tenantDb.softDelete(schema.categories)).toThrow();
  });

  it('applies soft delete updates for tables with deleted_at', async () => {
    const db = createFakeDb();
    const tenantDb = createTenantDb(db as any, 'tenant-1');

    await tenantDb.softDelete(schema.menuItems, { op: 'eq', column: 'id', value: 1 });

    expect(db.calls.update).toHaveLength(1);
    expect(db.calls.update[0]?.values).toHaveProperty('deletedAt');
    expect(db.calls.update[0]?.cond.op).toBe('and');
  });
});