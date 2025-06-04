import { messaging } from '../firebase';
import { supabase } from '../lib/supabase';
import { getToken } from 'firebase/messaging';

const VAPID_KEY = 'BP0PQk228HtybCDJ7LkkRGd437hwZjbC0SAQYM4Pk2n5PyFRfbxKoRKq7ze6lFuTM1njp7f9y0oaWFM5D_k5TS4';
const FCM_TOKEN_STORAGE_KEY = 'nesttask_fcm_token';
const FCM_TOKEN_TIMEOUT = 45000; // 45 seconds timeout

/**
 * Get current device information for token tracking
 * @returns Object with device details
 */
export const getDeviceInfo = () => {
  return {
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Get the FCM token, using cached token if available to ensure consistency
 * @returns Promise<string | null> FCM token or null if unavailable
 */
export const getFcmToken = async (): Promise<string | null> => {
  try {
    // Try to get cached token first
    const cachedToken = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    
    if (cachedToken) {
      console.log('[FCM] Using cached token');
      return cachedToken;
    }
    
    // Check if service worker is registered
    const registrations = await navigator.serviceWorker.getRegistrations();
    const swRegistration = registrations.find(reg => 
      reg.active?.scriptURL.includes('firebase-messaging-sw.js'));
    
    if (!swRegistration) {
      console.warn('[FCM] Firebase messaging service worker not registered');
      try {
        console.log('[FCM] Attempting to register service worker');
        await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        console.log('[FCM] Service worker registered successfully');
      } catch (error) {
        console.error('[FCM] Service worker registration failed:', error);
        return null;
      }
    }
    
    // No cached token, generate a new one with timeout
    console.log('[FCM] Generating new token');
    
    // Create an AbortController for the timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FCM_TOKEN_TIMEOUT);
    
    try {
      // Request the token with timeout
      const tokenPromise = getToken(messaging, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration
      });
      
      const token = await Promise.race([
        tokenPromise,
        new Promise<string>((_, reject) => {
          setTimeout(() => reject(new Error('FCM token request timeout')), FCM_TOKEN_TIMEOUT);
        })
      ]);
      
      if (token) {
        // Cache the token to prevent generating different ones
        localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
        console.log('[FCM] New token generated and cached');
        return token;
      }
    } catch (tokenError) {
      console.error('[FCM] Error getting token:', tokenError);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
    
    console.error('[FCM] Failed to generate token');
    return null;
  } catch (error) {
    console.error('[FCM] Error in getFcmToken:', error);
    return null;
  }
};

/**
 * Save FCM token to the database for the user
 * @param userId User ID to associate with the token
 * @returns Promise<boolean> Success status
 */
export const saveFcmToken = async (userId: string): Promise<boolean> => {
  try {
    // Get token (either from cache or generate new)
    const token = await getFcmToken();
    
    if (!token) {
      console.error('[FCM] No token to save');
      return false;
    }
    
    // Get device info
    const deviceInfo = getDeviceInfo();
    
    // Check if token already exists for this user (handle response with care)
    const fetchResponse = await supabase
      .from('fcm_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('fcm_token', token);
    
    const existingTokens = fetchResponse.data || [];
    const fetchError = fetchResponse.error;
    
    if (fetchError) {
      console.error('[FCM] Error checking existing token:', fetchError);
      // Try direct insertion as fallback
      return await insertNewToken(userId, token, deviceInfo);
    }
    
    // If token exists, update its metadata
    if (existingTokens.length > 0) {
      const updateResponse = await supabase
        .from('fcm_tokens')
        .update({
          last_used: new Date().toISOString(),
          device_info: deviceInfo,
          is_active: true
        })
        .eq('id', existingTokens[0].id);
      
      if (updateResponse.error) {
        console.error('[FCM] Error updating token:', updateResponse.error);
        return false;
      }
      
      console.log('[FCM] Token updated successfully');
      return true;
    }
    
    // If token doesn't exist, create a new record
    return await insertNewToken(userId, token, deviceInfo);
  } catch (error) {
    console.error('[FCM] Error in saveFcmToken:', error);
    return false;
  }
};

/**
 * Helper function to insert a new token record
 */
async function insertNewToken(userId: string, token: string, deviceInfo: any): Promise<boolean> {
  try {
    const insertResponse = await supabase
      .from('fcm_tokens')
      .insert({
        user_id: userId,
        fcm_token: token,
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
        device_info: deviceInfo,
        is_active: true
      });
    
    if (insertResponse.error) {
      console.error('[FCM] Error saving token:', insertResponse.error);
      
      // Try update as fallback in case of conflict
      if (insertResponse.error.code === '23505') { // Duplicate key error
        const updateResponse = await supabase
          .from('fcm_tokens')
          .update({
            user_id: userId,
            last_used: new Date().toISOString(),
            device_info: deviceInfo,
            is_active: true
          })
          .eq('fcm_token', token);
        
        if (updateResponse.error) {
          console.error('[FCM] Error in fallback update:', updateResponse.error);
          return false;
        }
        
        console.log('[FCM] Token updated via fallback method');
        return true;
      }
      
      return false;
    }
    
    console.log('[FCM] Token saved successfully');
    return true;
  } catch (error) {
    console.error('[FCM] Error in insertNewToken:', error);
    return false;
  }
}

/**
 * Unregister FCM token for a user
 * @param userId User ID to unregister
 * @returns Promise<boolean> Success status
 */
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
        // Continue to remove from localStorage even if database delete fails
      }
    }
    
    // Always clear from local storage
    localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
    console.log('[FCM] Token removed successfully');
    return true;
  } catch (error) {
    console.error('[FCM] Error removing token:', error);
    // Still try to remove from localStorage
    localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
    return false;
  }
}; 