import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// Environment detection
const isProduction = import.meta.env.PROD;
const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';

console.log('🌍 Environment:', { isProduction, isVercel, isDevelopment });

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

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);

  if (missingFields.length > 0) {
    console.error('Missing Firebase configuration fields:', missingFields);
    return false;
  }

  console.log('✅ Firebase configuration validated successfully');
  return true;
};

// VAPID key for FCM
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "BP0PQk228HtybCDJ7LkkRGd437hwZjbC0SAQYM4Pk2n5PyFRfbxKoRKq7ze6lFuTM1njp7f9y0oaWFM5D_k5TS4";

// Validate and initialize Firebase
if (!validateFirebaseConfig()) {
  console.error('❌ Firebase configuration validation failed');
}

const app = initializeApp(firebaseConfig);
console.log('🔥 Firebase app initialized successfully');

// Initialize Firebase Cloud Messaging and get a reference to the service
let messaging: any = null;

// Check if messaging is supported
const initializeMessaging = async () => {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.log('Not in browser environment, skipping Firebase Messaging');
      return null;
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers not supported, Firebase Messaging unavailable');
      return null;
    }

    const supported = await isSupported();
    if (supported) {
      messaging = getMessaging(app);
      console.log('✅ Firebase Messaging initialized successfully');
      return messaging;
    } else {
      console.log('❌ Firebase Messaging is not supported in this environment');
      return null;
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Messaging:', error);
    return null;
  }
};

// Get FCM registration token
export const getFCMToken = async (): Promise<string | null> => {
  try {
    if (!messaging) {
      await initializeMessaging();
    }

    if (!messaging) {
      console.warn('Firebase Messaging not available');
      return null;
    }

    if (!VAPID_KEY) {
      console.error('VAPID key not configured');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });

    if (token) {
      console.log('FCM registration token:', token);
      return token;
    } else {
      console.log('No registration token available.');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
    return null;
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) {
    console.warn('Firebase Messaging not available');
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    console.log('Message received in foreground:', payload);
    callback(payload);
  });
};

// Request notification permission with better error handling
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.log('❌ Not in browser environment');
      return false;
    }

    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('❌ This browser does not support notifications');
      return false;
    }

    // Check current permission status
    const currentPermission = Notification.permission;
    console.log('📋 Current notification permission:', currentPermission);

    if (currentPermission === 'granted') {
      console.log('✅ Notification permission already granted');
      return true;
    }

    if (currentPermission === 'denied') {
      console.log('❌ Notification permission was denied. Please enable in browser settings.');
      return false;
    }

    // Request permission (only works on user interaction)
    console.log('🔔 Requesting notification permission...');
    const permission = await Notification.requestPermission();

    const granted = permission === 'granted';
    console.log(granted ? '✅ Notification permission granted' : '❌ Notification permission denied');

    return granted;
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
};

// Initialize FCM
export const initializeFCM = async () => {
  try {
    // Initialize messaging
    await initializeMessaging();

    // Request permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('Notification permission not granted');
      return null;
    }

    // Get FCM token
    const token = await getFCMToken();
    return token;
  } catch (error) {
    console.error('Error initializing FCM:', error);
    return null;
  }
};

export { app, messaging };