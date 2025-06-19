// Firebase Cloud Messaging Service Worker
// This file must be in the public directory and accessible at the root

// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration - should match your main app config
const firebaseConfig = {
  apiKey: "AIzaSyACfcXjX0vNXWNduCRks1Z6LRa9XAY2pJ8",
  authDomain: "nesttask-diu.firebaseapp.com",
  projectId: "nesttask-diu",
  storageBucket: "nesttask-diu.firebasestorage.app",
  messagingSenderId: "743430115138",
  appId: "1:743430115138:web:3cbbdc0c149def8f88c2db",
  measurementId: "G-37LEQPKB3B"
};

// Initialize Firebase in service worker
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 Received background FCM message:', payload);

  // Extract notification data
  const notificationTitle = payload.notification?.title || payload.data?.title || 'NestTask Notification';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new notification',
    icon: payload.notification?.icon || payload.data?.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: payload.data?.tag || 'nesttask-notification',
    data: {
      url: payload.data?.url || '/',
      taskId: payload.data?.taskId,
      type: payload.data?.type || 'general',
      timestamp: Date.now(),
      ...payload.data
    },
    requireInteraction: payload.data?.requireInteraction === 'true' || false,
    silent: false,
    renotify: true,
    actions: []
  };

  // Add action buttons based on notification type
  if (payload.data?.type === 'admin-task' || payload.data?.type === 'task') {
    notificationOptions.actions = [
      {
        action: 'view',
        title: 'View Task',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/icon-192x192.png'
      }
    ];
  } else if (payload.data?.type === 'announcement') {
    notificationOptions.actions = [
      {
        action: 'view',
        title: 'View Announcement',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/icon-192x192.png'
      }
    ];
  }

  console.log('📱 Showing notification:', notificationTitle, notificationOptions);

  // Show the notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  // Close the notification
  notification.close();

  if (action === 'dismiss') {
    // Just close the notification, no further action needed
    return;
  }

  // Default action or 'view' action
  const urlToOpen = data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // If no existing window/tab, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // Optional: Track notification dismissal analytics
  const data = event.notification.data || {};
  
  // You can send analytics data here if needed
  if (data.trackDismissal) {
    // Send tracking data to your analytics service
    console.log('Tracking notification dismissal for:', data.type);
  }
});

// Handle push events (fallback for when onBackgroundMessage doesn't work)
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  if (!event.data) {
    console.log('Push event has no data');
    return;
  }

  try {
    const payload = event.data.json();
    console.log('Push payload:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'NestTask Notification';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'You have a new notification',
      icon: payload.notification?.icon || payload.data?.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: payload.data?.tag || 'nesttask-notification',
      data: {
        url: payload.data?.url || '/',
        ...payload.data
      },
      requireInteraction: false,
      silent: false
    };

    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  } catch (error) {
    console.error('Error parsing push payload:', error);
    
    // Show a generic notification if parsing fails
    event.waitUntil(
      self.registration.showNotification('NestTask Notification', {
        body: 'You have a new notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'nesttask-generic'
      })
    );
  }
});

// Keep the service worker alive
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('Firebase messaging service worker loaded successfully');
