// NestTask Service Worker
const CACHE_NAME = 'nesttask-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - precache critical assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching offline page');
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
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
    .then(() => {
      console.log('[ServiceWorker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Simplified fetch event with offline fallback
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests and Vercel analytics requests
  if (!event.request.url.startsWith(self.location.origin) || 
      event.request.url.includes('_vercel/insights')) {
    return;
  }
  
  // Network first strategy for navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.open(CACHE_NAME)
            .then((cache) => {
              return cache.match(OFFLINE_URL);
            });
        })
    );
    return;
  }
  
  // Cache first, falling back to network for other requests
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request)
          .then((response) => {
            // Cache important assets
            if (response.status === 200 &&
                (event.request.url.endsWith('.js') || 
                 event.request.url.endsWith('.css') ||
                 event.request.url.endsWith('.png') ||
                 event.request.url.endsWith('.jpg') ||
                 event.request.url.endsWith('.svg'))) {
              
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return response;
          });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
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
}); 