import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

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
const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

// Export token fetching function as both named and default export
export const getFcmToken = async () => {
  try {
    const token = await getToken(messaging, { 
      vapidKey: 'BP0PQk228HtybCDJ7LkkRGd437hwZjbC0SAQYM4Pk2n5PyFRfbxKoRKq7ze6lFuTM1njp7f9y0oaWFM5D_k5TS4' 
    });
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

// Add a default export for compatibility
export default { getFcmToken, onMessageListener, messaging };