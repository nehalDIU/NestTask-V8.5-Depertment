// This script will update the service worker file to fix FCM token issues
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Fix service worker
const fixServiceWorker = () => {
  console.log('Fixing service worker configuration...');
  
  const swPath = path.join(__dirname, 'public', 'firebase-messaging-sw.js');
  
  if (!fs.existsSync(swPath)) {
    console.error('Service worker file not found at:', swPath);
    return false;
  }
  
  // Read the service worker file
  let swContent = fs.readFileSync(swPath, 'utf8');
  
  // Fix the storage bucket URL
  swContent = swContent.replace(
    /storageBucket: ".*?"/,
    'storageBucket: "nesttask-diu.appspot.com"'
  );
  
  // Add enhanced error handling and self-healing
  swContent = `importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyACfcXjX0vNXWNduCRks1Z6LRa9XAY2pJ8",
    authDomain: "nesttask-diu.firebaseapp.com",
    projectId: "nesttask-diu",
    storageBucket: "nesttask-diu.appspot.com",
    messagingSenderId: "743430115138",
    appId: "1:743430115138:web:3cbbdc0c149def8f88c2db",
    measurementId: "G-37LEQPKB3B"
};

// Add timestamp for debugging
self.LAST_INIT_TIMESTAMP = new Date().toISOString();

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  console.log('[SW] Firebase initialized successfully');
  
  // Record successful initialization
  self.FIREBASE_INITIALIZED = true;

  // Track the service worker lifecycle
  self.addEventListener('install', (event) => {
    console.log('[SW] Service Worker installing.');
    // Force activation without waiting
    event.waitUntil(self.skipWaiting());
  });

  self.addEventListener('activate', (event) => {
    console.log('[SW] Service Worker activated.');
    // Take control of all clients immediately
    event.waitUntil(clients.claim());
  });

  // Keep service worker alive with periodic ping
  setInterval(() => {
    console.log('[SW] Service worker ping - keeping alive');
    try {
      self.registration.update();
      // Store last ping timestamp for troubleshooting
      self.LAST_PING_TIMESTAMP = new Date().toISOString();
    } catch (err) {
      console.error('[SW] Error during ping:', err);
    }
  }, 5 * 60 * 1000); // Every 5 minutes (more frequent)

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Received background message:', payload);
    
    // Extract notification data
    const notificationTitle = payload.notification.title || 'NestTask Notification';
    const notificationOptions = {
      body: payload.notification.body || '',
      icon: payload.notification.icon || '/logo192.png',
      badge: '/badge-icon.png',
      image: payload.notification.image,
      data: payload.data || {},
      tag: payload.data?.tag || 'default',
      actions: payload.data?.actions || [],
      requireInteraction: payload.data?.requireInteraction || false,
      renotify: payload.data?.renotify || false,
      silent: payload.data?.silent || false
    };
    
    // Show the notification
    return self.registration.showNotification(notificationTitle, notificationOptions);
  });

  // Handle notification click
  self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event);
    
    event.notification.close();
    
    // Get the action (if any)
    const action = event.action;
    const notification = event.notification;
    const data = notification.data || {};
    
    // Default URL to open
    let urlToOpen = data.url || '/';
    
    // If an action was clicked, use that URL instead if available
    if (action && data.actions && data.actions[action]) {
      urlToOpen = data.actions[action];
    }
    
    // Open the app window or focus it if already open
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus()
              .then((focusedClient) => {
                if (focusedClient && urlToOpen) {
                  return focusedClient.navigate(urlToOpen);
                }
              });
          }
        }
        
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  });
  
} catch (error) {
  console.error('[SW] Failed to initialize Firebase:', error);
  // Record error for troubleshooting
  self.FIREBASE_ERROR = error.message;
}

// Self-healing mechanism
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'firebase-recovery') {
    console.log('[SW] Attempting recovery...');
    if (!self.FIREBASE_INITIALIZED) {
      try {
        firebase.initializeApp(firebaseConfig);
        self.FIREBASE_INITIALIZED = true;
        console.log('[SW] Recovery successful');
      } catch (error) {
        console.error('[SW] Recovery failed:', error);
      }
    }
  }
});`;
  
  // Write the updated file
  fs.writeFileSync(swPath, swContent);
  console.log('✅ Service worker fixed successfully');
  return true;
};

// 2. Fix notifications.ts
const fixNotifications = () => {
  console.log('Enhancing FCM token registration...');
  
  const notificationsPath = path.join(__dirname, 'src', 'notifications.ts');
  
  if (!fs.existsSync(notificationsPath)) {
    console.error('Notifications file not found at:', notificationsPath);
    return false;
  }
  
  const notificationsContent = `import { messaging } from './firebase';
import { supabase } from './lib/supabase';
import { getToken } from 'firebase/messaging';

// Define a max retry limit to prevent infinite loops
const MAX_RETRIES = 3;
const REGISTRATION_TIMEOUT = 30000; // 30 seconds

export const requestNotificationPermission = async (userId: string) => {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return false;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      // Try to register the service worker directly first
      await registerServiceWorker();
      
      return await getAndSaveFcmToken(userId);
    } else {
      console.log('Notification permission denied.');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Separate function to register the service worker
const registerServiceWorker = async () => {
  try {
    // First check if service worker is already registered
    const registrations = await navigator.serviceWorker.getRegistrations();
    const swRegistration = registrations.find(reg => 
      reg.active?.scriptURL.includes('firebase-messaging-sw.js'));
    
    if (swRegistration) {
      console.log('Firebase messaging service worker already registered');
      return swRegistration;
    }
    
    console.log('Registering Firebase messaging service worker...');
    return await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
  } catch (error) {
    console.error('Service worker registration failed:', error);
    throw error;
  }
};

// Separate function to get and save FCM token with retries
const getAndSaveFcmToken = async (userId: string, retryCount = 0) => {
  try {
    console.log(\`Attempting to get FCM token (attempt \${retryCount + 1}/\${MAX_RETRIES + 1})\`);
    
    // Set a timeout to prevent hanging
    const tokenPromise = getToken(messaging, {
      vapidKey: 'BP0PQk228HtybCDJ7LkkRGd437hwZjbC0SAQYM4Pk2n5PyFRfbxKoRKq7ze6lFuTM1njp7f9y0oaWFM5D_k5TS4',
    });
    
    // Race with a timeout promise
    const token = await Promise.race([
      tokenPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('FCM token retrieval timeout')), REGISTRATION_TIMEOUT)
      )
    ]) as string;

    if (token) {
      console.log('FCM Token retrieved successfully');
      
      // Store the token in Supabase
      const { error } = await supabase
        .from('fcm_tokens')
        .upsert({ 
          user_id: userId, 
          fcm_token: token,
          device_info: getBrowserInfo(),
          created_at: new Date().toISOString(),
          last_used: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error saving FCM token:', error);
        return false;
      } else {
        console.log('FCM token saved to Supabase');
        return true;
      }
    } else {
      console.error('No FCM token received');
      return false;
    }
  } catch (tokenError) {
    console.error('Error getting FCM token:', tokenError);
    
    // Retry logic with exponential backoff
    if (retryCount < MAX_RETRIES) {
      const backoffTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
      console.log(\`Retrying in \${backoffTime}ms...\`);
      
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      return getAndSaveFcmToken(userId, retryCount + 1);
    }
    
    return false;
  }
};

// Function to get browser info for debugging
const getBrowserInfo = () => {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    vendor: navigator.vendor,
    timestamp: new Date().toISOString()
  };
};

// Function to check if the user has already granted notification permission
export const checkNotificationPermission = () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};

// Function to unsubscribe from notifications
export const unsubscribeFromNotifications = async (userId: string) => {
  try {
    // Delete the FCM token from Supabase
    const { error } = await supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error deleting FCM token:', error);
      return false;
    } else {
      console.log('FCM token deleted from Supabase');
      return true;
    }
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error);
    return false;
  }
};`;
  
  // Write the updated file
  fs.writeFileSync(notificationsPath, notificationsContent);
  console.log('✅ Notifications.ts enhanced successfully');
  return true;
};

// Run the fixes
console.log('🔧 Starting FCM token fixes...');
const swFixed = fixServiceWorker();
const notificationsFixed = fixNotifications();

if (swFixed && notificationsFixed) {
  console.log('✅ All FCM token fixes applied successfully!');
  console.log('Please clear your browser cache and restart the application to apply these changes.');
} else {
  console.error('❌ Some fixes could not be applied. Please check the messages above.');
} 