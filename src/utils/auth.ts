// Auth utilities for handling auth-related functions across the app

import { supabase } from '../lib/supabase';

/**
 * Forces a clean reload of the application after login
 * This helps ensure PWA cache is refreshed for authenticated views
 */
export function forceCleanReload(): void {
  // Check if we're on a super admin page
  const isSuperAdmin = window.location.pathname.includes('super-admin') || 
                       sessionStorage.getItem('is_super_admin') === 'true' ||
                       localStorage.getItem('is_super_admin') === 'true';
  
  console.log('Force clean reload called, isSuperAdmin:', isSuperAdmin);
  
  // For super admin, don't reload or clear caches - instead just preserve the state
  if (isSuperAdmin) {
    console.log('Super admin detected - preserving state without reload');
    
    // Just notify service worker to preserve admin caches
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'PRESERVE_ADMIN_CACHES',
        timestamp: Date.now()
      });
    }
    
    return; // Don't reload the page
  }
  
  // For other users, perform normal cache clearing
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        if (cacheName.includes('nesttask')) {
          console.log(`Clearing cache: ${cacheName}`);
          caches.delete(cacheName)
            .then(deleted => console.log(`Cache deleted: ${deleted}`));
        }
      });
    });
  }
  
  // Notify service worker to clear caches
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_ALL_CACHES',
      timestamp: Date.now()
    });
    
    // Listen for response from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'CACHES_CLEARED') {
        console.log('Service worker cleared caches, reloading page');
        window.location.reload();
      }
    }, { once: true }); // Only listen once
    
    // Fallback reload in case service worker doesn't respond
    setTimeout(() => {
      console.log('Forcing page reload after timeout');
      window.location.reload();
    }, 1000);
  } else {
    // If no service worker, just reload the page
    window.location.reload();
  }
}

/**
 * Updates the authentication status in the service worker
 * for proper caching behavior
 */
export function updateAuthStatus(isLoggedIn: boolean): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'AUTH_STATE_CHANGED',
      event: isLoggedIn ? 'SIGNED_IN' : 'SIGNED_OUT',
      timestamp: Date.now()
    });
  }
} 