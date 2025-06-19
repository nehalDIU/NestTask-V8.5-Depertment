import { supabase } from '../lib/supabase';
import { getFCMToken, initializeMessaging, onForegroundMessage } from '../firebase';
import { showSuccessToast, showErrorToast } from '../utils/notifications';
import type { Database } from '../types/supabase';

type FCMToken = Database['public']['Tables']['fcm_tokens']['Row'];
type FCMTokenInsert = Database['public']['Tables']['fcm_tokens']['Insert'];
type FCMTokenUpdate = Database['public']['Tables']['fcm_tokens']['Update'];

// Device information detection
const getDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  let platform = 'Unknown';
  let deviceType = 'web';

  // Detect platform/browser
  if (userAgent.includes('Chrome')) platform = 'Chrome';
  else if (userAgent.includes('Firefox')) platform = 'Firefox';
  else if (userAgent.includes('Safari')) platform = 'Safari';
  else if (userAgent.includes('Edge')) platform = 'Edge';
  else if (userAgent.includes('Opera')) platform = 'Opera';

  // Detect device type
  if (/Android/i.test(userAgent)) {
    deviceType = 'android';
    platform = 'Android ' + platform;
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    deviceType = 'ios';
    platform = 'iOS ' + platform;
  }

  return {
    platform,
    deviceType,
    deviceId: generateDeviceId()
  };
};

// Generate a unique device ID
const generateDeviceId = (): string => {
  const stored = localStorage.getItem('nesttask_device_id');
  if (stored) return stored;

  const deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  localStorage.setItem('nesttask_device_id', deviceId);
  return deviceId;
};

/**
 * Register FCM token for a user
 */
export const registerFCMToken = async (userId: string): Promise<boolean> => {
  try {
    // Initialize Firebase Messaging
    await initializeMessaging();

    // Get FCM token
    const fcmToken = await getFCMToken();
    if (!fcmToken) {
      console.warn('Failed to get FCM token');
      return false;
    }

    // Get device information
    const deviceInfo = getDeviceInfo();

    // Check if token already exists
    const { data: existingToken } = await supabase
      .from('fcm_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('fcm_token', fcmToken)
      .single();

    if (existingToken) {
      // Update existing token
      const { error } = await supabase
        .from('fcm_tokens')
        .update({
          is_active: true,
          last_used_at: new Date().toISOString(),
          platform: deviceInfo.platform,
          device_id: deviceInfo.deviceId
        })
        .eq('id', existingToken.id);

      if (error) throw error;
      console.log('FCM token updated successfully');
      return true;
    }

    // Insert new token
    const tokenData: FCMTokenInsert = {
      user_id: userId,
      fcm_token: fcmToken,
      device_type: deviceInfo.deviceType,
      platform: deviceInfo.platform,
      device_id: deviceInfo.deviceId,
      is_active: true
    };

    const { error } = await supabase
      .from('fcm_tokens')
      .insert(tokenData);

    if (error) throw error;

    console.log('FCM token registered successfully');
    return true;
  } catch (error) {
    console.error('Error registering FCM token:', error);
    return false;
  }
};

/**
 * Refresh FCM token for a user
 */
export const refreshFCMToken = async (userId: string): Promise<boolean> => {
  try {
    // Get new FCM token
    const newToken = await getFCMToken();
    if (!newToken) {
      console.warn('Failed to get new FCM token');
      return false;
    }

    // Get device information
    const deviceInfo = getDeviceInfo();

    // Deactivate old tokens for this device
    await supabase
      .from('fcm_tokens')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('device_id', deviceInfo.deviceId);

    // Register new token
    return await registerFCMToken(userId);
  } catch (error) {
    console.error('Error refreshing FCM token:', error);
    return false;
  }
};

/**
 * Get all active FCM tokens for a user
 */
export const getUserFCMTokens = async (userId: string): Promise<FCMToken[]> => {
  try {
    const { data, error } = await supabase
      .from('fcm_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_used_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting user FCM tokens:', error);
    return [];
  }
};

/**
 * Deactivate FCM token
 */
export const deactivateFCMToken = async (userId: string, tokenId?: string): Promise<boolean> => {
  try {
    let query = supabase
      .from('fcm_tokens')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (tokenId) {
      query = query.eq('id', tokenId);
    } else {
      // Deactivate all tokens for the user
      const deviceInfo = getDeviceInfo();
      query = query.eq('device_id', deviceInfo.deviceId);
    }

    const { error } = await query;
    if (error) throw error;

    console.log('FCM token(s) deactivated successfully');
    return true;
  } catch (error) {
    console.error('Error deactivating FCM token:', error);
    return false;
  }
};

/**
 * Update token last used timestamp
 */
export const updateTokenLastUsed = async (userId: string): Promise<void> => {
  try {
    const deviceInfo = getDeviceInfo();
    
    await supabase
      .from('fcm_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('device_id', deviceInfo.deviceId)
      .eq('is_active', true);
  } catch (error) {
    console.error('Error updating token last used:', error);
  }
};

/**
 * Cleanup expired tokens (admin function)
 */
export const cleanupExpiredTokens = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('cleanup_expired_fcm_tokens');
    if (error) throw error;
    
    console.log('Expired FCM tokens cleaned up successfully');
    return true;
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    return false;
  }
};

/**
 * Setup foreground message listener
 */
export const setupForegroundMessageListener = (
  onMessageReceived?: (payload: any) => void
) => {
  return onForegroundMessage((payload) => {
    console.log('Foreground message received:', payload);
    
    // Show notification toast
    const title = payload.notification?.title || 'New Notification';
    const body = payload.notification?.body || 'You have a new message';
    
    showSuccessToast(`${title}: ${body}`, { duration: 5000 });
    
    // Call custom handler if provided
    if (onMessageReceived) {
      onMessageReceived(payload);
    }
  });
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      showErrorToast('Notifications are blocked. Please enable them in your browser settings.');
      return false;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      showSuccessToast('Notifications enabled successfully!');
      return true;
    } else {
      showErrorToast('Notification permission denied.');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    showErrorToast('Failed to request notification permission.');
    return false;
  }
};
