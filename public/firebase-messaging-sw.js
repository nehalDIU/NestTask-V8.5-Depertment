// Firebase messaging service worker for background notifications
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyChI8shVaBxQ56eRinJEyslNx72Za_tUkM",
  authDomain: "nesttask-73c13.firebaseapp.com",
  projectId: "nesttask-73c13",
  storageBucket: "nesttask-73c13.firebasestorage.app",
  messagingSenderId: "128980799129",
  appId: "1:128980799129:web:8f96bd1343e5c08bf8f208"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log('Firebase initialized in service worker');
} catch (error) {
  console.error('Firebase initialization failed in service worker:', error);
}

// Initialize Firebase Cloud Messaging
let messaging;
try {
  messaging = firebase.messaging();
  console.log('Firebase messaging initialized in service worker');
} catch (error) {
  console.error('Firebase messaging initialization failed:', error);
}

// Handle background messages
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);

    try {
      const notificationTitle = payload.notification?.title || 'New Task Notification';
      const notificationOptions = {
        body: payload.notification?.body || 'You have a new task assigned',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: payload.data?.taskId || 'task-notification',
        data: {
          url: payload.data?.url || '/',
          taskId: payload.data?.taskId,
          type: payload.data?.type || 'task'
        },
        actions: [
          {
            action: 'view',
            title: 'View Task'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ],
        requireInteraction: true,
        silent: false
      };

      return self.registration.showNotification(notificationTitle, notificationOptions);
    } catch (error) {
      console.error('Error showing notification:', error);
      // Fallback notification
      return self.registration.showNotification('New Task Notification', {
        body: 'You have a new task assigned',
        icon: '/icons/icon-192x192.png'
      });
    }
  });
} else {
  console.error('Firebase messaging not available in service worker');
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'view') {
    // Open the app and navigate to the task
    const urlToOpen = event.notification.data?.url || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if app is already open
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              client.postMessage({
                type: 'NOTIFICATION_CLICK',
                data: event.notification.data
              });
              return client.focus();
            }
          }
          
          // Open new window if app is not open
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification (already done above)
    console.log('Notification dismissed');
  } else {
    // Default action - open the app
    const urlToOpen = event.notification.data?.url || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // Track notification close analytics if needed
  // You can send this data to your analytics service
});
