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
    const supported = await isSupported();
    if (supported && typeof window !== 'undefined') {
      messaging = getMessaging(app);
      return messaging;
    }
    console.log('Firebase Messaging is not supported in this environment');
    return null;
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
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

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.log('Notification permission denied');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
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