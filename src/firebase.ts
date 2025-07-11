import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
let messaging: any = null;

// Check if we're in a browser environment and messaging is supported
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    // Only initialize messaging if we're on HTTPS or localhost
    const isSecureContext = window.location.protocol === 'https:' ||
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1';

    if (isSecureContext) {
      messaging = getMessaging(app);
      console.log('Firebase messaging initialized successfully');
    } else {
      console.warn('Firebase messaging requires HTTPS in production');
    }
  } catch (error) {
    console.warn('Firebase messaging not available:', error);
  }
}

// VAPID key for web push notifications
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export { app, messaging, VAPID_KEY };

// Register service worker for FCM
export async function registerServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return false;
  }

  try {
    // Register the service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });

    console.log('Service Worker registered successfully:', registration);

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('Service Worker is ready');

    return true;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return false;
  }
}

// FCM token management
export async function getFCMToken(): Promise<string | null> {
  if (!messaging || !VAPID_KEY) {
    console.warn('Firebase messaging or VAPID key not configured');
    return null;
  }

  try {
    // Ensure service worker is registered first
    const swRegistered = await registerServiceWorker();
    if (!swRegistered) {
      console.error('Service Worker registration failed, cannot get FCM token');
      return null;
    }

    // Request notification permission first
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.ready
    });

    if (token) {
      console.log('FCM token generated successfully');
    } else {
      console.warn('No FCM token generated');
    }

    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

// Listen for foreground messages
export function onForegroundMessage(callback: (payload: MessagePayload) => void) {
  if (!messaging) {
    console.warn('Firebase messaging not available');
    return () => {};
  }

  return onMessage(messaging, callback);
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}