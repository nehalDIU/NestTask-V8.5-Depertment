import { supabase } from '../lib/supabase';
import { getFcmToken } from '../firebase';

interface TokenRegistrationResult {
  success: boolean;
  token: string | null;
  error?: any;
}

// Maximum retry attempts for token operations
const MAX_RETRIES = 3;
// Delay between retry attempts (ms)
const RETRY_DELAY = 1000;

/**
 * Request notification permission with proper error handling
 * @returns The notification permission status
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  // Check browser support for notifications
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return 'denied';
  }

  // If permission already granted, return early
  if (Notification.permission === 'granted') {
    return 'granted';
  }

  // If already denied, no need to request again
  if (Notification.permission === 'denied') {
    return 'denied';
  }

  try {
    // Request permission
    return await Notification.requestPermission();
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'default';
  }
};

/**
 * Generate and register FCM token with Supabase with retries
 * @param retryCount Current retry attempt (used internally)
 * @returns Result object with token and status
 */
export const registerFcmToken = async (retryCount = 0): Promise<TokenRegistrationResult> => {
  try {
    // Step 1: Check and request permission if needed
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return { 
        success: false, 
        token: null, 
        error: `Notification permission not granted: ${permission}`
      };
    }

    // Step 2: Get FCM token with timeout
    let token: string | null = null;
    try {
      // Add timeout to token fetch to prevent hanging
      const tokenPromise = getFcmToken();
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('FCM token request timed out')), 10000)
      );
      
      token = await Promise.race([tokenPromise, timeoutPromise]) as string | null;
    } catch (error: any) {
      console.error(`Error getting FCM token (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);
      
      // Retry if under max attempts
      if (retryCount < MAX_RETRIES - 1) {
        console.log(`Retrying FCM token generation in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return registerFcmToken(retryCount + 1);
      }
      
      return { 
        success: false, 
        token: null, 
        error: `Failed to get FCM token after ${MAX_RETRIES} attempts: ${error.message || String(error)}`
      };
    }

    if (!token) {
      return { 
        success: false, 
        token: null, 
        error: 'FCM token generation returned null'
      };
    }

    console.log(`FCM token successfully generated: ${token.substring(0, 10)}...`);

    // Step 3: Get current user from Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting current user:', userError);
      return { 
        success: false, 
        token, 
        error: `Auth error: ${userError.message}` 
      };
    }
    
    if (!user) {
      console.log('No authenticated user found');
      return { 
        success: false, 
        token, 
        error: 'No authenticated user'
      };
    }

    // Step 4: Store token in Supabase
    // First clean up any old tokens from this device
    try {
      // Get device identifier - combination of user agent and other factors
      const deviceId = generateDeviceId();
      
      // Clean up old tokens for this device
      await supabase
        .from('fcm_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('device_info', deviceId);
    } catch (cleanupError) {
      // Non-fatal error, just log it
      console.warn('Error cleaning up old tokens:', cleanupError);
    }

    // Step 5: Store new token with device info
    const deviceInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      timestamp: new Date().toISOString()
    };
    
    const { error: upsertError } = await supabase
      .from('fcm_tokens')
      .upsert({
        user_id: user.id,
        fcm_token: token,
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
        device_info: JSON.stringify(deviceInfo)
      });
    
    if (upsertError) {
      console.error('Error storing FCM token in Supabase:', upsertError);
      
      // Retry if under max attempts
      if (retryCount < MAX_RETRIES - 1) {
        console.log(`Retrying token storage in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return registerFcmToken(retryCount + 1);
      }
      
      return { 
        success: false, 
        token, 
        error: `Database error: ${upsertError.message}`
      };
    }
    
    console.log('FCM token successfully registered in Supabase');
    return { success: true, token };
  } catch (error: any) {
    console.error('Unexpected error in FCM token registration:', error);
    
    // Final retry attempt if needed
    if (retryCount < MAX_RETRIES - 1) {
      console.log(`Retrying after unexpected error in ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * 2));
      return registerFcmToken(retryCount + 1);
    }
    
    return { 
      success: false, 
      token: null, 
      error: `Unexpected error: ${error.message || String(error)}`
    };
  }
};

/**
 * Generate a relatively stable device identifier
 * @returns A string identifier for the current device
 */
function generateDeviceId(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    window.screen.width,
    window.screen.height
  ];
  
  // Hash the components to create a device ID
  let hash = 0;
  const str = components.join('|');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  return 'device_' + Math.abs(hash).toString(16);
}

/**
 * Delete FCM token from Supabase
 * @param token The FCM token to delete
 * @returns Success status
 */
export const deleteFcmToken = async (token: string): Promise<boolean> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found when deleting token');
      return false;
    }

    // Delete the token
    const { error } = await supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('fcm_token', token);

    if (error) {
      console.error('Error deleting FCM token:', error);
      return false;
    }

    console.log('FCM token successfully deleted from Supabase');
    return true;
  } catch (error) {
    console.error('Unexpected error deleting FCM token:', error);
    return false;
  }
};

/**
 * Update FCM token last used timestamp
 * @param token The FCM token to update
 * @returns Success status
 */
export const updateFcmTokenUsage = async (token: string): Promise<boolean> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found when updating token usage');
      return false;
    }

    // Update the timestamp
    const { error } = await supabase
      .from('fcm_tokens')
      .update({ 
        last_used: new Date().toISOString() 
      })
      .eq('user_id', user.id)
      .eq('fcm_token', token);

    if (error) {
      console.error('Error updating FCM token usage:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error updating FCM token usage:', error);
    return false;
  }
};

/**
 * Clean up old tokens for the current user
 * Removes tokens that haven't been used in over 30 days
 * @returns Number of tokens removed
 */
export const cleanupOldTokens = async (): Promise<number> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    // Calculate cutoff date (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    // Delete old tokens
    const { data, error } = await supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', user.id)
      .lt('last_used', cutoffDate.toISOString())
      .select('id');

    if (error) {
      console.error('Error cleaning up old FCM tokens:', error);
      return 0;
    }

    const removedCount = data?.length || 0;
    if (removedCount > 0) {
      console.log(`Removed ${removedCount} old FCM tokens`);
    }
    
    return removedCount;
  } catch (error) {
    console.error('Unexpected error cleaning up old tokens:', error);
    return 0;
  }
}; 