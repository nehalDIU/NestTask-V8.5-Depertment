// FCM Troubleshooting utilities
// This file helps debug FCM-specific issues

export interface FCMDiagnostics {
  environment: {
    isProduction: boolean;
    isHTTPS: boolean;
    hostname: string;
  };
  browserSupport: {
    serviceWorker: boolean;
    notifications: boolean;
    pushManager: boolean;
    notificationPermission: NotificationPermission;
  };
  firebaseConfig: {
    apiKey: string | undefined;
    authDomain: string | undefined;
    projectId: string | undefined;
    vapidKey: string | undefined;
    vapidKeyLength: number;
    vapidKeyValid: boolean;
  };
  serviceWorker: {
    registered: boolean;
    active: boolean;
    scriptURL: string | null;
    scope: string | null;
  };
  errors: string[];
  recommendations: string[];
}

// Validate VAPID key format
const validateVapidKey = (key: string): boolean => {
  if (!key || typeof key !== 'string') return false;
  
  // VAPID keys should start with 'B' and be 87-88 characters long (base64url encoded)
  const isValidLength = key.length >= 87 && key.length <= 88;
  const startsWithB = key.startsWith('B');
  
  // Should contain only valid base64url characters
  const base64urlPattern = /^[A-Za-z0-9_-]+$/;
  const hasValidChars = base64urlPattern.test(key);
  
  return startsWithB && isValidLength && hasValidChars;
};

// Run comprehensive FCM diagnostics
export const runFCMDiagnostics = async (): Promise<FCMDiagnostics> => {
  const errors: string[] = [];
  const recommendations: string[] = [];
  
  // Environment checks
  const environment = {
    isProduction: import.meta.env.PROD,
    isHTTPS: location.protocol === 'https:' || location.hostname === 'localhost',
    hostname: location.hostname
  };
  
  // Browser support checks
  const browserSupport = {
    serviceWorker: 'serviceWorker' in navigator,
    notifications: 'Notification' in window,
    pushManager: 'PushManager' in window,
    notificationPermission: 'Notification' in window ? Notification.permission : 'denied' as NotificationPermission
  };
  
  // Firebase configuration
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    vapidKeyLength: import.meta.env.VITE_FIREBASE_VAPID_KEY?.length || 0,
    vapidKeyValid: import.meta.env.VITE_FIREBASE_VAPID_KEY ? validateVapidKey(import.meta.env.VITE_FIREBASE_VAPID_KEY) : false
  };
  
  // Service worker checks
  let serviceWorker = {
    registered: false,
    active: false,
    scriptURL: null as string | null,
    scope: null as string | null
  };
  
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        serviceWorker.registered = true;
        serviceWorker.active = !!registration.active;
        serviceWorker.scriptURL = registration.active?.scriptURL || null;
        serviceWorker.scope = registration.scope;
      }
    } catch (error) {
      errors.push(`Service worker check failed: ${error}`);
    }
  }
  
  // Analyze issues and provide recommendations
  
  // Environment issues
  if (environment.isProduction && !environment.isHTTPS) {
    errors.push('HTTPS is required for FCM in production');
    recommendations.push('Ensure your site is served over HTTPS');
  }
  
  // Browser support issues
  if (!browserSupport.serviceWorker) {
    errors.push('Service Worker not supported');
    recommendations.push('FCM requires Service Worker support');
  }
  
  if (!browserSupport.notifications) {
    errors.push('Notifications not supported');
    recommendations.push('FCM requires Notification API support');
  }
  
  if (!browserSupport.pushManager) {
    errors.push('Push Manager not supported');
    recommendations.push('FCM requires Push API support');
  }
  
  if (browserSupport.notificationPermission === 'denied') {
    errors.push('Notification permission denied');
    recommendations.push('User needs to grant notification permission');
  }
  
  // Firebase configuration issues
  if (!firebaseConfig.apiKey) {
    errors.push('Missing Firebase API Key');
    recommendations.push('Set VITE_FIREBASE_API_KEY environment variable');
  }
  
  if (!firebaseConfig.authDomain) {
    errors.push('Missing Firebase Auth Domain');
    recommendations.push('Set VITE_FIREBASE_AUTH_DOMAIN environment variable');
  }
  
  if (!firebaseConfig.projectId) {
    errors.push('Missing Firebase Project ID');
    recommendations.push('Set VITE_FIREBASE_PROJECT_ID environment variable');
  }
  
  if (!firebaseConfig.vapidKey) {
    errors.push('Missing VAPID Key');
    recommendations.push('Set VITE_FIREBASE_VAPID_KEY environment variable');
  } else if (!firebaseConfig.vapidKeyValid) {
    errors.push('Invalid VAPID Key format');
    recommendations.push('VAPID key should start with "B" and be 87-88 characters long');
    recommendations.push('Check your Firebase Console for the correct VAPID key');
  }
  
  // Service worker issues
  if (browserSupport.serviceWorker && !serviceWorker.registered) {
    errors.push('Service worker not registered');
    recommendations.push('Ensure firebase-messaging-sw.js is accessible at the root');
  }
  
  if (serviceWorker.registered && !serviceWorker.active) {
    errors.push('Service worker registered but not active');
    recommendations.push('Check service worker for errors');
  }
  
  if (serviceWorker.scriptURL && !serviceWorker.scriptURL.includes('firebase-messaging-sw.js')) {
    errors.push('Wrong service worker active');
    recommendations.push('Ensure firebase-messaging-sw.js is the active service worker');
  }
  
  return {
    environment,
    browserSupport,
    firebaseConfig,
    serviceWorker,
    errors,
    recommendations
  };
};

// Log FCM diagnostics to console
export const logFCMDiagnostics = async (): Promise<void> => {
  const diagnostics = await runFCMDiagnostics();
  
  console.group('🔥 FCM Diagnostics');
  
  console.group('🌍 Environment');
  console.log('Production:', diagnostics.environment.isProduction);
  console.log('HTTPS:', diagnostics.environment.isHTTPS);
  console.log('Hostname:', diagnostics.environment.hostname);
  console.groupEnd();
  
  console.group('🌐 Browser Support');
  console.log('Service Worker:', diagnostics.browserSupport.serviceWorker ? '✅' : '❌');
  console.log('Notifications:', diagnostics.browserSupport.notifications ? '✅' : '❌');
  console.log('Push Manager:', diagnostics.browserSupport.pushManager ? '✅' : '❌');
  console.log('Permission:', diagnostics.browserSupport.notificationPermission);
  console.groupEnd();
  
  console.group('🔧 Firebase Config');
  console.log('API Key:', diagnostics.firebaseConfig.apiKey ? '✅ Set' : '❌ Missing');
  console.log('Auth Domain:', diagnostics.firebaseConfig.authDomain ? '✅ Set' : '❌ Missing');
  console.log('Project ID:', diagnostics.firebaseConfig.projectId ? '✅ Set' : '❌ Missing');
  console.log('VAPID Key:', diagnostics.firebaseConfig.vapidKey ? '✅ Set' : '❌ Missing');
  console.log('VAPID Length:', diagnostics.firebaseConfig.vapidKeyLength);
  console.log('VAPID Valid:', diagnostics.firebaseConfig.vapidKeyValid ? '✅' : '❌');
  console.groupEnd();
  
  console.group('⚙️ Service Worker');
  console.log('Registered:', diagnostics.serviceWorker.registered ? '✅' : '❌');
  console.log('Active:', diagnostics.serviceWorker.active ? '✅' : '❌');
  console.log('Script URL:', diagnostics.serviceWorker.scriptURL);
  console.log('Scope:', diagnostics.serviceWorker.scope);
  console.groupEnd();
  
  if (diagnostics.errors.length > 0) {
    console.group('❌ Issues');
    diagnostics.errors.forEach(error => console.error(error));
    console.groupEnd();
  }
  
  if (diagnostics.recommendations.length > 0) {
    console.group('💡 Recommendations');
    diagnostics.recommendations.forEach(rec => console.log(rec));
    console.groupEnd();
  }
  
  console.groupEnd();
};

// Add to window for manual debugging
if (typeof window !== 'undefined') {
  (window as any).fcmDiagnostics = {
    runFCMDiagnostics,
    logFCMDiagnostics
  };
}
