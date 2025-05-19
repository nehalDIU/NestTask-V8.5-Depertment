// NestTask Service Worker
const CACHE_NAME = 'nesttask-v1';
const STATIC_CACHE_NAME = 'nesttask-static-v1';
const DYNAMIC_CACHE_NAME = 'nesttask-dynamic-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon.png'
];

// Assets to cache on first use
const STATIC_ASSETS = [
  '/index.html',
  '/assets/js/react-vendor.*.js',
  '/assets/js/date-utils.*.js',
  '/assets/js/ui-components.*.js',
  '/assets/css/*.css',
  '/assets/js/main.*.js'  
];

// Last activity timestamp to track service worker lifespan
let lastActivityTimestamp = Date.now();

// Update the timestamp periodically to prevent service worker termination
setInterval(() => {
  lastActivityTimestamp = Date.now();
  console.log('[ServiceWorker] Still alive, last activity:', new Date(lastActivityTimestamp).toISOString());
}, 60000); // Every minute

// Install event - precache critical assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching offline page and critical assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Skip waiting on install');
        return self.skipWaiting();
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
    .then(() => {
      console.log('[ServiceWorker] Claiming clients');
      self.clients.claim();
      
      // Cache static assets after activation
      return caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      });
    })
  );
});

// Optimized fetch event with stale-while-revalidate strategy
self.addEventListener('fetch', (event) => {
  // Update activity timestamp
  lastActivityTimestamp = Date.now();
  
  // Skip cross-origin requests and analytics requests
  if (!event.request.url.startsWith(self.location.origin) || 
      event.request.url.includes('_vercel/insights') ||
      event.request.url.includes('/api/')) {
    return;
  }
  
  // HTML navigation requests - network first with fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        // Return cached response immediately if available
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Cache the updated version for next time
            if (networkResponse.ok) {
              const clonedResponse = networkResponse.clone();
              caches.open(STATIC_CACHE_NAME).then(cache => {
                cache.put(event.request, clonedResponse);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            console.log('[ServiceWorker] Falling back to offline page');
            return caches.match(OFFLINE_URL);
          });
          
        // Stale-while-revalidate: return cached version immediately if available
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
  
  // CSS, JS, and critical assets - cache first, network as fallback
  if (event.request.url.match(/\.(css|js|woff2|woff|ttf|svg|png|jpg|jpeg|gif|webp)$/)) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        // Return cached response immediately
        if (cachedResponse) {
          // Update cache in the background using stale-while-revalidate
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse.ok) {
                caches.open(STATIC_CACHE_NAME).then(cache => {
                  cache.put(event.request, networkResponse.clone());
                });
              }
            })
            .catch(() => {
              // Network request failed, but we've already returned the cached version
              console.log('[ServiceWorker] Network request failed for asset, using cache');
            });
            
          return cachedResponse;
        }
        
        // If not in cache, fetch from network and cache for next time
        return fetch(event.request)
          .then(networkResponse => {
            // Cache all successful responses
            if (networkResponse.ok) {
              const clonedResponse = networkResponse.clone();
              caches.open(STATIC_CACHE_NAME).then(cache => {
                cache.put(event.request, clonedResponse);
              });
            }
            return networkResponse;
          })
          .catch(error => {
            console.error('[ServiceWorker] Fetch failed:', error);
            // For CSS and JS, we don't have a good fallback, just rethrow the error
            throw error;
          });
      })
    );
    return;
  }
  
  // All other requests - stale-while-revalidate strategy
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Return cached response immediately if available
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          if (networkResponse.ok) {
            // Cache dynamic content in a separate cache
            const clonedResponse = networkResponse.clone();
            caches.open(DYNAMIC_CACHE_NAME).then(cache => {
              cache.put(event.request, clonedResponse);
            });
          }
          return networkResponse;
        })
        .catch(error => {
          console.error('[ServiceWorker] Fetch failed:', error);
          // No specific fallback for API requests, just return the error
          throw error;
        });
        
      // Stale-while-revalidate: return cached version or wait for network
      return cachedResponse || fetchPromise;
    })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  // Update activity timestamp
  lastActivityTimestamp = Date.now();
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Clear caches on request
  if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => caches.delete(key)));
    }).then(() => {
      console.log('[ServiceWorker] All caches cleared');
      if (event.source) {
        event.source.postMessage({
          type: 'CACHES_CLEARED',
          timestamp: Date.now()
        });
      }
    });
  }
  
  // Keep alive message
  if (event.data && event.data.type === 'KEEP_ALIVE') {
    console.log('[ServiceWorker] Received keep-alive ping');
    if (event.source) {
      event.source.postMessage({
        type: 'KEEP_ALIVE_RESPONSE',
        timestamp: lastActivityTimestamp
      });
    }
  }
  
  // Self-healing mechanism
  if (event.data && event.data.type === 'HEALTH_CHECK') {
    console.log('[ServiceWorker] Health check requested');
    
    // Perform self-diagnosis
    const healthStatus = {
      timestamp: Date.now(),
      cacheStatus: 'unknown',
      uptime: Date.now() - lastActivityTimestamp,
      isResponding: true
    };
    
    // Check if caches are working
    caches.keys().then(keys => {
      healthStatus.cacheStatus = keys.length > 0 ? 'ok' : 'empty';
      
      if (event.source) {
        event.source.postMessage({
          type: 'HEALTH_STATUS',
          status: healthStatus
        });
      }
    }).catch(error => {
      healthStatus.cacheStatus = 'error';
      console.error('[ServiceWorker] Cache health check failed:', error);
      
      if (event.source) {
        event.source.postMessage({
          type: 'HEALTH_STATUS',
          status: healthStatus,
          error: error.message
        });
      }
    });
  }
}); 