/**
 * Client-side cache invalidation helper
 * Call this after menu/theme updates to clear PWA caches
 */
export function invalidatePWACache() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'INVALIDATE_CACHE' });
  }
}

/**
 * Listen for cache cleared confirmation
 */
export function onCacheCleared(callback: () => void) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'CACHE_CLEARED') {
        callback();
      }
    });
  }
}
