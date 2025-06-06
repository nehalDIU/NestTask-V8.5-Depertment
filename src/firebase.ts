import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { supabase } from './lib/supabase';

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

// VAPID key for web push notifications
const VAPID_KEY = 'BP0PQk228HtybCDJ7LkkRGd437hwZjbC0SAQYM4Pk2n5PyFRfbxKoRKq7ze6lFuTM1njp7f9y0oaWFM5D_k5TS4';

// Storage key for FCM token
const FCM_TOKEN_STORAGE_KEY = 'nesttask_fcm_token';

// Initialize messaging if supported
let messagingInstance = null;

export const initializeMessaging = async () => {
  try {
    if (await isSupported()) {
      messagingInstance = getMessaging(app);
      console.log('[FCM] Messaging initialized');
      return true;
    } else {
      console.warn('[FCM] Firebase messaging is not supported in this browser');
      return false;
    }
  } catch (error) {
    console.error('[FCM] Error initializing messaging:', error);
    return false;
  }
};

// Get Firebase messaging instance
export const getMessagingInstance = async () => {
  if (!messagingInstance) {
    await initializeMessaging();
  }
  return messagingInstance;
};

// Get the FCM token
export const getFcmToken = async (): Promise<string | null> => {
  try {
    // Try to get cached token first to prevent generating different ones
    const cachedToken = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    if (cachedToken) {
      console.log('[FCM] Using cached token');
      return cachedToken;
    }

    const messagingInstance = await getMessagingInstance();
    if (!messagingInstance) {
      console.warn('[FCM] Messaging not supported');
      return null;
    }

    console.log('[FCM] Requesting new token');
    const token = await getToken(messagingInstance, { vapidKey: VAPID_KEY });
    
    if (token) {
      // Cache the token
      localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
      console.log('[FCM] New token generated and cached');
      return token;
    }
    
    console.error('[FCM] No token was generated');
    return null;
  } catch (error) {
    console.error('[FCM] Error getting FCM token:', error);
    return null;
  }
};

// Save FCM token to the database
export const saveFcmToken = async (userId: string): Promise<boolean> => {
  try {
    const token = await getFcmToken();
    
    if (!token) {
      console.error('[FCM] No token available to save');
      return false;
    }
    
    // Get device info for better tracking
    const deviceInfo = {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      timestamp: new Date().toISOString()
    };
    
    // Check if token already exists for this user
    const { data: existingTokens, error: fetchError } = await supabase
      .from('fcm_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('fcm_token', token);
    
    if (fetchError) {
      console.error('[FCM] Error checking existing token:', fetchError);
      return false;
    }
    
    // Update existing token
    if (existingTokens && existingTokens.length > 0) {
      const { error: updateError } = await supabase
        .from('fcm_tokens')
        .update({
          last_used: new Date().toISOString(),
          device_info: deviceInfo,
          is_active: true
        })
        .eq('id', existingTokens[0].id);
      
      if (updateError) {
        console.error('[FCM] Error updating token:', updateError);
        return false;
      }
      
      console.log('[FCM] Token updated successfully');
      return true;
    }
    
    // Insert new token
    const { error: insertError } = await supabase
      .from('fcm_tokens')
      .insert({
        user_id: userId,
        fcm_token: token,
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
        device_info: deviceInfo,
        is_active: true
      });
    
    if (insertError) {
      console.error('[FCM] Error saving token:', insertError);
      return false;
    }
    
    console.log('[FCM] Token saved successfully');
    return true;
  } catch (error) {
    console.error('[FCM] Error in saveFcmToken:', error);
    return false;
  }
};

// Remove FCM token
export const removeFcmToken = async (userId: string): Promise<boolean> => {
  try {
    const token = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    
    if (token) {
      // Remove token from database
      const { error } = await supabase
        .from('fcm_tokens')
        .delete()
        .match({ user_id: userId, fcm_token: token });
      
      if (error) {
        console.error('[FCM] Error deleting token from database:', error);
        return false;
      }
    }
    
    // Always clear from local storage
    localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
    console.log('[FCM] Token removed successfully');
    return true;
  } catch (error) {
    console.error('[FCM] Error removing token:', error);
    return false;
  }
};

// Handle foreground messages
export const onForegroundMessage = async () => {
  const messagingInstance = await getMessagingInstance();
  if (!messagingInstance) {
    console.warn('[FCM] Cannot set up foreground handler - messaging not supported');
    return null;
  }
  
  return new Promise((resolve) => {
    onMessage(messagingInstance, (payload) => {
      console.log('[FCM] Foreground message received:', payload);
      
      // Show a notification if the app is in the foreground
      if (Notification.permission === 'granted') {
        const notificationTitle = payload.notification?.title || 'NestTask Notification';
        const notificationOptions = {
          body: payload.notification?.body || '',
          icon: payload.notification?.icon || '/icons/icon-192x192.png',
          badge: '/icons/badge-128x128.png',
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