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
        .then((cache) => cache.addAll(PRECACHE_ASSETS)),
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

// Helper function to check if URL is cacheable
function isCacheableUrl(url) {
  try {
    const urlObj = new URL(url, self.location.href);
    // Only cache http/https URLs, exclude all other schemes
    const validSchemes = ['http:', 'https:'];
    if (!validSchemes.includes(urlObj.protocol)) {
      console.log('Skipping cache for non-HTTP URL:', urlObj.protocol, url);
      return false;
    }
    
    // Exclude browser extension URLs and other problematic URLs
    const blockedPrefixes = [
      'chrome-extension:', 
      'moz-extension:', 
      'ms-browser-extension:',
      'chrome:', 
      'edge:', 
      'brave:', 
      'file:'
    ];
    
    if (blockedPrefixes.some(prefix => url.startsWith(prefix))) {
      console.log('Skipping cache for extension URL:', url);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error checking if URL is cacheable:', err);
    return false;
  }
}

// Fetch event - improved caching strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests, browser-sync, and chrome-extension URLs
  if (event.request.method !== 'GET' || 
      event.request.url.includes('browser-sync') ||
      event.request.url.startsWith('chrome-extension:')) {
    return;
  }
  
  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }
  
  // CSS, JS, and critical assets - cache first with network update
  if (event.request.url.match(/\.(css|js|woff2|woff|ttf|svg|png|jpg|jpeg|gif|webp)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          const fetchPromise = fetch(event.request)
            .then(networkResponse => {
              if (networkResponse.ok) {
                // Clone and store in cache asynchronously but don't wait for it
                const clonedResponse = networkResponse.clone();
                // Only cache if URL is cacheable
                if (isCacheableUrl(event.request.url)) {
                  caches.open(STATIC_CACHE_NAME)
                    .then(cache => {
                      try {
                        cache.put(event.request, clonedResponse);
                      } catch (err) {
                        console.error('Error caching asset:', err);
                      }
                    })
                    .catch(err => console.error('Cache open error for asset:', err));
                }
              }
              return networkResponse;
            });
            
          return cachedResponse || fetchPromise;
        })
    );
    return;
  }
  
  // API requests - network first with timeout fallback to cache
  if (event.request.url.includes('/api/')) {
    const TIMEOUT = 3000;
    event.respondWith(
      Promise.race([
        fetch(event.request.clone())
          .then(response => {
            if (response.ok) {
              // Clone the response before using it
              const clonedResponse = response.clone();
              // Store response in cache asynchronously but don't wait for it
              // Only cache if URL is cacheable
              if (isCacheableUrl(event.request.url)) {
                caches.open(DYNAMIC_CACHE_NAME)
                  .then(cache => {
                    try {
                      cache.put(event.request, clonedResponse);
                    } catch (err) {
                      console.error('Error caching API response:', err);
                    }
                  })
                  .catch(err => console.error('Cache open error for API:', err));
              }
            }
            return response;
          }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), TIMEOUT)
        )
      ]).catch(() => caches.match(event.request))
    );
    return;
  }
  
  // All other requests - network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse.ok) {
          // Clone the response before using it
          const clonedResponse = networkResponse.clone();
          // Store response in cache asynchronously but don't wait for it
          // Only cache if URL is cacheable
          if (isCacheableUrl(event.request.url)) {
            caches.open(DYNAMIC_CACHE_NAME)
              .then(cache => {
                try {
                  cache.put(event.request, clonedResponse);
                } catch (err) {
                  console.error('Error caching response:', err);
                }
              })
              .catch(err => console.error('Cache open error:', err));
          }
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

// Global error handler for service worker
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.message, event.filename, event.lineno);
});

// Unhandled promise rejection handler
self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled promise rejection:', event.reason);
}); 