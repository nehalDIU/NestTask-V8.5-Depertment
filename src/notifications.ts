import { messaging } from './firebase';
import { supabase } from './lib/supabase';
import { getToken } from 'firebase/messaging';

// Define a max retry limit to prevent infinite loops
const MAX_RETRIES = 3;
const REGISTRATION_TIMEOUT = 30000; // 30 seconds

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
      
      // Try to register the service worker directly first
      await registerServiceWorker();
      
      return await getAndSaveFcmToken(userId);
    } else {
      console.log('Notification permission denied.');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Separate function to register the service worker
const registerServiceWorker = async () => {
  try {
    // First check if service worker is already registered
    const registrations = await navigator.serviceWorker.getRegistrations();
    const swRegistration = registrations.find(reg => 
      reg.active?.scriptURL.includes('firebase-messaging-sw.js'));
    
    if (swRegistration) {
      console.log('Firebase messaging service worker already registered');
      return swRegistration;
    }
    
    console.log('Registering Firebase messaging service worker...');
    return await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
  } catch (error) {
    console.error('Service worker registration failed:', error);
    throw error;
  }
};

// Separate function to get and save FCM token with retries
const getAndSaveFcmToken = async (userId: string, retryCount = 0) => {
  try {
    console.log(`Attempting to get FCM token (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
    
    // Set a timeout to prevent hanging
    const tokenPromise = getToken(messaging, {
      vapidKey: 'BP0PQk228HtybCDJ7LkkRGd437hwZjbC0SAQYM4Pk2n5PyFRfbxKoRKq7ze6lFuTM1njp7f9y0oaWFM5D_k5TS4',
    });
    
    // Race with a timeout promise
    const token = await Promise.race([
      tokenPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('FCM token retrieval timeout')), REGISTRATION_TIMEOUT)
      )
    ]) as string;

    if (token) {
      console.log('FCM Token retrieved successfully');
      
      // First check if this token already exists
      const { data: existingToken } = await supabase
        .from('fcm_tokens')
        .select('*')
        .eq('fcm_token', token)
        .single();
      
      if (existingToken) {
        console.log('Token already exists in database, updating user_id and last_used');
        
        // If token exists but belongs to a different user, update it
        if (existingToken.user_id !== userId) {
          const { error: updateError } = await supabase
            .from('fcm_tokens')
            .update({ 
              user_id: userId,
              last_used: new Date().toISOString(),
              device_info: getBrowserInfo()
            })
            .eq('fcm_token', token);
          
          if (updateError) {
            console.error('Error updating existing FCM token:', updateError);
            return false;
          }
          
          console.log('FCM token ownership updated to current user');
          return true;
        } else {
          // If token exists for the same user, just update the last_used timestamp
          const { error: updateError } = await supabase
            .from('fcm_tokens')
            .update({ 
              last_used: new Date().toISOString(),
              device_info: getBrowserInfo()
            })
            .eq('fcm_token', token);
          
          if (updateError) {
            console.error('Error updating FCM token timestamp:', updateError);
            return false;
          }
          
          console.log('FCM token last_used timestamp updated');
          return true;
        }
      } else {
        // Token doesn't exist, insert it
        console.log('Saving new FCM token to database');
        const { error } = await supabase
          .from('fcm_tokens')
          .insert({ 
            user_id: userId, 
            fcm_token: token,
            device_info: getBrowserInfo(),
            created_at: new Date().toISOString(),
            last_used: new Date().toISOString(),
            is_active: true
          });
        
        if (error) {
          // If there's still a conflict despite our check, try update as fallback
          if (error.code === '23505') { // Duplicate key error
            console.warn('Duplicate key error despite check, trying update as fallback');
            const { error: updateError } = await supabase
              .from('fcm_tokens')
              .update({ 
                user_id: userId,
                last_used: new Date().toISOString(),
                device_info: getBrowserInfo(),
                is_active: true
              })
              .eq('fcm_token', token);
            
            if (updateError) {
              console.error('Error in fallback update of FCM token:', updateError);
              return false;
            }
            
            console.log('FCM token updated via fallback method');
            return true;
          }
          
          console.error('Error saving FCM token:', error);
          return false;
        } else {
          console.log('New FCM token saved to Supabase');
          return true;
        }
      }
    } else {
      console.error('No FCM token received');
      return false;
    }
  } catch (tokenError) {
    console.error('Error getting FCM token:', tokenError);
    
    // Retry logic with exponential backoff
    if (retryCount < MAX_RETRIES) {
      const backoffTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
      console.log(`Retrying in ${backoffTime}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      return getAndSaveFcmToken(userId, retryCount + 1);
    }
    
    return false;
  }
};

// Function to get browser info for debugging
const getBrowserInfo = () => {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    vendor: navigator.vendor,
    timestamp: new Date().toISOString()
  };
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