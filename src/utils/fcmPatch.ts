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