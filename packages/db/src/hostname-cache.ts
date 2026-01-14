/**
 * Hostname-to-Tenant Mapping Cache
 *
 * Caches the resolution of hostname (custom domain or subdomain) to tenant ID.
 * Uses Cloudflare KV for fast lookups with D1 as fallback.
 *
 * Cache TTL: 60 minutes
 * Fallback: Query D1 if cache miss, then populate cache
 */

import type { Database } from "./schema";
import { eq } from "drizzle-orm";

export const HOSTNAME_CACHE_TTL = 3600; // 60 minutes in seconds
const CACHE_KEY_PREFIX = "host:"; // KV key prefix: "host:example.com" -> "tenant-id"
const CACHE_KEY_INVALID = "invalid:"; // Track invalid lookups: "invalid:example.com"
const INVALID_CACHE_TTL = 600; // Cache invalid lookups for 10 minutes to avoid repeated DB hits

export interface HostnameCache {
  getTenantId(hostname: string): Promise<string | null>;
  setTenantId(hostname: string, tenantId: string): Promise<void>;
  invalidate(hostname: string): Promise<void>;
}

/**
 * Factory function to create a hostname cache instance
 */
export function createHostnameCache(
  kv: KVNamespace,
  db: Database
): HostnameCache {
  return new HostnameCacheImpl(kv, db);
}

/**
 * Internal implementation
 */
class HostnameCacheImpl implements HostnameCache {
  constructor(private kv: KVNamespace, private db: Database) {}

  /**
   * Resolve a hostname to a tenant ID
   *
   * 1. Check KV cache for the hostname
   * 2. If found, return immediately
   * 3. If not found, query D1
   * 4. Cache the result (or the "invalid" status)
   * 5. Return tenant ID or null
   */
  async getTenantId(hostname: string): Promise<string | null> {
    const normalizedHostname = this.normalizeHostname(hostname);
    const cacheKey = `${CACHE_KEY_PREFIX}${normalizedHostname}`;
    const invalidKey = `${CACHE_KEY_INVALID}${normalizedHostname}`;

    try {
      // Check cache for valid result
      const cached = await this.kv.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Check cache for invalid lookup
      const invalid = await this.kv.get(invalidKey);
      if (invalid) {
        return null;
      }

      // Cache miss - query D1
      const mapping = await this.db.query.hostMapping.findFirst({
        where: eq(this.db.query.hostMapping.$table.host, normalizedHostname),
      });

      if (mapping) {
        // Cache valid result
        await this.kv.put(cacheKey, mapping.tenantId, {
          expirationTtl: HOSTNAME_CACHE_TTL,
        });
        return mapping.tenantId;
      } else {
        // Cache invalid lookup
        await this.kv.put(invalidKey, "1", {
          expirationTtl: INVALID_CACHE_TTL,
        });
        return null;
      }
    } catch (error) {
      console.error(`Hostname cache error for ${normalizedHostname}:`, error);
      // On error, still try D1 as fallback
      try {
        const mapping = await this.db.query.hostMapping.findFirst({
          where: eq(this.db.query.hostMapping.$table.host, normalizedHostname),
        });
        return mapping?.tenantId || null;
      } catch (dbError) {
        console.error(`D1 fallback failed for ${normalizedHostname}:`, dbError);
        return null;
      }
    }
  }

  /**
   * Cache a hostname-to-tenant mapping
   * Called during onboarding or when a tenant updates their domain
   */
  async setTenantId(hostname: string, tenantId: string): Promise<void> {
    const normalizedHostname = this.normalizeHostname(hostname);
    const cacheKey = `${CACHE_KEY_PREFIX}${normalizedHostname}`;
    const invalidKey = `${CACHE_KEY_INVALID}${normalizedHostname}`;

    try {
      // Write to cache
      await this.kv.put(cacheKey, tenantId, {
        expirationTtl: HOSTNAME_CACHE_TTL,
      });

      // Remove invalid cache if it existed
      await this.kv.delete(invalidKey);
    } catch (error) {
      console.error(`Failed to cache hostname ${normalizedHostname}:`, error);
      // Non-fatal: cache is just optimization
    }
  }

  /**
   * Invalidate cache for a hostname
   * Called when a tenant domain changes or is deleted
   */
  async invalidate(hostname: string): Promise<void> {
    const normalizedHostname = this.normalizeHostname(hostname);
    const cacheKey = `${CACHE_KEY_PREFIX}${normalizedHostname}`;
    const invalidKey = `${CACHE_KEY_INVALID}${normalizedHostname}`;

    try {
      await Promise.all([
        this.kv.delete(cacheKey),
        this.kv.delete(invalidKey),
      ]);
    } catch (error) {
      console.error(`Failed to invalidate cache for ${normalizedHostname}:`, error);
      // Non-fatal: next lookup will just query D1
    }
  }

  /**
   * Normalize hostname for consistent caching
   * - Convert to lowercase
   * - Remove port number if present
   * - Remove trailing slash
   */
  private normalizeHostname(hostname: string): string {
    return hostname
      .toLowerCase()
      .split(":")[0] // Remove port
      .replace(/\/$/, ""); // Remove trailing slash
  }
}

/**
 * Cache invalidation helper - called when business settings are updated
 */
export async function invalidateHostnameCache(
  cache: HostnameCache,
  hostname: string
): Promise<void> {
  await cache.invalidate(hostname);
}

/**
 * Sync cache after domain change
 */
export async function syncHostnameCache(
  cache: HostnameCache,
  oldHostname: string | null,
  newHostname: string,
  tenantId: string
): Promise<void> {
  // Invalidate old mapping if it existed
  if (oldHostname) {
    await cache.invalidate(oldHostname);
  }

  // Set new mapping
  await cache.setTenantId(newHostname, tenantId);
}
