// Log initialization
console.log('Firebase Messaging SW Starting:', new Date().toISOString());

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyACfcXjX0vNXWNduCRks1Z6LRa9XAY2pJ8",
    authDomain: "nesttask-diu.firebaseapp.com",
    projectId: "nesttask-diu",
    storageBucket: "nesttask-diu.firebasestorage.app",
    messagingSenderId: "743430115138",
    appId: "1:743430115138:web:3cbbdc0c149def8f88c2db",
    measurementId: "G-37LEQPKB3B"
};

// Initialize Firebase with error handling
try {
  firebase.initializeApp(firebaseConfig);
  console.log('Firebase initialized in SW');
} catch (error) {
  console.error('Firebase init error in SW:', error);
}

// Get messaging
let messaging;
try {
  messaging = firebase.messaging();
  console.log('Firebase messaging initialized in SW');
} catch (error) {
  console.error('Messaging init error in SW:', error);
}

// Handle background messages
if (messaging) {
  messaging.onBackgroundMessage(function(payload) {
    console.log('Background message received:', payload);

    const notificationTitle = payload.notification?.title || 'Notification';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: '/icons/icon-192x192.png',
      data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  event.notification.close();

  // Get URL from data or default to root
  const urlToOpen = event.notification.data?.url || '/';

  // Open or focus window
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(function(clientList) {
      // If we have a client already, focus it
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle service worker lifecycle events
self.addEventListener('install', function(event) {
  console.log('SW installed:', new Date().toISOString());
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('SW activated:', new Date().toISOString());
  event.waitUntil(clients.claim());
});

// Handle messages from the main app
self.addEventListener('message', function(event) {
  console.log('SW received message:', event.data);
  
  // Send response if needed
  if (event.data?.type === 'PING') {
    event.ports[0]?.postMessage({
      type: 'PONG',
      time: Date.now()
    });
  }
});