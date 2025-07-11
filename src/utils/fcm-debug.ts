/**
 * FCM Debug Utilities
 * Helper functions to debug Firebase Cloud Messaging issues in production
 */

export interface FCMDebugInfo {
  isSecureContext: boolean;
  hasServiceWorker: boolean;
  hasNotificationAPI: boolean;
  notificationPermission: NotificationPermission;
  firebaseConfigured: boolean;
  vapidKeyConfigured: boolean;
  serviceWorkerRegistered: boolean;
  fcmTokenGenerated: boolean;
  currentUrl: string;
  userAgent: string;
  errors: string[];
}

export async function getFCMDebugInfo(): Promise<FCMDebugInfo> {
  const errors: string[] = [];
  
  // Check secure context
  const isSecureContext = window.location.protocol === 'https:' || 
                         window.location.hostname === 'localhost' ||
                         window.location.hostname === '127.0.0.1';
  
  if (!isSecureContext) {
    errors.push('Not in secure context (HTTPS required for FCM in production)');
  }

  // Check Service Worker support
  const hasServiceWorker = 'serviceWorker' in navigator;
  if (!hasServiceWorker) {
    errors.push('Service Worker not supported');
  }

  // Check Notification API
  const hasNotificationAPI = 'Notification' in window;
  if (!hasNotificationAPI) {
    errors.push('Notification API not supported');
  }

  // Check notification permission
  const notificationPermission = hasNotificationAPI ? Notification.permission : 'denied';
  if (notificationPermission !== 'granted') {
    errors.push(`Notification permission: ${notificationPermission}`);
  }

  // Check Firebase configuration
  const firebaseConfigured = !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID &&
    import.meta.env.VITE_FIREBASE_APP_ID
  );
  
  if (!firebaseConfigured) {
    errors.push('Firebase configuration incomplete');
  }

  // Check VAPID key
  const vapidKeyConfigured = !!import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKeyConfigured) {
    errors.push('VAPID key not configured');
  }

  // Check service worker registration
  let serviceWorkerRegistered = false;
  if (hasServiceWorker) {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      serviceWorkerRegistered = !!registration;
      if (!serviceWorkerRegistered) {
        errors.push('Firebase messaging service worker not registered');
      }
    } catch (error) {
      errors.push(`Service worker check failed: ${error}`);
    }
  }

  // Check FCM token generation (simplified check)
  let fcmTokenGenerated = false;
  try {
    // We can't actually generate a token here without initializing Firebase
    // This is just a placeholder for the check
    fcmTokenGenerated = firebaseConfigured && vapidKeyConfigured && serviceWorkerRegistered && isSecureContext;
  } catch (error) {
    errors.push(`FCM token check failed: ${error}`);
  }

  return {
    isSecureContext,
    hasServiceWorker,
    hasNotificationAPI,
    notificationPermission,
    firebaseConfigured,
    vapidKeyConfigured,
    serviceWorkerRegistered,
    fcmTokenGenerated,
    currentUrl: window.location.href,
    userAgent: navigator.userAgent,
    errors
  };
}

export function logFCMDebugInfo(debugInfo: FCMDebugInfo): void {
  console.group('🔍 FCM Debug Information');
  
  console.log('📍 Environment:', {
    url: debugInfo.currentUrl,
    secure: debugInfo.isSecureContext,
    userAgent: debugInfo.userAgent.substring(0, 100) + '...'
  });

  console.log('🔧 Browser Support:', {
    serviceWorker: debugInfo.hasServiceWorker,
    notifications: debugInfo.hasNotificationAPI,
    permission: debugInfo.notificationPermission
  });

  console.log('⚙️ Firebase Configuration:', {
    configured: debugInfo.firebaseConfigured,
    vapidKey: debugInfo.vapidKeyConfigured,
    serviceWorkerRegistered: debugInfo.serviceWorkerRegistered
  });

  if (debugInfo.errors.length > 0) {
    console.error('❌ Issues Found:', debugInfo.errors);
  } else {
    console.log('✅ All checks passed');
  }

  console.groupEnd();
}

export async function testFCMSetup(): Promise<boolean> {
  const debugInfo = await getFCMDebugInfo();
  logFCMDebugInfo(debugInfo);
  
  return debugInfo.errors.length === 0;
}

// Auto-run debug in development
if (import.meta.env.DEV) {
  // Run debug check after a short delay to ensure everything is loaded
  setTimeout(() => {
    testFCMSetup().then(success => {
      if (!success) {
        console.warn('⚠️ FCM setup issues detected. Check the debug information above.');
      }
    });
  }, 2000);
}

// Expose debug functions to window for manual testing in production
if (typeof window !== 'undefined') {
  (window as any).fcmDebug = {
    getFCMDebugInfo,
    logFCMDebugInfo,
    testFCMSetup
  };
}
