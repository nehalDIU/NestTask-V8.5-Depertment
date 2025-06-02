import { initializeApp } from 'firebase/app';
import { getMessaging, onMessage } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: "AIzaSyACfcXjX0vNXWNduCRks1Z6LRa9XAY2pJ8",
    authDomain: "nesttask-diu.firebaseapp.com",
    projectId: "nesttask-diu",
    storageBucket: "nesttask-diu.appspot.com",
    messagingSenderId: "743430115138",
    appId: "1:743430115138:web:3cbbdc0c149def8f88c2db",
    measurementId: "G-37LEQPKB3B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

// Handle foreground messages
export const onForegroundMessage = () => {
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      
      // Show a notification if the app is in the foreground
      if (Notification.permission === 'granted') {
        const notificationTitle = payload.notification?.title || 'NestTask Notification';
        const notificationOptions = {
          body: payload.notification?.body || '',
          icon: payload.notification?.icon || '/logo192.png',
          badge: '/badge-icon.png',
          data: payload.data || {},
        };
        
        // Show the notification
        const notification = new Notification(notificationTitle, notificationOptions);
        
        // Handle notification click
        notification.onclick = () => {
          notification.close();
          window.focus();
          
          // Navigate to a specific URL if provided
          if (payload.data?.url) {
            window.location.href = payload.data.url;
          }
        };
      }
      
      resolve(payload);
    });
  });
};