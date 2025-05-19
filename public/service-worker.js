// NestTask Service Worker
const CACHE_NAME = 'nesttask-v2';
const STATIC_CACHE_NAME = 'nesttask-static-v2';
const DYNAMIC_CACHE_NAME = 'nesttask-dynamic-v2';
const OFFLINE_URL = '/offline.html';

// Minimal assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/icons/icon-192x192.png'
];

// Last activity timestamp to track service worker lifespan
let lastActivityTimestamp = Date.now();

// Update the timestamp periodically to prevent service worker termination
setInterval(() => {
  lastActivityTimestamp = Date.now();
}, 60000); // Every minute

// Install event - precache only critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
    .then(() => self.clients.claim())
  );
});

// Optimized fetch event with efficient caching
self.addEventListener('fetch', (event) => {
  // Update activity timestamp
  lastActivityTimestamp = Date.now();
  
  // Skip cross-origin requests and analytics
  if (!event.request.url.startsWith(self.location.origin) || 
      event.request.url.includes('_vercel/insights') ||
      event.request.url.includes('/api/')) {
    return;
  }
  
  // HTML navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          return cachedResponse || fetch(event.request)
            .then(networkResponse => {
              if (networkResponse.ok) {
                const clonedResponse = networkResponse.clone();
                caches.open(STATIC_CACHE_NAME)
                  .then(cache => cache.put(event.request, clonedResponse));
              }
              return networkResponse;
            })
            .catch(() => caches.match(OFFLINE_URL));
        })
    );
    return;
  }
  
  // CSS, JS, and critical assets - cache first
  if (event.request.url.match(/\.(css|js|woff2|woff|ttf|svg|png|jpg|jpeg|gif|webp)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Update cache in background only for frequently used assets
            if (event.request.url.includes('main') || 
                event.request.url.includes('vendor') || 
                event.request.url.includes('icon')) {
              fetch(event.request)
                .then(networkResponse => {
                  if (networkResponse.ok) {
                    caches.open(STATIC_CACHE_NAME)
                      .then(cache => cache.put(event.request, networkResponse.clone()));
                  }
                })
                .catch(() => {});
            }
            return cachedResponse;
          }
          
          // Not in cache - fetch from network
          return fetch(event.request)
            .then(networkResponse => {
              if (networkResponse.ok) {
                const clonedResponse = networkResponse.clone();
                caches.open(STATIC_CACHE_NAME)
                  .then(cache => cache.put(event.request, clonedResponse));
              }
              return networkResponse;
            });
        })
    );
    return;
  }
  
  // All other requests - network first, then cache
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse.ok) {
          const clonedResponse = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME)
            .then(cache => cache.put(event.request, clonedResponse));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  // Update activity timestamp
  lastActivityTimestamp = Date.now();
  
  if (event.data) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
        
      case 'CLEAR_ALL_CACHES':
        caches.keys().then(keyList => {
          return Promise.all(keyList.map(key => caches.delete(key)));
        }).then(() => {
          if (event.source) {
            event.source.postMessage({
              type: 'CACHES_CLEARED',
              timestamp: Date.now()
            });
          }
        });
        break;
        
      case 'KEEP_ALIVE':
        if (event.source) {
          event.source.postMessage({
            type: 'KEEP_ALIVE_RESPONSE',
            timestamp: lastActivityTimestamp
          });
        }
        break;
        
      case 'HEALTH_CHECK':
        const healthStatus = {
          timestamp: Date.now(),
          cacheStatus: 'unknown',
          uptime: Date.now() - lastActivityTimestamp,
          isResponding: true
        };
        
        caches.keys().then(keys => {
          healthStatus.cacheStatus = keys.length > 0 ? 'ok' : 'empty';
          
          if (event.source) {
            event.source.postMessage({
              type: 'HEALTH_STATUS',
              status: healthStatus
            });
          }
        }).catch(error => {
          if (event.source) {
            event.source.postMessage({
              type: 'HEALTH_STATUS',
              status: { ...healthStatus, cacheStatus: 'error' },
              error: error.message
            });
          }
        });
        break;
    }
  }
}); 