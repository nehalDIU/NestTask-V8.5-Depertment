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
    
    // Use the safe SQL function we created to handle the token
    const { data, error } = await supabase.rpc('update_fcm_token', {
      p_user_id: userId,
      p_token: token,
      p_device_info: deviceInfo
    });
    
    if (error) {
      // Log the specific error
      console.error('[FCM] Error saving token with RPC:', error);
      
      // Fall back to direct insert if the function doesn't exist
      if (error.code === '42883') { // Function doesn't exist
        console.warn('[FCM] RPC function not found, using fallback insert method');
        
        try {
          // Try insert first, ignoring unique constraint errors
          const { error: insertError } = await supabase
            .from('fcm_tokens')
            .insert({
              user_id: userId,
              fcm_token: token,
              device_info: deviceInfo,
              is_active: true
            });
          
          if (insertError) {
            // If insert fails with unique violation, we know the token exists
            if (insertError.code === '23505') {
              console.log('[FCM] Token already exists, updating user_id');
              
              // Use a safer approach that avoids direct token comparison
              const { error: updateError } = await supabase.rpc('exec_sql', {
                sql_query: `UPDATE fcm_tokens 
                          SET user_id = '${userId}', 
                              last_used = NOW(),
                              is_active = true,
                              device_info = '${JSON.stringify(deviceInfo).replace(/'/g, "''")}'
                          WHERE id IN (
                            SELECT id FROM fcm_tokens 
                            ORDER BY created_at DESC 
                            LIMIT 1
                          )`
              });
              
              if (updateError) {
                console.error('[FCM] Fallback update failed:', updateError);
                return false;
              }
            } else {
              console.error('[FCM] Insert failed:', insertError);
              return false;
            }
          }
          
          console.log('[FCM] Token saved with fallback method');
          return true;
        } catch (fallbackError) {
          console.error('[FCM] All fallback methods failed:', fallbackError);
          return false;
        }
      }
      
      return false;
    }
    
    console.log('[FCM] Token saved successfully with RPC function');
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
      // Use the safe deletion function
      const { data, error } = await supabase.rpc('delete_fcm_token', {
        p_token: token
      });
      
      if (error) {
        console.warn('[FCM] Error using RPC to delete token:', error);
        
        // Fall back to deactivating tokens by user_id
        if (error.code === '42883') { // Function doesn't exist
          const { error: fallbackError } = await supabase.rpc('deactivate_user_tokens', {
            p_user_id: userId
          });
          
          if (fallbackError && fallbackError.code === '42883') {
            // If that also fails, use direct SQL as last resort
            const { error: directError } = await supabase
              .from('fcm_tokens')
              .update({ is_active: false })
              .eq('user_id', userId);
            
            if (directError) {
              console.error('[FCM] All token deletion methods failed:', directError);
              // Continue to remove from localStorage even if database delete fails
            }
          }
        }
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