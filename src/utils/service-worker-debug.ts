/**
 * Service Worker Debug Utilities
 * Helper functions to debug and fix service worker issues
 */

export interface ServiceWorkerDebugInfo {
  hasServiceWorker: boolean;
  registrations: ServiceWorkerRegistration[];
  activeWorkers: string[];
  errors: string[];
  conflicts: string[];
}

export async function getServiceWorkerDebugInfo(): Promise<ServiceWorkerDebugInfo> {
  const errors: string[] = [];
  const conflicts: string[] = [];
  const activeWorkers: string[] = [];
  
  if (!('serviceWorker' in navigator)) {
    errors.push('Service Worker not supported');
    return {
      hasServiceWorker: false,
      registrations: [],
      activeWorkers,
      errors,
      conflicts
    };
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    // Check for multiple service workers that might conflict
    if (registrations.length > 2) {
      conflicts.push(`Multiple service workers detected: ${registrations.length}`);
    }

    // Check each registration
    for (const registration of registrations) {
      const scope = registration.scope;
      const scriptURL = registration.active?.scriptURL || 'unknown';
      
      activeWorkers.push(`${scriptURL} (scope: ${scope})`);
      
      // Check for potential conflicts
      if (scriptURL.includes('firebase-messaging-sw.js') && scriptURL.includes('service-worker.js')) {
        conflicts.push('Both Firebase and main service worker detected');
      }
      
      // Check registration state
      if (registration.waiting) {
        conflicts.push(`Service worker waiting to activate: ${scriptURL}`);
      }
      
      if (registration.installing) {
        conflicts.push(`Service worker installing: ${scriptURL}`);
      }
    }

    return {
      hasServiceWorker: true,
      registrations,
      activeWorkers,
      errors,
      conflicts
    };
  } catch (error) {
    errors.push(`Failed to get service worker info: ${error}`);
    return {
      hasServiceWorker: true,
      registrations: [],
      activeWorkers,
      errors,
      conflicts
    };
  }
}

export function logServiceWorkerDebugInfo(debugInfo: ServiceWorkerDebugInfo): void {
  console.group('🔧 Service Worker Debug Information');
  
  console.log('📊 Status:', {
    supported: debugInfo.hasServiceWorker,
    registrations: debugInfo.registrations.length,
    activeWorkers: debugInfo.activeWorkers.length
  });

  if (debugInfo.activeWorkers.length > 0) {
    console.log('🔄 Active Workers:', debugInfo.activeWorkers);
  }

  if (debugInfo.conflicts.length > 0) {
    console.warn('⚠️ Conflicts Found:', debugInfo.conflicts);
  }

  if (debugInfo.errors.length > 0) {
    console.error('❌ Errors Found:', debugInfo.errors);
  }

  console.groupEnd();
}

export async function fixServiceWorkerConflicts(): Promise<boolean> {
  try {
    console.log('🔧 Attempting to fix service worker conflicts...');
    
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    // If we have multiple registrations, unregister all except Firebase messaging
    if (registrations.length > 1) {
      for (const registration of registrations) {
        const scriptURL = registration.active?.scriptURL || '';
        
        // Keep Firebase messaging service worker, unregister others
        if (!scriptURL.includes('firebase-messaging-sw.js')) {
          console.log(`Unregistering service worker: ${scriptURL}`);
          await registration.unregister();
        }
      }
    }

    // Force update any remaining service workers
    const remainingRegistrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of remainingRegistrations) {
      try {
        await registration.update();
        console.log('Updated service worker:', registration.active?.scriptURL);
      } catch (error) {
        console.warn('Failed to update service worker:', error);
      }
    }

    console.log('✅ Service worker conflicts fixed');
    return true;
  } catch (error) {
    console.error('❌ Failed to fix service worker conflicts:', error);
    return false;
  }
}

export async function clearAllServiceWorkers(): Promise<boolean> {
  try {
    console.log('🧹 Clearing all service workers...');
    
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    for (const registration of registrations) {
      const scriptURL = registration.active?.scriptURL || 'unknown';
      console.log(`Unregistering: ${scriptURL}`);
      await registration.unregister();
    }

    console.log('✅ All service workers cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear service workers:', error);
    return false;
  }
}

export async function testServiceWorkerSetup(): Promise<boolean> {
  const debugInfo = await getServiceWorkerDebugInfo();
  logServiceWorkerDebugInfo(debugInfo);
  
  // Auto-fix conflicts if detected
  if (debugInfo.conflicts.length > 0) {
    console.log('🔧 Conflicts detected, attempting to fix...');
    await fixServiceWorkerConflicts();
    
    // Re-check after fix
    const newDebugInfo = await getServiceWorkerDebugInfo();
    logServiceWorkerDebugInfo(newDebugInfo);
    
    return newDebugInfo.conflicts.length === 0 && newDebugInfo.errors.length === 0;
  }
  
  return debugInfo.errors.length === 0;
}

// Expose debug functions to window for manual testing
if (typeof window !== 'undefined') {
  (window as any).swDebug = {
    getServiceWorkerDebugInfo,
    logServiceWorkerDebugInfo,
    fixServiceWorkerConflicts,
    clearAllServiceWorkers,
    testServiceWorkerSetup
  };
}

// Auto-run debug in development
if (import.meta.env.DEV) {
  setTimeout(() => {
    testServiceWorkerSetup().then(success => {
      if (!success) {
        console.warn('⚠️ Service worker issues detected. Use window.swDebug.testServiceWorkerSetup() to debug.');
      }
    });
  }, 3000);
}
