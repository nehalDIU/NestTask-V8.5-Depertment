import { useEffect, useState } from 'react';
import { onMessageListener } from '../firebase';

interface FCMPayload {
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
}

export const NotificationHandler: React.FC = () => {
  const [notificationPermission, setNotificationPermission] = useState<string>('default');

  useEffect(() => {
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    // Set up the message listener
    const messageListener = onMessageListener()
      .then((payload: unknown) => {
        try {
          console.log('Received FCM message:', payload);
          
          // Type guard to ensure payload has the correct structure
          if (payload && 
              typeof payload === 'object' && 
              'notification' in payload && 
              payload.notification && 
              typeof payload.notification === 'object' &&
              'title' in payload.notification &&
              'body' in payload.notification) {
            
            const { notification } = payload as FCMPayload;
            
            // Check if we have permission to show notifications
            if (notificationPermission === 'granted') {
              new Notification(notification.title, {
                body: notification.body,
                icon: '/icons/icon-192x192.png', // Ensure this path is correct
                data: (payload as FCMPayload).data,
              });
            } else {
              console.log('Notification permission not granted');
            }
          } else {
            console.error('Invalid FCM payload format:', payload);
          }
        } catch (error) {
          console.error('Error displaying notification:', error);
        }
      })
      .catch((error: unknown) => {
        console.error('Error in FCM message listener:', error);
      });

    // Return cleanup function
    return () => {
      // No explicit cleanup needed for the promise
      console.log('Notification handler unmounted');
    };
  }, [notificationPermission]);

  return null;
};

export default NotificationHandler;