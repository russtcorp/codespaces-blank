const CACHE_NAME = 'diner-pwa-v2';
const MENU_URL = '/menu.json';
const THEME_CACHE = 'diner-theme-v2';
const MENU_CACHE = 'diner-menu-v2';
const CORE_ASSETS = [
  '/',
  MENU_URL,
  '/api.manifest',
  '/doomsday',
];

// Install - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== THEME_CACHE && k !== MENU_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch - enhanced caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Menu data - stale-while-revalidate with dedicated cache
  if (url.pathname === MENU_URL) {
    event.respondWith(
      caches.open(MENU_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request)
            .then((res) => {
              if (res && res.status === 200) {
                cache.put(event.request, res.clone());
              }
              return res;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Theme/manifest - cache-first with network fallback
  if (url.pathname === '/api.manifest' || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.open(THEME_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((res) => {
            if (res && res.status === 200) {
              cache.put(event.request, res.clone());
            }
            return res;
          });
        })
      )
    );
    return;
  }

  // Navigation - network-first with cache fallback and doomsday
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => 
          caches.match('/')
            .then(cached => cached || caches.match('/doomsday'))
        )
    );
    return;
  }

  // Default - network-first
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Message handler for cache invalidation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INVALIDATE_CACHE') {
    event.waitUntil(
      Promise.all([
        caches.delete(MENU_CACHE),
        caches.delete(THEME_CACHE),
      ]).then(() => {
        // Notify all clients that cache was cleared
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => client.postMessage({ type: 'CACHE_CLEARED' }));
        });
      })
    );
  }
});
