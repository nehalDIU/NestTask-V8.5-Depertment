// FCM Token Fix Script
// This script helps ensure consistent FCM token generation and storage

// Constants
const FCM_TOKEN_STORAGE_KEY = 'nesttask_fcm_token';

/**
 * Steps to fix the FCM token issue:
 * 
 * 1. Use localStorage to cache the FCM token once generated
 * 2. Always check for a cached token before generating a new one
 * 3. Store device information with the token for better tracking
 * 4. Check for existing tokens before inserting to avoid duplicates
 * 5. Update existing tokens instead of creating new ones for the same device
 * 
 * Implementation plan:
 * - Create a new utility file: src/utils/fcmPatch.ts with the code below
 * - Update src/services/pushNotification.service.ts to use the patch
 * - Test the implementation
 */

// ---------- IMPLEMENTATION ----------

/**
 * src/utils/fcmPatch.ts
 */
/*
import { messaging } from '../firebase';
import { getToken } from 'firebase/messaging';
import { supabase } from '../lib/supabase';

// Storage key for consistent token retrieval
const FCM_TOKEN_STORAGE_KEY = 'nesttask_fcm_token';
const VAPID_KEY = 'BP0PQk228HtybCDJ7LkkRGd437hwZjbC0SAQYM4Pk2n5PyFRfbxKoRKq7ze6lFuTM1njp7f9y0oaWFM5D_k5TS4';

/**
 * Patch function to fix FCM token generation and storage
 * This will ensure the same token is used consistently and stored properly
 * @param userId User ID to associate with the token
 * @returns Whether the operation was successful
 */
export async function fixFcmToken(userId: string): Promise<boolean> {
  try {
    console.log('[FCM Patch] Starting FCM token fix...');
    
    // 1. Check if we have a cached token
    const cachedToken = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    let tokenToUse: string | null = null;
    
    if (cachedToken) {
      console.log('[FCM Patch] Using cached token');
      tokenToUse = cachedToken;
    } else {
      // 2. No cached token, generate a new one
      console.log('[FCM Patch] Generating new token');
      try {
        tokenToUse = await getToken(messaging, {
          vapidKey: VAPID_KEY
        });
        
        if (tokenToUse) {
          console.log('[FCM Patch] New token generated');
          localStorage.setItem(FCM_TOKEN_STORAGE_KEY, tokenToUse);
        }
      } catch (err) {
        console.error('[FCM Patch] Error generating token:', err);
        return false;
      }
    }
    
    if (!tokenToUse) {
      console.error('[FCM Patch] No token available');
      return false;
    }
    
    // 3. Get device information for better tracking
    const deviceInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      timestamp: new Date().toISOString()
    };
    
    // 4. Check if this token is already registered for this user
    const { data: existingTokens, error: fetchError } = await supabase
      .from('fcm_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('fcm_token', tokenToUse);
      
    if (fetchError) {
      console.error('[FCM Patch] Error checking existing tokens:', fetchError);
      return false;
    }
    
    // 5. If token exists, just update the last_used time and device info
    if (existingTokens && existingTokens.length > 0) {
      console.log('[FCM Patch] Token exists, updating');
      
      const { error: updateError } = await supabase
        .from('fcm_tokens')
        .update({
          last_used: new Date().toISOString(),
          device_info: deviceInfo,
          is_active: true
        })
        .eq('id', existingTokens[0].id);
        
      if (updateError) {
        console.error('[FCM Patch] Error updating token:', updateError);
        return false;
      }
      
      console.log('[FCM Patch] Token updated successfully');
      return true;
    }
    
    // 6. New token, insert it
    console.log('[FCM Patch] Saving new token');
    const { error: insertError } = await supabase
      .from('fcm_tokens')
      .insert({
        user_id: userId,
        fcm_token: tokenToUse,
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
        device_info: deviceInfo,
        is_active: true
      });
      
    if (insertError) {
      console.error('[FCM Patch] Error saving token:', insertError);
      return false;
    }
    
    console.log('[FCM Patch] Token saved successfully');
    return true;
  } catch (error) {
    console.error('[FCM Patch] Error fixing FCM token:', error);
    return false;
  }
}

/**
 * Remove the user's FCM token
 * @param userId User ID to remove token for
 * @returns Whether the operation was successful
 */
export async function removeFcmToken(userId: string): Promise<boolean> {
  try {
    const cachedToken = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    
    if (cachedToken) {
      // Delete the specific token
      const { error } = await supabase
        .from('fcm_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('fcm_token', cachedToken);
        
      if (error) {
        console.error('[FCM Patch] Error removing token:', error);
      }
    } else {
      // No cached token, remove all tokens for this user
      const { error } = await supabase
        .from('fcm_tokens')
        .delete()
        .eq('user_id', userId);
        
      if (error) {
        console.error('[FCM Patch] Error removing all tokens:', error);
      }
    }
    
    // Always clear the local cache
    localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('[FCM Patch] Error removing FCM token:', error);
    return false;
  }
}
*/

/**
 * src/services/pushNotification.service.ts
 */
/*
import { checkNotificationPermission } from '../notifications';
import { fixFcmToken, removeFcmToken } from '../utils/fcmPatch';

/**
 * Request notification permission and register the user's device for push notifications
 * @param userId The user ID to associate with the notification token
 * @returns A promise that resolves to true if the permission was granted and token saved, false otherwise
 */
export async function registerForPushNotifications(userId: string): Promise<boolean> {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return false;
    }
    
    // Request permission if needed
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return false;
      }
    }
    
    // Use our patched function to fix FCM token issues
    const success = await fixFcmToken(userId);
    
    if (!success) {
      console.warn('Failed to register for push notifications');
      return false;
    }
    
    console.log('Successfully registered for push notifications');
    return true;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return false;
  }
}

/**
 * Unregister the user's device from push notifications
 * @param userId The user ID associated with the notification token
 * @returns A promise that resolves to true if the token was removed, false otherwise
 */
export async function unregisterFromPushNotifications(userId: string): Promise<boolean> {
  try {
    // Use our patched function to remove FCM token consistently
    const success = await removeFcmToken(userId);
    
    if (!success) {
      console.warn('Failed to unregister from push notifications');
      return false;
    }
    
    console.log('Successfully unregistered from push notifications');
    return true;
  } catch (error) {
    console.error('Error unregistering from push notifications:', error);
    return false;
  }
}
*/

// ---------- ALTERNATIVE FIX ----------

/**
 * If you're unable to modify multiple files, you can also fix the issue in notifications.ts:
 * 
 * 1. Update the requestNotificationPermission function to use localStorage
 * 2. Always check for existing tokens before creating new ones
 * 3. Add device information to better track tokens
 */

/*
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
        // Check if we have a cached token
        const FCM_TOKEN_KEY = 'nesttask_fcm_token';
        const cachedToken = localStorage.getItem(FCM_TOKEN_KEY);
        let token;

        if (cachedToken) {
          console.log('Using cached FCM token');
          token = cachedToken;
        } else {
          // Generate a new token
          token = await getToken(messaging, {
            vapidKey: 'BP0PQk228HtybCDJ7LkkRGd437hwZjbC0SAQYM4Pk2n5PyFRfbxKoRKq7ze6lFuTM1njp7f9y0oaWFM5D_k5TS4',
          });
          
          // Cache the token if it exists
          if (token) {
            localStorage.setItem(FCM_TOKEN_KEY, token);
          }
        }
        
        console.log('FCM Token:', token);

        if (token) {
          // Get device info for tracking
          const deviceInfo = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
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
            console.error('Error checking existing FCM token:', fetchError);
            return false;
          }
          
          // If token exists, update it
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
              console.error('Error updating FCM token:', updateError);
              return false;
            }
            
            console.log('FCM token updated successfully');
            return true;
          }
          
          // Store the token in Supabase
          const { error } = await supabase
            .from('fcm_tokens')
            .insert({ 
              user_id: userId, 
              fcm_token: token, 
              created_at: new Date().toISOString(),
              last_used: new Date().toISOString(),
              device_info: deviceInfo,
              is_active: true
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
*/ 