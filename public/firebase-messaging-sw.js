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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Track active service worker
self.addEventListener('activate', (event) => {
  console.log('Firebase messaging service worker activated');
  
  // Track the timestamp when the service worker was last activated
  self.lastActivatedTimestamp = Date.now();
  
  // Store this timestamp in IndexedDB for tracking
  const request = indexedDB.open('fcm-tracking', 1);
  
  request.onupgradeneeded = function(event) {
    const db = event.target.result;
    if (!db.objectStoreNames.contains('timestamps')) {
      db.createObjectStore('timestamps', { keyPath: 'id' });
    }
  };
  
  request.onsuccess = function(event) {
    const db = event.target.result;
    const transaction = db.transaction(['timestamps'], 'readwrite');
    const store = transaction.objectStore('timestamps');
    
    store.put({
      id: 'lastActivated',
      timestamp: self.lastActivatedTimestamp
    });
  };
});

// Set up a ping mechanism to keep the service worker alive
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PING') {
    console.log('Ping received by service worker', Date.now());
    
    // Send a pong back to the client
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({
        type: 'PONG',
        timestamp: Date.now()
      });
    }
  }
});

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: payload.data || {},
    tag: payload.data?.tag || 'default',  // Group notifications if tag is provided
    renotify: true,                       // Notify again even if tag exists
    requireInteraction: true              // Keep notification visible until user interacts
  };

  self.registration.showNotification(notificationTitle, notificationOptions)
    .then(() => {
      console.log('Background notification displayed successfully');
    })
    .catch(error => {
      console.error('Error displaying background notification:', error);
    });
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Extract any data from the notification
  const url = event.notification.data?.url || '/';
  
  // Open the app and navigate to a specific page if URL is provided
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientsArr => {
      // If a window client is already open, focus it and navigate
      const hadWindowToFocus = clientsArr.some(windowClient => {
        if (windowClient.url === url) {
          return windowClient.focus();
        }
        return false;
      });

      // If no window client is open, open a new one
      if (!hadWindowToFocus) {
        clients.openWindow(url)
          .then(windowClient => windowClient ? windowClient.focus() : null);
      }
    })
  );
});