importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
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

  // Add proper fetch handler for FCM token registration
  self.addEventListener('fetch', (event) => {
    // Only handle specific FCM-related requests or requests to Supabase fcm_tokens
    const url = new URL(event.request.url);
    if (url.pathname.includes('fcm_tokens') || 
        url.pathname.includes('/fcm/') || 
        url.pathname.includes('/firebase-messaging-sw.js')) {
      
      // For GET requests, pass through but handle response properly
      if (event.request.method === 'GET') {
        event.respondWith(
          fetch(event.request.clone())
            .then(response => {
              // Important: clone before using
              console.log('[SW] FCM fetch response status:', response.status);
              return response;
            })
            .catch(error => {
              console.error('[SW] FCM fetch error:', error);
              throw error;
            })
        );
      }
    }
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
});