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
    
    // FCM tokens often contain characters that need special handling
    // Instead of trying to query by token which can cause 406 errors,
    // check if token exists by using a more reliable approach
    
    try {
      // First try to insert directly - if it fails with unique constraint error,
      // then we know the token already exists
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
      
      // If insert worked, we're done
      if (!insertResponse.error) {
        console.log('[FCM] Token saved successfully');
        return true;
      }
      
      // If it failed with duplicate key error, update the existing token
      if (insertResponse.error.code === '23505') { // Duplicate key error
        // Since we can't easily query by the token due to encoding issues,
        // use a safer approach with an anonymous function to encode properly
        const { error: updateError } = await supabase.rpc('update_fcm_token', {
          p_user_id: userId,
          p_token: token,
          p_device_info: deviceInfo
        });
        
        if (updateError) {
          // Fallback to manual update query if RPC function doesn't exist
          console.warn('[FCM] RPC function not found, using fallback update method');
          
          // Use a raw SQL query which avoids encoding issues
          // Note: This is less safe but works as a fallback
          const { error: rawUpdateError } = await supabase.rpc('exec_sql', {
            sql_query: `UPDATE fcm_tokens 
                        SET user_id = '${userId}', 
                            last_used = NOW(),
                            is_active = true
                        WHERE fcm_token = '${token.replace(/'/g, "''")}'`
          });
          
          if (rawUpdateError) {
            // If everything fails, try the most direct approach
            if (rawUpdateError.code === '404') {
              console.warn('[FCM] RPC functions not available, using basic insert method');
              
              // Since we can't query by token and know it exists, try to update based on userId
              // This may result in orphaned tokens but at least provides some functionality
              const { error: basicUpdateError } = await supabase
                .from('fcm_tokens')
                .update({
                  fcm_token: token,
                  last_used: new Date().toISOString(),
                  device_info: deviceInfo,
                  is_active: true
                })
                .eq('user_id', userId);
              
              if (basicUpdateError) {
                console.error('[FCM] All update attempts failed:', basicUpdateError);
                return false;
              }
            } else {
              console.error('[FCM] Error in fallback raw update:', rawUpdateError);
              return false;
            }
          }
        }
        
        console.log('[FCM] Token updated successfully');
        return true;
      }
      
      // Any other insert error
      console.error('[FCM] Error saving token:', insertResponse.error);
      return false;
    } catch (error) {
      console.error('[FCM] Error in token save/update:', error);
      return false;
    }
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
      // Don't try to directly query by token due to encoding issues
      // Instead use userId which is safer
      const { error } = await supabase
        .from('fcm_tokens')
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        console.error('[FCM] Error deleting tokens from database:', error);
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