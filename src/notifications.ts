import { messaging } from './firebase';
import { supabase } from './lib/supabase';
import { getToken } from 'firebase/messaging';

export const requestNotificationPermission = async (userId: string) => {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return false;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      try {
        const token = await getToken(messaging, {
          vapidKey: 'BP0PQk228HtybCDJ7LkkRGd437hwZjbC0SAQYM4Pk2n5PyFRfbxKoRKq7ze6lFuTM1njp7f9y0oaWFM5D_k5TS4',
        });
        console.log('FCM Token:', token);

        if (token) {
          // Store the token in Supabase
          const { error } = await supabase
            .from('fcm_tokens')
            .upsert({ 
              user_id: userId, 
              fcm_token: token, 
              created_at: new Date().toISOString(),
              last_used: new Date().toISOString()
            });
          
          if (error) {
            console.error('Error saving FCM token:', error);
            return false;
          } else {
            console.log('FCM token saved to Supabase');
            return true;
          }
        } else {
          console.error('No FCM token received');
          return false;
        }
      } catch (tokenError) {
        console.error('Error getting FCM token:', tokenError);
        return false;
      }
    } else {
      console.log('Notification permission denied.');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Function to check if the user has already granted notification permission
export const checkNotificationPermission = () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};

// Function to unsubscribe from notifications
export const unsubscribeFromNotifications = async (userId: string) => {
  try {
    // Delete the FCM token from Supabase
    const { error } = await supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error deleting FCM token:', error);
      return false;
    } else {
      console.log('FCM token deleted from Supabase');
      return true;
    }
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error);
    return false;
  }
};