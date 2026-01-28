// ... (imports)

const MEMORY_CACHE_TTL_MS = 60 * 1000; // 1 minute
const memoryCache = new Map<string, { tenantId: string; expires: number }>();

export const HOSTNAME_CACHE_TTL = 3600; // 60 minutes in seconds
// ... (rest of the constants)

// ... (HostnameCache interface)

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

  async getTenantId(hostname: string): Promise<string | null> {
    const normalizedHostname = this.normalizeHostname(hostname);

    // 1. Check in-memory cache
    const memEntry = memoryCache.get(normalizedHostname);
    if (memEntry && memEntry.expires > Date.now()) {
      return memEntry.tenantId;
    }

    const cacheKey = `${CACHE_KEY_PREFIX}${normalizedHostname}`;
    // ... (rest of the function, starting from invalidKey)
    const invalidKey = `${CACHE_KEY_INVALID}${normalizedHostname}`;

    try {
      // 2. Check KV cache
      const cached = await this.kv.get(cacheKey);
      if (cached) {
        // Populate in-memory cache and return
        memoryCache.set(normalizedHostname, { tenantId: cached, expires: Date.now() + MEMORY_CACHE_TTL_MS });
        return cached;
      }
      // ... (rest of the try block)
      if (mapping) {
        // Cache in both KV and memory
        await this.kv.put(cacheKey, mapping.tenantId, {
          expirationTtl: HOSTNAME_CACHE_TTL,
        });
        memoryCache.set(normalizedHostname, { tenantId: mapping.tenantId, expires: Date.now() + MEMORY_CACHE_TTL_MS });
        return mapping.tenantId;
      } else {
      // ... (rest of the else block)
      }
    } catch (error) {
    // ... (rest of the catch block)
    }
  }

  // ... (setTenantId method)

  /**
   * Invalidate cache for a hostname
   */
  async invalidate(hostname: string): Promise<void> {
    const normalizedHostname = this.normalizeHostname(hostname);
    // Invalidate memory cache
    memoryCache.delete(normalizedHostname);

    const cacheKey = `${CACHE_KEY_PREFIX}${normalizedHostname}`;
    // ... (rest of the invalidate method)
  }

  // ... (normalizeHostname method)
}

