// NestTask Service Worker
const CACHE_NAME = 'nesttask-v3';
const STATIC_CACHE_NAME = 'nesttask-static-v3';
const DYNAMIC_CACHE_NAME = 'nesttask-dynamic-v3';
const OFFLINE_URL = '/offline.html';

// Critical assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Last activity timestamp to track service worker lifespan
let lastActivityTimestamp = Date.now();

// Update the timestamp periodically to prevent service worker termination
setInterval(() => {
  lastActivityTimestamp = Date.now();
}, 30000); // Every 30 seconds

// Install event - precache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME)
        .then((cache) => cache.addAll(PRECACHE_ASSETS))
        .catch(err => console.error('Cache pre-installation error:', err)),
      self.skipWaiting()
    ])
  );
});

// Activate event - cleanup old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keyList) => {
        return Promise.all(keyList.map((key) => {
          if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
            return caches.delete(key);
          }
        }));
      }),
      self.clients.claim()
    ])
  );
});

// Fetch event - improved caching strategy with better error handling
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and browser-sync
  if (event.request.method !== 'GET' || 
      event.request.url.includes('browser-sync')) {
    return;
  }
  
  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/offline.html')
          .catch(() => new Response('Offline page not available', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          }))
        )
    );
    return;
  }
  
  // CSS, JS, and critical assets - cache first with network update
  if (event.request.url.match(/\.(css|js|woff2|woff|ttf|svg|png|jpg|jpeg|gif|webp)$/)) {
    event.respondWith(
      (async () => {
        try {
          // Try cache first
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            // Update cache in background
            fetch(event.request)
              .then(networkResponse => {
                if (networkResponse && networkResponse.ok) {
                  const responseToCache = networkResponse.clone();
                  caches.open(STATIC_CACHE_NAME)
                    .then(cache => cache.put(event.request, responseToCache))
                    .catch(err => console.error('Static cache update error:', err));
                }
              })
              .catch(err => console.error('Background fetch error:', err));
            
            return cachedResponse;
          }

          // If not in cache, get from network
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.ok) {
            // Clone before using
            const responseToCache = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME)
              .then(cache => cache.put(event.request, responseToCache))
              .catch(err => console.error('Cache update error:', err));
          }
          return networkResponse;
        } catch (error) {
          console.error('Asset fetch error:', error, event.request.url);
          // For 404 errors on static assets, return empty response with correct content type
          const contentType = getContentTypeFromUrl(event.request.url);
          return new Response('', {
            status: 404,
            headers: { 'Content-Type': contentType }
          });
        }
      })()
    );
    return;
  }
  
  // API requests - network first with timeout fallback to cache
  if (event.request.url.includes('/api/')) {
    const TIMEOUT = 3000;
    event.respondWith(
      (async () => {
        try {
          // Race between fetch and timeout
          const response = await Promise.race([
            fetch(event.request.clone()),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('timeout')), TIMEOUT)
            )
          ]);
          
          // If response is ok, cache it
          if (response && response.ok) {
            const clonedResponse = response.clone();
            caches.open(DYNAMIC_CACHE_NAME)
              .then(cache => cache.put(event.request, clonedResponse))
              .catch(err => console.error('API cache error:', err));
          }
          
          return response;
        } catch (error) {
          console.error('API fetch error:', error);
          // Try to get from cache
          try {
            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) return cachedResponse;
          } catch (cacheError) {
            console.error('Cache match error:', cacheError);
          }
          
          // Return appropriate error response
          return new Response(JSON.stringify({error: 'Network error'}), {
            status: 503,
            headers: {'Content-Type': 'application/json'}
          });
        }
      })()
    );
    return;
  }
  
  // All other requests - network first with cache fallback
  event.respondWith(
    (async () => {
      try {
        // Try network first
        const networkResponse = await fetch(event.request);
        
        // If response is ok, clone it before using
        if (networkResponse && networkResponse.ok) {
          const clonedResponse = networkResponse.clone();
          // Use a separate promise chain for caching to avoid blocking the response
          caches.open(DYNAMIC_CACHE_NAME)
            .then(cache => cache.put(event.request, clonedResponse))
            .catch(err => console.error('Dynamic cache error:', err));
        }
        
        return networkResponse;
      } catch (error) {
        console.error('Fetch error:', error);
        
        // Try to get from cache
        try {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
        } catch (cacheError) {
          console.error('Cache match error:', cacheError);
        }
        
        // For 404 errors, return appropriate response based on requested content type
        const contentType = event.request.headers.get('Accept')?.includes('application/json') 
          ? 'application/json' 
          : 'text/plain';
          
        return new Response(
          contentType === 'application/json' 
            ? JSON.stringify({error: 'Resource not available'}) 
            : 'Resource not available', 
          {
            status: 404,
            headers: {'Content-Type': contentType}
          }
        );
      }
    })()
  );
});

// Helper function to determine content type from URL
function getContentTypeFromUrl(url) {
  if (url.match(/\.js$/)) return 'application/javascript';
  if (url.match(/\.css$/)) return 'text/css';
  if (url.match(/\.(jpg|jpeg)$/)) return 'image/jpeg';
  if (url.match(/\.png$/)) return 'image/png';
  if (url.match(/\.gif$/)) return 'image/gif';
  if (url.match(/\.webp$/)) return 'image/webp';
  if (url.match(/\.svg$/)) return 'image/svg+xml';
  if (url.match(/\.(woff|woff2)$/)) return 'font/woff2';
  if (url.match(/\.ttf$/)) return 'font/ttf';
  return 'text/plain';
}

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