// Firebase Messaging Service Worker
// This file handles background push notifications

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration
// Note: These should match your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyACfcXjX0vNXWNduCRks1Z6LRa9XAY2pJ8",
  authDomain: "nesttask-diu.firebaseapp.com",
  projectId: "nesttask-diu",
  storageBucket: "nesttask-diu.firebasestorage.app",
  messagingSenderId: "743430115138",
  appId: "1:743430115138:web:3cbbdc0c149def8f88c2db",
  measurementId: "G-37LEQPKB3B"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification?.title || 'NestTask Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: 'nesttask-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/icon-192x192.png'
      }
    ],
    data: {
      url: payload.data?.url || '/',
      ...payload.data
    }
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Handle notification click
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window/tab is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle push event (fallback)
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received:', event);
  
  if (event.data) {
    const payload = event.data.json();
    console.log('[firebase-messaging-sw.js] Push payload:', payload);
    
    const notificationTitle = payload.notification?.title || 'NestTask';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'nesttask-push',
      data: payload.data || {}
    };

    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  }
});
