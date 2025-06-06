import { getFcmToken, initializeMessaging } from '../firebase';
import { checkNotificationPermission } from '../notifications';

/**
 * Check if FCM is properly initialized and working
 * @returns Object containing the status and potential issues
 */
export const checkFcmSetup = async () => {
  const results = {
    notificationsSupported: false,
    notificationPermission: 'unsupported' as 'granted' | 'denied' | 'default' | 'unsupported',
    messagingSupported: false,
    serviceWorkerSupported: false,
    serviceWorkerRegistered: false,
    fcmServiceWorkerRegistered: false,
    fcmTokenAvailable: false,
    fcmToken: null as string | null,
    issues: [] as string[],
    recommendations: [] as string[]
  };

  // 1. Check if notifications are supported
  results.notificationsSupported = 'Notification' in window;
  if (!results.notificationsSupported) {
    results.issues.push('Notifications are not supported in this browser.');
    results.recommendations.push('Try using a browser that supports notifications like Chrome, Firefox, or Edge.');
    return results;
  }

  // 2. Check notification permission
  results.notificationPermission = checkNotificationPermission() as 'granted' | 'denied' | 'default' | 'unsupported';
  if (results.notificationPermission !== 'granted') {
    results.issues.push(`Notification permission is ${results.notificationPermission}.`);
    results.recommendations.push('Request notification permission from the user.');
  }

  // 3. Check if Service Worker is supported
  results.serviceWorkerSupported = 'serviceWorker' in navigator;
  if (!results.serviceWorkerSupported) {
    results.issues.push('Service Workers are not supported in this browser.');
    results.recommendations.push('Try using a browser that supports Service Workers like Chrome, Firefox, or Edge.');
    return results;
  }

  // 4. Check if messaging is supported
  results.messagingSupported = await initializeMessaging();
  if (!results.messagingSupported) {
    results.issues.push('Firebase Messaging is not supported in this browser or environment.');
    results.recommendations.push('Check if you are using HTTPS or localhost (required for FCM).');
    return results;
  }

  // 5. Check if the app service worker is registered
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    // Check for main service worker
    const appServiceWorker = registrations.find(reg => 
      reg.scope.includes(window.location.origin) && 
      !reg.scope.includes('firebase-messaging')
    );
    
    results.serviceWorkerRegistered = !!appServiceWorker;
    if (!results.serviceWorkerRegistered) {
      results.issues.push('App service worker is not registered.');
      results.recommendations.push('Check if service-worker.js is correctly deployed and registered.');
    }
    
    // Check for Firebase Messaging service worker
    const fcmServiceWorker = registrations.find(reg => 
      reg.active?.scriptURL.includes('firebase-messaging-sw.js')
    );
    
    results.fcmServiceWorkerRegistered = !!fcmServiceWorker;
    if (!results.fcmServiceWorkerRegistered) {
      results.issues.push('Firebase Messaging service worker is not registered.');
      results.recommendations.push('Check if firebase-messaging-sw.js is correctly deployed at the root path.');
    }
    
  } catch (error) {
    console.error('[FCM Check] Error checking service worker registrations:', error);
    results.issues.push('Error checking service worker registrations.');
  }

  // 6. Check if FCM token is available
  if (results.notificationPermission === 'granted') {
    try {
      const token = await getFcmToken();
      results.fcmTokenAvailable = !!token;
      results.fcmToken = token;
      
      if (!token) {
        results.issues.push('FCM token is not available.');
        results.recommendations.push('Check if the VAPID key is correctly configured.');
      }
    } catch (error) {
      console.error('[FCM Check] Error getting FCM token:', error);
      results.issues.push('Error getting FCM token.');
      results.recommendations.push('Check browser console for more details.');
    }
  }

  return results;
};

/**
 * Fix common FCM setup issues
 * @returns Object containing the success status and actions taken
 */
export const fixFcmSetup = async () => {
  const actions = [] as string[];
  
  try {
    // Check current setup
    const initialCheck = await checkFcmSetup();
    
    // Nothing to fix if everything is working
    if (
      initialCheck.notificationsSupported && 
      initialCheck.messagingSupported && 
      initialCheck.serviceWorkerSupported &&
      initialCheck.serviceWorkerRegistered &&
      initialCheck.fcmServiceWorkerRegistered &&
      (initialCheck.fcmTokenAvailable || initialCheck.notificationPermission !== 'granted')
    ) {
      return {
        success: true,
        message: 'FCM setup is already working properly.',
        actions: []
      };
    }
    
    // Fix service worker registration if needed
    if (!initialCheck.serviceWorkerRegistered && 'serviceWorker' in navigator) {
      actions.push('Re-registering app service worker...');
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        actions.push(`App service worker registered with scope: ${registration.scope}`);
      } catch (error) {
        actions.push(`Failed to register app service worker: ${error}`);
      }
    }
    
    // Force reload service workers to pick up firebase-messaging-sw.js
    if (!initialCheck.fcmServiceWorkerRegistered) {
      actions.push('Attempting to force reload service workers...');
      
      // The next time FCM functions are called, Firebase will try to register the service worker
      await initializeMessaging();
      actions.push('Firebase messaging reinitialized');
    }
    
    // Final check after fixes
    const finalCheck = await checkFcmSetup();
    
    // Return success status
    const wasFixed = (
      (!initialCheck.serviceWorkerRegistered && finalCheck.serviceWorkerRegistered) ||
      (!initialCheck.fcmServiceWorkerRegistered && finalCheck.fcmServiceWorkerRegistered) ||
      (!initialCheck.fcmTokenAvailable && finalCheck.fcmTokenAvailable)
    );
    
    return {
      success: wasFixed,
      message: wasFixed 
        ? 'FCM setup issues were fixed.' 
        : 'Some FCM setup issues could not be automatically fixed.',
      actions,
      remainingIssues: finalCheck.issues,
      recommendations: finalCheck.recommendations
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error fixing FCM setup.',
      error: String(error),
      actions
    };
  }
}; 