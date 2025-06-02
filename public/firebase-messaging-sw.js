importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyACfcXjX0vNXWNduCRks1Z6LRa9XAY2pJ8",
    authDomain: "nesttask-diu.firebaseapp.com",
    projectId: "nesttask-diu",
    storageBucket: "nesttask-diu.firebasestorage.app",
    messagingSenderId: "743430115138",
    appId: "1:743430115138:web:3cbbdc0c149def8f88c2db",
    measurementId: "G-37LEQPKB3B"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Track the service worker lifecycle
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated.');
  event.waitUntil(clients.claim());
});

// Keep service worker alive with periodic ping
setInterval(() => {
  console.log('Service worker ping - keeping alive');
  self.registration.update();
}, 20 * 60 * 1000); // Every 20 minutes

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  
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
  console.log('Notification clicked:', event);
  
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