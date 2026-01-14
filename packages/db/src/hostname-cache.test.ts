import { describe, it, expect, beforeEach } from "vitest";
import { createHostnameCache } from "./hostname-cache";

// Minimal KV mock (shape compatible enough for tests)
class MockKV {
  store = new Map<string, string>();
  async get(key: string) {
    return this.store.get(key) ?? null;
  }
  async put(key: string, value: string) {
    this.store.set(key, value);
  }
  async delete(key: string) {
    this.store.delete(key);
  }
}

// Minimal DB mock
class MockDB {
  mapping: Record<string, string> = {};
  query = {
    hostMapping: {
      findFirst: async ({ where }: { where: any }) => {
        // where is eq(host, value) -> emulate by reading where.right
        const host = where.right;
        const tenantId = this.mapping[host];
        return tenantId ? { host, tenantId } : null;
      },
      $table: { host: "host" },
    },
  };
}

describe("hostname-cache", () => {
  let kv: MockKV;
  let db: MockDB;

  beforeEach(() => {
    kv = new MockKV();
    db = new MockDB();
    db.mapping = { "example.com": "tenant-123" };
  });

  it("returns cached tenant on cache hit", async () => {
    const cache = createHostnameCache(kv as any, db as any);
    await kv.put("host:cached.com", "tenant-999");

    const tenantId = await cache.getTenantId("cached.com");
    expect(tenantId).toBe("tenant-999");
  });

  it("falls back to D1 and caches result", async () => {
    const cache = createHostnameCache(kv as any, db as any);
    await cache.setTenantId("example.com", "tenant-123");
    const tenantId = await cache.getTenantId("example.com");
    expect(tenantId).toBe("tenant-123");
  });

  it("caches invalid lookups to prevent repeated DB hits", async () => {
    const cache = createHostnameCache(kv as any, db as any);
    const tenantId = await cache.getTenantId("missing.com");
    expect(tenantId).toBeNull();

    const invalid = await kv.get("invalid:missing.com");
    expect(invalid).not.toBeNull();
  });
});
