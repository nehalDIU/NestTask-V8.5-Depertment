/**
 * Simple PWA utilities for service worker management
 */

// Initialize PWA features
export function initPWA(): void {
  // Skip if service workers aren't supported
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers not supported');
    return;
  }

  // Register or update the service worker
  registerServiceWorker();
  
  // Set up checks for service worker health
  setupHealthChecks();
  
  // Listen for page visibility changes to refresh on return
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshServiceWorker();
    }
  });
}

// Register the service worker
function registerServiceWorker(): void {
  navigator.serviceWorker.register('/service-worker.js', {
    updateViaCache: 'none' // Never use cached service worker
  }).then(registration => {
    console.log('Service Worker registered successfully:', registration.scope);
    
    // Check for updates right away
    registration.update().catch(err => {
      console.error('Service Worker update check failed:', err);
    });
  }).catch(error => {
    console.error('Service Worker registration failed:', error);
  });
}

// Refresh service worker
function refreshServiceWorker(): void {
  if (!navigator.serviceWorker) return;
  
  navigator.serviceWorker.getRegistration().then(registration => {
    if (registration) {
      // Check when we last refreshed to prevent excessive updates
      const lastRefresh = localStorage.getItem('sw_last_refresh');
      const now = Date.now();
      
      // Only refresh every 5 minutes at most
      if (!lastRefresh || (now - parseInt(lastRefresh)) > 5 * 60 * 1000) {
        console.log('Refreshing service worker');
        registration.update().catch(console.error);
        localStorage.setItem('sw_last_refresh', now.toString());
      }
    }
  }).catch(console.error);
}

// Send message to service worker
function sendServiceWorkerMessage(message: any): void {
  if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return;
  
  navigator.serviceWorker.controller.postMessage(message);
}

// Set up periodic health checks
function setupHealthChecks(): void {
  // Keep service worker alive with periodic messages
  setInterval(() => {
    sendServiceWorkerMessage({
      type: 'KEEP_ALIVE',
      timestamp: Date.now()
    });
  }, 30000); // Every 30 seconds
  
  // Clean caches if needed after returning from long absence
  const lastUse = localStorage.getItem('app_last_use');
  const now = Date.now();
  
  if (lastUse && (now - parseInt(lastUse)) > 24 * 60 * 60 * 1000) {
    console.log('Clearing caches after long absence');
    sendServiceWorkerMessage({
      type: 'CLEAR_ALL_CACHES',
      timestamp: now
    });
  }
  
  // Update last use timestamp
  localStorage.setItem('app_last_use', now.toString());
} 