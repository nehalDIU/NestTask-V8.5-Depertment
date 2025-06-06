// Firebase Cloud Messaging Service Worker

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Firebase configuration
firebase.initializeApp({
  apiKey: "AIzaSyACfcXjX0vNXWNduCRks1Z6LRa9XAY2pJ8",
  authDomain: "nesttask-diu.firebaseapp.com",
  projectId: "nesttask-diu",
  storageBucket: "nesttask-diu.appspot.com",
  messagingSenderId: "743430115138",
  appId: "1:743430115138:web:3cbbdc0c149def8f88c2db",
  measurementId: "G-37LEQPKB3B"
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'NestTask Notification';
  const notificationOptions = {
    body: payload.notification.body || '',
    icon: payload.notification.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge-128x128.png',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Notification click handler
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click Received.', event);

  event.notification.close();

  // Get the notification data
  const notificationData = event.notification.data;
  
  // Handle click action - open a window/tab with the provided URL or default to the app's root
  const urlToOpen = notificationData && notificationData.url 
    ? notificationData.url 
    : self.location.origin;

  // This looks to see if the current window is already open and focuses it
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open a new window if no matching client is found
      return self.clients.openWindow(urlToOpen);
    })
  );
});