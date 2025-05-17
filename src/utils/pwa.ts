/**
 * Utility functions for handling PWA integration
 */

// Check if we're running in StackBlitz
const isStackBlitz = Boolean(
  typeof window !== 'undefined' && 
  (window.location.hostname.includes('stackblitz.io') || 
   window.location.hostname.includes('.webcontainer.io'))
);

// Check if the app can be installed
export function checkInstallability() {
  if (isStackBlitz) {
    console.log('Installation not supported in StackBlitz environment');
    return;
  }

  if ('BeforeInstallPromptEvent' in window) {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
    });
  }
}

// Request to install the PWA
export async function installPWA() {
  if (isStackBlitz) {
    console.log('Installation not supported in StackBlitz environment');
    return false;
  }

  const deferredPrompt = (window as any).deferredPrompt;
  if (!deferredPrompt) return false;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  (window as any).deferredPrompt = null;
  return outcome === 'accepted';
}

// Track service worker registration state
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

// Register service worker for offline support
export async function registerServiceWorker() {
  // Early return if in StackBlitz
  if (isStackBlitz) {
    console.log('Service Worker registration skipped - running in StackBlitz environment');
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers not supported');
    return null;
  }
  
  if (serviceWorkerRegistration) return serviceWorkerRegistration;
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const existingRegistration = registrations.find(reg => 
      reg.active && reg.scope.includes(window.location.origin)
    );
    
    if (existingRegistration) {
      serviceWorkerRegistration = existingRegistration;
      setupUpdateHandler(existingRegistration);
      return existingRegistration;
    }
    
    const registration = await Promise.race([
      navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none',
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
    ]) as ServiceWorkerRegistration | null;
    
    if (!registration) {
      console.warn('Service Worker registration timed out');
      return null;
    }
    
    serviceWorkerRegistration = registration;
    setupUpdateHandler(registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

// Handle service worker updates
function setupUpdateHandler(registration: ServiceWorkerRegistration) {
  if (isStackBlitz) return;

  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (newWorker) {
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('sw-update-available'));
        }
      });
    }
  });
}

// Initialize PWA features
export async function initPWA() {
  if (isStackBlitz) {
    console.log('PWA features disabled in StackBlitz environment');
    return false;
  }

  try {
    await Promise.allSettled([
      Promise.resolve().then(checkInstallability),
      Promise.resolve().then(registerServiceWorker)
    ]);
    return true;
  } catch (error) {
    console.error('Error during PWA initialization:', error);
    return false;
  }
}