// Production debugging utilities
// This file helps debug issues that only occur in production

export interface DebugInfo {
  environment: string;
  timestamp: string;
  url: string;
  userAgent: string;
  supabaseConfig: {
    url: string | undefined;
    hasAnonKey: boolean;
  };
  firebaseConfig: {
    hasApiKey: boolean;
    hasVapidKey: boolean;
    vapidKeyValid: boolean;
  };
  browserSupport: {
    serviceWorker: boolean;
    notifications: boolean;
    pushManager: boolean;
    https: boolean;
  };
  errors: string[];
}

// Collect comprehensive debug information
export const collectDebugInfo = (): DebugInfo => {
  const errors: string[] = [];
  
  try {
    // Check environment variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    const firebaseProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const firebaseAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
    
    // Validate VAPID key
    const validateVapidKey = (key: string): boolean => {
      return key?.startsWith('B') && key.length === 88;
    };
    
    // Check for missing environment variables
    if (!supabaseUrl) errors.push('Missing VITE_SUPABASE_URL');
    if (!supabaseAnonKey) errors.push('Missing VITE_SUPABASE_ANON_KEY');
    if (!firebaseApiKey) errors.push('Missing VITE_FIREBASE_API_KEY');
    if (!vapidKey) errors.push('Missing VITE_FIREBASE_VAPID_KEY');
    if (!firebaseProjectId) errors.push('Missing VITE_FIREBASE_PROJECT_ID');
    if (!firebaseAuthDomain) errors.push('Missing VITE_FIREBASE_AUTH_DOMAIN');
    
    // Check browser support
    const browserSupport = {
      serviceWorker: 'serviceWorker' in navigator,
      notifications: 'Notification' in window,
      pushManager: 'PushManager' in window,
      https: location.protocol === 'https:' || location.hostname === 'localhost'
    };
    
    // Check for browser support issues
    if (!browserSupport.serviceWorker) errors.push('Service Worker not supported');
    if (!browserSupport.notifications) errors.push('Notifications not supported');
    if (!browserSupport.pushManager) errors.push('Push Manager not supported');
    if (!browserSupport.https && import.meta.env.PROD) errors.push('HTTPS required in production');
    
    return {
      environment: import.meta.env.PROD ? 'production' : 'development',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      supabaseConfig: {
        url: supabaseUrl,
        hasAnonKey: !!supabaseAnonKey
      },
      firebaseConfig: {
        hasApiKey: !!firebaseApiKey,
        hasVapidKey: !!vapidKey,
        vapidKeyValid: vapidKey ? validateVapidKey(vapidKey) : false,
        hasProjectId: !!firebaseProjectId,
        hasAuthDomain: !!firebaseAuthDomain,
        vapidKeyLength: vapidKey ? vapidKey.length : 0
      },
      browserSupport,
      errors
    };
  } catch (error) {
    errors.push(`Error collecting debug info: ${error}`);
    return {
      environment: 'unknown',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      supabaseConfig: { url: undefined, hasAnonKey: false },
      firebaseConfig: { hasApiKey: false, hasVapidKey: false, vapidKeyValid: false },
      browserSupport: { serviceWorker: false, notifications: false, pushManager: false, https: false },
      errors
    };
  }
};

// Log debug information to console
export const logDebugInfo = (): void => {
  const debugInfo = collectDebugInfo();
  
  console.group('🔍 Production Debug Information');
  console.log('Environment:', debugInfo.environment);
  console.log('Timestamp:', debugInfo.timestamp);
  console.log('URL:', debugInfo.url);
  console.log('User Agent:', debugInfo.userAgent);
  
  console.group('📊 Configuration Status');
  console.log('Supabase URL:', debugInfo.supabaseConfig.url ? '✅ Set' : '❌ Missing');
  console.log('Supabase Anon Key:', debugInfo.supabaseConfig.hasAnonKey ? '✅ Set' : '❌ Missing');
  console.log('Firebase API Key:', debugInfo.firebaseConfig.hasApiKey ? '✅ Set' : '❌ Missing');
  console.log('Firebase Project ID:', debugInfo.firebaseConfig.hasProjectId ? '✅ Set' : '❌ Missing');
  console.log('Firebase Auth Domain:', debugInfo.firebaseConfig.hasAuthDomain ? '✅ Set' : '❌ Missing');
  console.log('Firebase VAPID Key:', debugInfo.firebaseConfig.hasVapidKey ? '✅ Set' : '❌ Missing');
  console.log('VAPID Key Length:', debugInfo.firebaseConfig.vapidKeyLength);
  console.log('VAPID Key Valid:', debugInfo.firebaseConfig.vapidKeyValid ? '✅ Valid' : '❌ Invalid');
  console.groupEnd();
  
  console.group('🌐 Browser Support');
  console.log('Service Worker:', debugInfo.browserSupport.serviceWorker ? '✅ Supported' : '❌ Not Supported');
  console.log('Notifications:', debugInfo.browserSupport.notifications ? '✅ Supported' : '❌ Not Supported');
  console.log('Push Manager:', debugInfo.browserSupport.pushManager ? '✅ Supported' : '❌ Not Supported');
  console.log('HTTPS:', debugInfo.browserSupport.https ? '✅ Secure' : '❌ Not Secure');
  console.groupEnd();
  
  if (debugInfo.errors.length > 0) {
    console.group('❌ Issues Found');
    debugInfo.errors.forEach(error => console.error(error));
    console.groupEnd();
  } else {
    console.log('✅ No configuration issues detected');
  }
  
  console.groupEnd();
};

// Send debug information to console on app start
export const initProductionDebug = (): void => {
  // Only run in production or when explicitly requested
  if (import.meta.env.PROD || localStorage.getItem('nesttask_debug') === 'true') {
    console.log('🚀 NestTask Production Debug Mode');
    logDebugInfo();

    // Also run FCM diagnostics if available
    import('./fcm-troubleshoot').then(({ logFCMDiagnostics }) => {
      logFCMDiagnostics().catch(console.error);
    }).catch(() => {
      // FCM troubleshoot module not available
    });

    // Also log any unhandled errors
    window.addEventListener('error', (event) => {
      console.error('🚨 Unhandled Error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });

    // Log unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('🚨 Unhandled Promise Rejection:', event.reason);
    });
  }
};

// Export debug info as JSON for support
export const exportDebugInfo = (): string => {
  const debugInfo = collectDebugInfo();
  return JSON.stringify(debugInfo, null, 2);
};

// Add to window for manual debugging
if (typeof window !== 'undefined') {
  (window as any).nestTaskDebug = {
    collectDebugInfo,
    logDebugInfo,
    exportDebugInfo
  };
}
