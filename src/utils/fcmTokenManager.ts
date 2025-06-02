import { messaging } from '../firebase';
import { supabase } from '../lib/supabase';
import { getToken } from 'firebase/messaging';

const VAPID_KEY = 'BP0PQk228HtybCDJ7LkkRGd437hwZjbC0SAQYM4Pk2n5PyFRfbxKoRKq7ze6lFuTM1njp7f9y0oaWFM5D_k5TS4';
const FCM_TOKEN_STORAGE_KEY = 'nesttask_fcm_token';

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
    
    // No cached token, generate a new one
    console.log('[FCM] Generating new token');
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    
    if (token) {
      // Cache the token to prevent generating different ones
      localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
      console.log('[FCM] New token generated and cached');
      return token;
    }
    
    console.error('[FCM] Failed to generate token');
    return null;
  } catch (error) {
    console.error('[FCM] Error getting token:', error);
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
      return false;
    }
    
    // Get device info
    const deviceInfo = getDeviceInfo();
    
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
    
    // If token exists, update its metadata
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
    
    // If token doesn't exist, create a new record
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