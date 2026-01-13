import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@diner/db', () => {
  const createDb = vi.fn();
  const tenants = {
    customDomain: { name: 'custom_domain' },
    slug: { name: 'slug' },
  } as const;

  return { createDb, tenants };
});

import { createDb } from '@diner/db';
import { invalidateTenantDomains, resolveTenantId } from './tenant.server';

type TestKV = {
  store: Map<string, string>;
  get: (key: string, type?: 'json') => Promise<any>;
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

function createKV(): TestKV {
  const store = new Map<string, string>();
  return {
    store,
    async get(key, type) {
      const value = store.get(key);
      if (value === undefined) return null;
      if (type === 'json') return JSON.parse(value);
      return value;
    },
    async put(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    },
  };
}

describe('resolveTenantId', () => {
  const createDbMock = vi.mocked(createDb);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached tenant id without hitting the database', async () => {
    const kv = createKV();
    kv.store.set('tenant:example.com', 'tenant-cached');
    const env = { DB: {} as any, KV: kv };

    const tenantId = await resolveTenantId(new Request('https://example.com', { headers: { host: 'Example.com:8788' } }), env as any);

    expect(tenantId).toBe('tenant-cached');
    expect(createDbMock).not.toHaveBeenCalled();
  });

  it('looks up domain in DB, caches it, and tracks domain index', async () => {
    const kv = createKV();
    const findFirst = vi.fn().mockResolvedValue({ id: 'tenant-123', slug: 'joes-diner', customDomain: 'example.com' });
    createDbMock.mockReturnValue({ query: { tenants: { findFirst } } } as any);

    const env = { DB: {} as any, KV: kv };
    const tenantId = await resolveTenantId(
      new Request('https://example.com', { headers: { host: 'example.com' } }),
      env as any,
    );

    expect(tenantId).toBe('tenant-123');
    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(await kv.get('tenant:example.com')).toBe('tenant-123');
    expect(await kv.get('tenant-domains:tenant-123', 'json')).toEqual(['example.com']);
  });

  it('falls back to slug lookup when custom domain is missing', async () => {
    const kv = createKV();
    const findFirst = vi.fn()
      .mockResolvedValueOnce(null) // custom domain miss
      .mockResolvedValueOnce({ id: 'tenant-slug', slug: 'joes-diner.local' });

    createDbMock.mockReturnValue({ query: { tenants: { findFirst } } } as any);

    const env = { DB: {} as any, KV: kv };
    const tenantId = await resolveTenantId(
      new Request('https://joes-diner.local', { headers: { host: 'joes-diner.local' } }),
      env as any,
    );

    expect(tenantId).toBe('tenant-slug');
    expect(findFirst).toHaveBeenCalledTimes(2);
    expect(await kv.get('tenant:joes-diner.local')).toBe('tenant-slug');
  });

  it('invalidates all cached domains for a tenant', async () => {
    const kv = createKV();
    kv.store.set('tenant:one.com', 'tenant-xyz');
    kv.store.set('tenant:two.com', 'tenant-xyz');
    kv.store.set('tenant-domains:tenant-xyz', JSON.stringify(['one.com', 'two.com']));

    await invalidateTenantDomains({ KV: kv } as any, 'tenant-xyz');

    expect(await kv.get('tenant:one.com')).toBeNull();
    expect(await kv.get('tenant:two.com')).toBeNull();
    expect(await kv.get('tenant-domains:tenant-xyz')).toBeNull();
  });
});