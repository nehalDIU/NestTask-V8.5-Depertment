// Define WindowClient and Client interfaces if not available in TypeScript env
// These type definitions match the standard Web API interfaces
interface WindowClient {
  focused: boolean;
  visibilityState: string;
  url: string;
  focus(): Promise<WindowClient>;
  navigate(url: string): Promise<WindowClient>;
  postMessage(message: any): void;
}

interface Client {
  id: string;
  type: string;
  url: string;
  postMessage(message: any): void;
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { registerRoute, NavigationRoute, Route } from 'workbox-routing';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { CacheFirst, NetworkFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { ExpirationPlugin } from 'workbox-expiration';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { warmStrategyCache } from 'workbox-recipes';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { BackgroundSyncPlugin } from 'workbox-background-sync';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Queue } from 'workbox-background-sync';

// Cache names - use shorter names to save bytes
const CACHE_NAME = 'nt-app-v4';
const STATIC_CACHE = 'nt-static-v4';
const IMG_CACHE = 'nt-img-v4';
const API_CACHE = 'nt-api-v4';
const FONT_CACHE = 'nt-font-v4';
const METADATA_CACHE = 'nt-meta-v4';
const OFFLINE_URL = '/offline.html';

// Track service worker activity
let lastActivityTime = Date.now();

// Clean up outdated caches
cleanupOutdatedCaches();

// Precache only critical assets
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
precacheAndRoute(self.__WB_MANIFEST);

// Define minimal URLs to preload/warm up cache - only essential UI assets
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/offline.html'
];

// Routes that should never be cached
const NEVER_CACHE_ROUTES = [
  '/auth',
  '/login',
  '/signup',
  '/reset-password'
];

// Add a utility function to safely check if a URL can be cached
function isValidCacheURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const validProtocols = ['http:', 'https:'];
    if (!validProtocols.includes(urlObj.protocol)) {
      return false;
    }
    
    // Skip Supabase API requests
    if (urlObj.hostname.includes('supabase.co')) {
      return false;
    }
    
    // Skip Vercel Analytics
    if (urlObj.pathname.includes('_vercel/insights')) {
      return false;
    }
    
    // Check if the URL is a never-cache route
    const isNeverCacheRoute = NEVER_CACHE_ROUTES.some(route => 
      urlObj.pathname === route || urlObj.pathname.startsWith(`${route}/`)
    );
    
    if (isNeverCacheRoute) {
      return false;
    }
    
    return true;
  } catch (e) {
    return false;
  }
}

// Update activity timestamp for service worker
function updateActivityTimestamp() {
  lastActivityTime = Date.now();
  // Store the timestamp in cache to persist across service worker restarts
  if ('caches' in self) {
    caches.open(METADATA_CACHE).then(cache => {
      cache.put('lastActivityTime', new Response(JSON.stringify({ timestamp: lastActivityTime })));
    }).catch(() => {
      // Silent fail for non-critical operation
    });
  }
}

// Check if the service worker has been inactive for too long
async function checkServiceWorkerInactivity() {
  try {
    if ('caches' in self) {
      const cache = await caches.open(METADATA_CACHE);
      const response = await cache.match('lastActivityTime');
      
      if (response) {
        const data = await response.json();
        const inactiveTime = Date.now() - data.timestamp;
        
        // If inactive for more than 45 minutes, update to keep alive
        if (inactiveTime > 45 * 60 * 1000) {
          updateActivityTimestamp();
        }
      }
    }
  } catch (e) {
    // Silent fail for non-critical operation
  }
}

// Cache critical static assets with a Cache First strategy
const staticAssetsStrategy = new CacheFirst({
  cacheName: STATIC_CACHE,
  plugins: [
    new CacheableResponsePlugin({
      statuses: [0, 200],
    }),
    new ExpirationPlugin({
      maxEntries: 30, // Reduced from 100
      maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days (increased from 1 day)
      purgeOnQuotaError: true
    }),
  ],
});

// Warm up the cache with critical assets
warmStrategyCache({
  urls: STATIC_ASSETS,
  strategy: staticAssetsStrategy
});

// Cache images with a Cache First strategy - only essential UI images
registerRoute(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ request, url }: { request: any, url: any }) => {
    if (!isValidCacheURL(url.href)) {
      return false;
    }
    // Only cache essential UI images
    return request.destination === 'image' && 
           (url.pathname.includes('/icons/') || 
            url.pathname.includes('/images/ui/'));
  },
  new CacheFirst({
    cacheName: IMG_CACHE,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20, // Reduced from 50
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days (increased from 1 day)
        purgeOnQuotaError: true
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Cache CSS and JavaScript with a StaleWhileRevalidate strategy for better performance
registerRoute(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ request, url }: { request: any, url: any }) => {
    if (!isValidCacheURL(url.href)) {
      return false;
    }
    return request.destination === 'script' ||
           request.destination === 'style';
  },
  new StaleWhileRevalidate({
    cacheName: STATIC_CACHE,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 25, // Reduced from 50
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days (increased from 1 day)
        purgeOnQuotaError: true
      }),
    ],
  })
);

// Optimized caching for fonts with longer expiration
registerRoute(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ request, url }: { request: any, url: any }) => {
    if (!isValidCacheURL(url.href)) {
      return false;
    }
    return request.destination === 'font' || 
           url.origin.includes('fonts.googleapis.com') ||
           url.origin.includes('fonts.gstatic.com');
  },
  new CacheFirst({
    cacheName: FONT_CACHE,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        purgeOnQuotaError: true
      }),
    ],
  })
);

// Use a more memory-efficient message handler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
self.addEventListener('message', (event: any) => {
  const messageData = event.data;
  
  if (!messageData || !messageData.type) return;
  
  // Minimal message handling to reduce overhead
  switch (messageData.type) {
    case 'SKIP_WAITING':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (self as any).skipWaiting();
      break;
      
    case 'KEEP_ALIVE':
      updateActivityTimestamp();
      // Only send response if ports are available
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          type: 'KEEP_ALIVE_RESPONSE',
          timestamp: Date.now()
        });
      }
      break;
      
    case 'HEALTH_CHECK':
      // Respond with health status
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          type: 'HEALTH_STATUS',
          status: {
            isResponding: true,
            timestamp: Date.now(),
            lastActivity: lastActivityTime
          }
        });
      }
      break;
      
    case 'CLEAR_CACHE':
      // Clear all caches except the metadata cache
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.filter(cacheName => cacheName !== METADATA_CACHE)
            .map(cacheName => caches.delete(cacheName))
        );
      });
      break;
  }
});

// Efficient fetch event handler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
self.addEventListener('fetch', (event: any) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip requests that should never be cached
  if (!isValidCacheURL(request.url)) return;
  
  // Keep service worker alive
  updateActivityTimestamp();
  
  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(OFFLINE_URL) || caches.match('/');
      })
    );
    return;
  }
  
  // Let the browser handle everything else with default network behavior
});

// Optimized activate handler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
self.addEventListener('activate', (event: any) => {
  // Claim clients immediately
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (event as any).waitUntil((self as any).clients.claim());
  
  // Check service worker inactivity status
  checkServiceWorkerInactivity();
  
  // Clean up old caches
  const currentCaches = [
    CACHE_NAME,
    STATIC_CACHE,
    IMG_CACHE,
    API_CACHE,
    FONT_CACHE,
    METADATA_CACHE
  ];
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (event as any).waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!currentCaches.includes(cacheName)) {
            return caches.delete(cacheName);
          }
          return null;
        }).filter(Boolean)
      );
    })
  );
});

// Set up a periodic task to keep the service worker alive
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(self as any).addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'keep-alive') {
    updateActivityTimestamp();
  }
});

// Self-healing mechanism
setInterval(() => {
  checkServiceWorkerInactivity();
}, 60 * 60 * 1000); // Check once per hour