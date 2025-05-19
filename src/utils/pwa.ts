/**
 * Utility functions for handling PWA integration
 */

// Check if we're running in StackBlitz
const isStackBlitz = Boolean(
  typeof window !== 'undefined' && 
  (window.location.hostname.includes('stackblitz.io') || 
   window.location.hostname.includes('.webcontainer.io'))
);

// Service worker metadata in sessionStorage for persistence across page reloads
const SW_METADATA_KEY = 'sw_metadata';

// Track service worker registration state
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

// Store of service worker metadata
interface ServiceWorkerMetadata {
  lastPing: number;
  lastResponse: number;
  status: 'active' | 'inactive' | 'errored';
  errors: string[];
  reinstallCount: number;
  lastReinstall: number | null;
}

// Initialize or get service worker metadata
function getServiceWorkerMetadata(): ServiceWorkerMetadata {
  try {
    const metadataStr = sessionStorage.getItem(SW_METADATA_KEY);
    if (metadataStr) {
      return JSON.parse(metadataStr);
    }
  } catch (e) {
    console.error('Error parsing service worker metadata:', e);
  }
  
  // Default metadata
  return {
    lastPing: 0,
    lastResponse: 0,
    status: 'inactive',
    errors: [],
    reinstallCount: 0,
    lastReinstall: null
  };
}

// Save service worker metadata
function saveServiceWorkerMetadata(metadata: ServiceWorkerMetadata): void {
  try {
    sessionStorage.setItem(SW_METADATA_KEY, JSON.stringify(metadata));
  } catch (e) {
    console.error('Error saving service worker metadata:', e);
  }
}

// Check if we're running in StackBlitz
function isStackBlitzEnvironment(): boolean {
  return isStackBlitz;
}

// Check if the app can be installed
export function checkInstallability() {
  if (isStackBlitzEnvironment()) {
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
  if (isStackBlitzEnvironment()) {
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

// Keep alive ping to service worker
async function pingServiceWorker(): Promise<boolean> {
  if (!serviceWorkerRegistration || !navigator.serviceWorker.controller) {
    return false;
  }
  
  try {
    // Get metadata
    const metadata = getServiceWorkerMetadata();
    
    // Record ping time
    metadata.lastPing = Date.now();
    saveServiceWorkerMetadata(metadata);
    
    // Create a MessageChannel for two-way communication
    const messageChannel = new MessageChannel();
    
    // Create a promise that resolves when we get a response
    const responsePromise = new Promise<boolean>((resolve) => {
      const timeoutId = setTimeout(() => {
        // Timeout after 3 seconds
        messageChannel.port1.onmessage = null;
        resolve(false);
        
        // Record timeout in metadata
        const updatedMetadata = getServiceWorkerMetadata();
        updatedMetadata.errors.push(`Ping timeout at ${new Date().toISOString()}`);
        if (updatedMetadata.errors.length > 10) {
          updatedMetadata.errors = updatedMetadata.errors.slice(-10);
        }
        updatedMetadata.status = 'errored';
        saveServiceWorkerMetadata(updatedMetadata);
      }, 3000);
      
      // Listen for the response
      messageChannel.port1.onmessage = (event) => {
        clearTimeout(timeoutId);
        
        if (event.data && event.data.type === 'KEEP_ALIVE_RESPONSE') {
          // Record successful response in metadata
          const updatedMetadata = getServiceWorkerMetadata();
          updatedMetadata.lastResponse = Date.now();
          updatedMetadata.status = 'active';
          saveServiceWorkerMetadata(updatedMetadata);
          
          resolve(true);
        } else {
          resolve(false);
        }
      };
    });
    
    // Send the message
    navigator.serviceWorker.controller.postMessage({
      type: 'KEEP_ALIVE',
      timestamp: Date.now()
    }, [messageChannel.port2]);
    
    return responsePromise;
  } catch (e) {
    console.error('Error pinging service worker:', e);
    return false;
  }
}

// Check service worker health
async function checkServiceWorkerHealth(): Promise<boolean> {
  if (!serviceWorkerRegistration || !navigator.serviceWorker.controller) {
    return false;
  }
  
  try {
    // Create a MessageChannel for two-way communication
    const messageChannel = new MessageChannel();
    
    // Create a promise that resolves when we get a response
    const responsePromise = new Promise<boolean>((resolve) => {
      const timeoutId = setTimeout(() => {
        messageChannel.port1.onmessage = null;
        resolve(false);
      }, 3000);
      
      // Listen for the response
      messageChannel.port1.onmessage = (event) => {
        clearTimeout(timeoutId);
        
        if (event.data && event.data.type === 'HEALTH_STATUS') {
          console.log('[PWA] Service worker health status:', event.data.status);
          resolve(event.data.status.isResponding);
        } else {
          resolve(false);
        }
      };
    });
    
    // Send the message
    navigator.serviceWorker.controller.postMessage({
      type: 'HEALTH_CHECK',
      timestamp: Date.now()
    }, [messageChannel.port2]);
    
    return responsePromise;
  } catch (e) {
    console.error('Error checking service worker health:', e);
    return false;
  }
}

// Setup regular keep-alive pings to prevent service worker termination
function setupKeepAlive() {
  if (isStackBlitzEnvironment()) return;
  
  // Ping every 30 seconds to keep the service worker alive
  const pingInterval = setInterval(async () => {
    const pingSuccessful = await pingServiceWorker();
    
    if (!pingSuccessful) {
      console.warn('[PWA] Service worker ping failed, checking health...');
      
      // If ping fails, check health and potentially reinstall
      const isHealthy = await checkServiceWorkerHealth();
      if (!isHealthy) {
        console.warn('[PWA] Service worker health check failed, attempting repair...');
        
        // Get metadata to check reinstall history
        const metadata = getServiceWorkerMetadata();
        const now = Date.now();
        
        // Limit reinstalls to prevent infinite loops (max 3 times in 30 minutes)
        const thirtyMinutesAgo = now - (30 * 60 * 1000);
        if (metadata.reinstallCount < 3 || metadata.lastReinstall === null || metadata.lastReinstall < thirtyMinutesAgo) {
          metadata.reinstallCount = metadata.lastReinstall && metadata.lastReinstall > thirtyMinutesAgo 
            ? metadata.reinstallCount + 1 
            : 1;
          metadata.lastReinstall = now;
          saveServiceWorkerMetadata(metadata);
          
          // Reinstall service worker
          await reinstallServiceWorker();
        } else {
          console.error('[PWA] Too many service worker reinstalls, giving up for now');
          metadata.errors.push(`Too many reinstalls at ${new Date().toISOString()}`);
          if (metadata.errors.length > 10) {
            metadata.errors = metadata.errors.slice(-10);
          }
          saveServiceWorkerMetadata(metadata);
        }
      }
    }
  }, 30000); // Every 30 seconds
  
  // Clean up interval when page unloads
  window.addEventListener('beforeunload', () => {
    clearInterval(pingInterval);
  });
}

// Attempt to reinstall the service worker
async function reinstallServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (isStackBlitzEnvironment()) {
    return null;
  }
  
  try {
    // Unregister existing service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
    
    // Clear caches to ensure a clean slate
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map(key => caches.delete(key)));
    
    // Register a new service worker
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
      updateViaCache: 'none'
    });
    
    serviceWorkerRegistration = registration;
    setupUpdateHandler(registration);
    
    console.log('[PWA] Service worker reinstalled successfully');
    return registration;
  } catch (error) {
    console.error('[PWA] Service worker reinstallation failed:', error);
    return null;
  }
}

// Register service worker for offline support
export async function registerServiceWorker() {
  // Early return if in StackBlitz
  if (isStackBlitzEnvironment()) {
    console.log('Service Worker registration skipped - running in StackBlitz environment');
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers not supported');
    return null;
  }
  
  if (serviceWorkerRegistration) return serviceWorkerRegistration;
  
  try {
    // Check for existing service worker registrations
    const registrations = await navigator.serviceWorker.getRegistrations();
    const existingRegistration = registrations.find(reg => 
      reg.active && reg.scope.includes(window.location.origin)
    );
    
    if (existingRegistration) {
      serviceWorkerRegistration = existingRegistration;
      setupUpdateHandler(existingRegistration);
      
      // Setup keep-alive pings
      setupKeepAlive();
      
      return existingRegistration;
    }
    
    // Register with timeout to avoid hanging
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
    
    // Initialize metadata
    const metadata = getServiceWorkerMetadata();
    metadata.status = 'active';
    saveServiceWorkerMetadata(metadata);
    
    // Setup keep-alive pings
    setupKeepAlive();
    
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

// Handle service worker updates
function setupUpdateHandler(registration: ServiceWorkerRegistration) {
  if (isStackBlitzEnvironment()) return;

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
  if (isStackBlitzEnvironment()) {
    console.log('PWA features disabled in StackBlitz environment');
    return false;
  }

  try {
    // First check connectivity - if offline for long time, may need recovery
    if (navigator.onLine) {
      // Check if we've been offline for a long time
      const lastOnline = localStorage.getItem('lastOnlineTimestamp');
      const now = Date.now().toString();
      
      // Store current timestamp
      localStorage.setItem('lastOnlineTimestamp', now);
      
      if (lastOnline) {
        const timeSinceLastOnline = Date.now() - parseInt(lastOnline, 10);
        const oneHour = 60 * 60 * 1000;
        
        // If offline for more than an hour, do cleanup
        if (timeSinceLastOnline > oneHour) {
          console.log('[PWA] Returning online after extended offline period, cleaning up...');
          
          // Clear caches to avoid stale data
          if ('caches' in window) {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map(key => caches.delete(key)));
          }
          
          // Force service worker reinstall
          await reinstallServiceWorker();
        }
      }
    }
    
    // Initialize PWA features
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