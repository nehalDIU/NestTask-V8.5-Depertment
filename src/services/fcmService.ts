import { supabase } from '../lib/supabase';
import { getFcmToken } from '../firebase';

interface TokenRegistrationResult {
  success: boolean;
  token: string | null;
  error?: any;
}

/**
 * Request notification permission
 * @returns The permission status
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  // Check if browser supports notifications
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return 'denied';
  }

  // Check current permission status
  if (Notification.permission === 'granted') {
    return 'granted';
  }

  // Request permission if not already denied
  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  return Notification.permission;
};

/**
 * Register FCM token with Supabase
 * @returns Result object with success status and token
 */
export const registerFcmToken = async (): Promise<TokenRegistrationResult> => {
  try {
    // First request permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('Notification permission not granted:', permission);
      return { success: false, token: null, error: 'Permission not granted' };
    }

    // Get FCM token
    const token = await getFcmToken();
    if (!token) {
      console.error('Failed to get FCM token');
      return { success: false, token: null, error: 'Failed to get token' };
    }

    console.log('FCM token obtained:', token.substring(0, 10) + '...');

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting current user:', userError);
      return { success: false, token, error: userError };
    }
    
    if (!user) {
      console.log('No authenticated user found');
      return { success: false, token, error: 'No user found' };
    }

    // Store token in fcm_tokens table with upsert to handle both insert and update
    const { error: upsertError } = await supabase
      .from('fcm_tokens')
      .upsert({ 
        user_id: user.id, 
        fcm_token: token,
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
        device_info: navigator.userAgent
      });
      
    if (upsertError) {
      console.error('Error storing FCM token in Supabase:', upsertError);
      return { success: false, token, error: upsertError };
    }
    
    console.log('FCM token registered successfully in Supabase');
    return { success: true, token };
  } catch (error) {
    console.error('Error in FCM token registration process:', error);
    return { success: false, token: null, error };
  }
};

/**
 * Delete FCM token from Supabase
 * @param token The FCM token to delete
 * @returns Success status
 */
export const deleteFcmToken = async (token: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('fcm_token', token);

    if (error) {
      console.error('Error deleting FCM token:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteFcmToken:', error);
    return false;
  }
};

/**
 * Update FCM token usage timestamp
 * @param token The FCM token to update
 * @returns Success status
 */
export const updateFcmTokenUsage = async (token: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('fcm_tokens')
      .update({ last_used: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('fcm_token', token);

    if (error) {
      console.error('Error updating FCM token usage:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateFcmTokenUsage:', error);
    return false;
  }
}; 