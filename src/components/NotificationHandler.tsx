import { useEffect, useState, useCallback } from 'react';
import { onMessageListener } from '../firebase';
import { useMessaging } from './FirebaseMessagingProvider';

interface FCMPayload {
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
}

export const NotificationHandler: React.FC = () => {
  const { permissionStatus } = useMessaging();
  const [lastMessage, setLastMessage] = useState<FCMPayload | null>(null);

  // Function to display notification
  const displayNotification = useCallback(async (payload: FCMPayload) => {
    try {
      console.log('Displaying notification from payload:', payload);
      
      // Check if we have permission to show notifications
      if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted, cannot show notification');
        return;
      }
      
      // Check if we have the required data
      if (!payload.notification?.title) {
        console.warn('Invalid notification payload, missing title');
        return;
      }
      
      // Create and show the notification
      const notification = new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: payload.data,
        tag: payload.data?.tag || 'default',
      });
      
      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        
        // Get URL from data or default to root
        const url = payload.data?.url || '/';
        
        // Focus window if already open
        if (window.parent) {
          window.parent.focus();
        }
        
        // Navigate to the URL
        window.location.href = url;
        
        // Close the notification
        notification.close();
      };
      
      console.log('Notification displayed successfully');
    } catch (error) {
      console.error('Error displaying notification:', error);
    }
  }, []);

  // Set up message listener
  useEffect(() => {
    if (permissionStatus !== 'granted') {
      console.log('Notification permission not granted, skipping message listener setup');
      return;
    }
    
    console.log('Setting up FCM message listener');
    
    // Create a message listener
    const messagePromise = onMessageListener()
      .then((payload: unknown) => {
        console.log('Received FCM message:', payload);
        
        // Validate payload
        if (!payload || 
            typeof payload !== 'object' || 
            !('notification' in payload)) {
          console.warn('Invalid FCM payload format:', payload);
          return;
        }
        
        // Type cast payload
        const typedPayload = payload as FCMPayload;
        
        // Store the message
        setLastMessage(typedPayload);
        
        // Display the notification
        displayNotification(typedPayload);
      })
      .catch((error) => {
        console.error('Error in FCM message listener:', error);
      });
    
    // Set up service worker messaging
    const setupServiceWorkerMessaging = async () => {
      try {
        // Get service worker registration
        const registration = await navigator.serviceWorker.ready;
        
        // Set up message event listener
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('Received message from service worker:', event.data);
          
          // Handle specific message types
          if (event.data?.type === 'NOTIFICATION') {
            displayNotification(event.data.payload);
          }
        });
        
        // Send a ping to the service worker every 15 minutes to keep it alive
        setInterval(() => {
          if (registration.active) {
            const channel = new MessageChannel();
            
            // Listen for the response
            channel.port1.onmessage = (event) => {
              console.log('Service worker responded:', event.data);
            };
            
            // Send the message
            registration.active.postMessage({
              type: 'PING',
              timestamp: Date.now()
            }, [channel.port2]);
          }
        }, 15 * 60 * 1000);
      } catch (error) {
        console.error('Error setting up service worker messaging:', error);
      }
    };
    
    // Run setup
    setupServiceWorkerMessaging();
    
    // No explicit cleanup needed for the promise
    return () => {
      console.log('Notification handler unmounted');
    };
  }, [permissionStatus, displayNotification]);

  return null;
};

export default NotificationHandler;