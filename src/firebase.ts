import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

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

// VAPID key for FCM
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);

  if (missingFields.length > 0) {
    console.error('Missing Firebase configuration fields:', missingFields);
    console.error('Please set the following environment variables:');
    missingFields.forEach(field => {
      const envVar = `VITE_FIREBASE_${field.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
      console.error(`- ${envVar}`);
    });
    return false;
  }

  if (!VAPID_KEY) {
    console.error('Missing VAPID key. Please set VITE_FIREBASE_VAPID_KEY environment variable.');
    return false;
  }

  return true;
};

// Initialize Firebase only if configuration is valid
let app: any = null;
if (validateFirebaseConfig()) {
  try {
    app = initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
} else {
  console.warn('Firebase not initialized due to missing configuration');
}

export { app };

// Initialize Firebase Cloud Messaging and get a reference to the service
let messaging: any = null;

// Check if messaging is supported and initialize
export const initializeMessaging = async () => {
  try {
    // Check if Firebase app is initialized
    if (!app) {
      console.warn('Firebase app not initialized. Please check your Firebase configuration.');
      return null;
    }

    const supported = await isSupported();
    if (supported && typeof window !== 'undefined') {
      messaging = getMessaging(app);
      console.log('Firebase Messaging initialized successfully');
      return messaging;
    }
    console.warn('Firebase Messaging is not supported in this environment');
    return null;
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
    return null;
  }
};

// Get FCM token
export const getFCMToken = async (): Promise<string | null> => {
  try {
    // Check if Firebase app is initialized
    if (!app) {
      console.warn('Firebase app not initialized. Cannot get FCM token.');
      return null;
    }

    if (!messaging) {
      await initializeMessaging();
    }

    if (!messaging) {
      console.warn('Firebase Messaging could not be initialized');
      return null;
    }

    if (!VAPID_KEY) {
      console.warn('VAPID key missing. Please set VITE_FIREBASE_VAPID_KEY environment variable.');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });

    if (token) {
      console.log('FCM token retrieved successfully');
      return token;
    } else {
      console.warn('No FCM token received. User may have denied permission.');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) {
    console.warn('Firebase Messaging not initialized');
    return () => {};
  }

  return onMessage(messaging, callback);
};

// Export messaging instance
export { messaging };