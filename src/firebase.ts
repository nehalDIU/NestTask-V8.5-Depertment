import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyACfcXjX0vNXWNduCRks1Z6LRa9XAY2pJ8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nesttask-diu.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nesttask-diu",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nesttask-diu.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "743430115138",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:743430115138:web:3cbbdc0c149def8f88c2db",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-37LEQPKB3B"
};

// VAPID key for FCM
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "BP0PQk228HtybCDJ7LkkRGd437hwZjbC0SAQYM4Pk2n5PyFRfbxKoRKq7ze6lFuTM1njp7f9y0oaWFM5D_k5TS4";

// Validate VAPID key format
const validateVapidKey = (key: string): boolean => {
  if (!key || typeof key !== 'string') return false;

  // VAPID keys should start with 'B' and be 87-88 characters long (base64url encoded)
  // Some keys might be 87 characters due to padding differences
  const isValidLength = key.length >= 87 && key.length <= 88;
  const startsWithB = key.startsWith('B');

  // Additional check: should contain only valid base64url characters
  const base64urlPattern = /^[A-Za-z0-9_-]+$/;
  const hasValidChars = base64urlPattern.test(key);

  console.log('🔍 VAPID Key validation details:', {
    length: key.length,
    startsWithB,
    hasValidChars,
    isValidLength
  });

  return startsWithB && isValidLength && hasValidChars;
};

// Log VAPID key validation
console.log('🔑 VAPID Key validation:', {
  key: VAPID_KEY.substring(0, 20) + '...',
  valid: validateVapidKey(VAPID_KEY),
  length: VAPID_KEY.length
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
let messaging: any = null;

// Register service worker for FCM
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      console.log('🔧 Registering FCM service worker...');

      // Check if we're in production and ensure HTTPS
      if (import.meta.env.PROD && location.protocol !== 'https:') {
        console.error('❌ FCM requires HTTPS in production');
        return null;
      }

      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      console.log('✅ FCM Service worker registered:', registration);

      // Wait for the service worker to be ready
      await registration.update();
      console.log('✅ FCM Service worker updated');

      return registration;
    } catch (error) {
      console.error('❌ FCM Service worker registration failed:', error);
      console.error('Error details:', error);
      return null;
    }
  }
  console.warn('❌ Service Worker not supported in this browser');
  return null;
};

// Check if messaging is supported and initialize
export const initializeMessaging = async () => {
  try {
    console.log('🚀 Initializing Firebase Cloud Messaging...');

    const supported = await isSupported();
    console.log('📱 FCM supported:', supported);

    if (supported && typeof window !== 'undefined') {
      // Register service worker first
      await registerServiceWorker();

      // Wait for service worker to be ready
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
        console.log('✅ Service worker is ready');
      }

      messaging = getMessaging(app);
      console.log('✅ Firebase Cloud Messaging initialized successfully');
      return messaging;
    } else {
      console.warn('❌ Firebase Cloud Messaging is not supported in this environment');
      return null;
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Cloud Messaging:', error);
    return null;
  }
};

// Get FCM token
export const getFCMToken = async (): Promise<string | null> => {
  try {
    console.log('🎫 Starting FCM token generation...');

    // Check environment requirements
    if (import.meta.env.PROD && location.protocol !== 'https:') {
      console.error('❌ FCM requires HTTPS in production environment');
      return null;
    }

    if (!messaging) {
      console.log('🔧 Messaging not initialized, initializing now...');
      messaging = await initializeMessaging();
    }

    if (!messaging) {
      console.warn('❌ FCM messaging not available');
      return null;
    }

    // Validate VAPID key
    if (!VAPID_KEY) {
      console.error('❌ VAPID key is missing');
      return null;
    }

    const isValidVapid = validateVapidKey(VAPID_KEY);
    if (!isValidVapid) {
      console.warn('⚠️ VAPID key validation failed, but attempting to use it anyway');
      console.log('VAPID key details:', {
        key: VAPID_KEY.substring(0, 20) + '...',
        length: VAPID_KEY.length,
        startsWithB: VAPID_KEY.startsWith('B')
      });
      // Don't return null here - let Firebase handle the validation
    }

    console.log('🔑 Requesting FCM token with VAPID key...');
    console.log('🔑 VAPID key:', VAPID_KEY.substring(0, 20) + '...');

    // Check if service worker is ready
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      console.log('✅ Service worker ready for FCM token generation');

      // Verify the service worker is actually our FCM service worker
      if (registration.active && !registration.active.scriptURL.includes('firebase-messaging-sw.js')) {
        console.warn('⚠️ Active service worker is not the FCM service worker');
      }
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : undefined
    });

    if (token) {
      console.log('✅ FCM registration token generated:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.log('❌ No FCM registration token available. This could be due to:');
      console.log('  - User denied notification permission');
      console.log('  - Service worker not properly registered');
      console.log('  - VAPID key configuration issue');
      console.log('  - Browser not supporting FCM');
      console.log('  - Network connectivity issues');
      return null;
    }
  } catch (error) {
    console.error('❌ Error occurred while retrieving FCM token:', error);

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      // Specific error handling
      if (error.message.includes('messaging/unsupported-browser')) {
        console.error('💡 Browser does not support FCM');
      } else if (error.message.includes('messaging/permission-blocked')) {
        console.error('💡 Notification permission was denied');
      } else if (error.message.includes('messaging/vapid-key-required')) {
        console.error('💡 VAPID key is required but not provided');
      } else if (error.message.includes('messaging/invalid-vapid-key')) {
        console.error('💡 VAPID key is invalid');
      }
    }

    return null;
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) {
    console.warn('FCM messaging not initialized');
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    console.log('Message received in foreground:', payload);
    callback(payload);
  });
};

export { app, messaging };