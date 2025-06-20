import { supabase } from '../lib/supabase';
import { getFCMToken, initializeMessaging, onForegroundMessage } from '../firebase';
import { showSuccessToast, showErrorToast } from '../utils/notifications';

export interface FCMToken {
  id: string;
  user_id: string;
  fcm_token: string;
  device_type: 'web' | 'android' | 'ios';
  device_info: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FCMTokenInsert {
  user_id: string;
  fcm_token: string;
  device_type?: 'web' | 'android' | 'ios';
  device_info?: Record<string, any>;
  is_active?: boolean;
}

// Get device information for better token management
const getDeviceInfo = (): Record<string, any> => {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  const language = navigator.language;
  const cookieEnabled = navigator.cookieEnabled;
  const onLine = navigator.onLine;

  return {
    userAgent,
    platform,
    language,
    cookieEnabled,
    onLine,
    screenWidth: screen.width,
    screenHeight: screen.height,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: new Date().toISOString()
  };
};

// Check if FCM is supported in current environment
export const isFCMSupported = (): boolean => {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    typeof window !== 'undefined'
  );
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  // Request permission
  const permission = await Notification.requestPermission();
  return permission;
};

// Check if FCM token already exists for user
export const getExistingFCMToken = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('fcm_tokens')
      .select('fcm_token')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing FCM token:', error);
      return null;
    }

    return data?.fcm_token || null;
  } catch (error) {
    console.error('Error in getExistingFCMToken:', error);
    return null;
  }
};

// Deactivate all FCM tokens for a user
export const deactivateFCMTokensForUser = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('fcm_tokens')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Error deactivating FCM tokens for user:', error);
      throw error;
    }

    console.log('✅ All FCM tokens deactivated for user:', userId);
    return true;
  } catch (error) {
    console.error('Error deactivating FCM tokens for user:', error);
    return false;
  }
};

// Register FCM token for a user with smart deduplication
export const registerFCMToken = async (userId: string): Promise<string | null> => {
  try {
    console.log('🔥 Starting FCM token registration for user:', userId);

    if (!isFCMSupported()) {
      console.warn('❌ FCM is not supported in this environment');
      return null;
    }
    console.log('✅ FCM is supported');

    // Request notification permission first
    const permission = await requestNotificationPermission();
    console.log('🔔 Notification permission:', permission);
    if (permission !== 'granted') {
      console.warn('❌ Notification permission not granted:', permission);
      return null;
    }

    // Initialize messaging
    console.log('🚀 Initializing FCM messaging...');
    await initializeMessaging();

    // Get FCM token
    console.log('🎫 Getting FCM token...');
    const token = await getFCMToken();
    if (!token) {
      console.warn('❌ Failed to get FCM token');
      return null;
    }
    console.log('✅ FCM token obtained:', token.substring(0, 20) + '...');

    // Check if this exact token already exists for this user
    console.log('🔍 Checking for existing token...');
    const { data: existingToken, error: checkError } = await supabase
      .from('fcm_tokens')
      .select('id, is_active')
      .eq('user_id', userId)
      .eq('fcm_token', token)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing token:', checkError);
    }

    if (existingToken) {
      console.log('🔄 Token already exists, updating...');
      // Token exists, just reactivate and update timestamp
      const { data, error } = await supabase
        .from('fcm_tokens')
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
          device_info: getDeviceInfo()
        })
        .eq('id', existingToken.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating existing FCM token:', error);
        throw error;
      }

      console.log('✅ Existing FCM token reactivated:', data);
      return token;
    }

    // Deactivate any other active tokens for this user to prevent duplicates
    console.log('🧹 Deactivating other active tokens for user...');
    await deactivateFCMTokensForUser(userId);

    // Create new token entry
    const deviceInfo = getDeviceInfo();
    const tokenData: FCMTokenInsert = {
      user_id: userId,
      fcm_token: token,
      device_type: 'web',
      device_info: deviceInfo,
      is_active: true
    };

    console.log('💾 Creating new FCM token entry...', {
      user_id: userId,
      device_type: 'web',
      token_preview: token.substring(0, 20) + '...'
    });

    const { data, error } = await supabase
      .from('fcm_tokens')
      .insert(tokenData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving FCM token to database:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('✅ New FCM token registered successfully in database:', data);
    return token;
  } catch (error) {
    console.error('❌ Error registering FCM token:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
};

// Get all FCM tokens for a user
export const getUserFCMTokens = async (userId: string): Promise<FCMToken[]> => {
  try {
    const { data, error } = await supabase
      .from('fcm_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching FCM tokens:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error getting user FCM tokens:', error);
    return [];
  }
};

// Update FCM token (refresh)
export const updateFCMToken = async (userId: string, oldToken: string, newToken: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('fcm_tokens')
      .update({
        fcm_token: newToken,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('fcm_token', oldToken);

    if (error) {
      console.error('Error updating FCM token:', error);
      throw error;
    }

    console.log('FCM token updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating FCM token:', error);
    return false;
  }
};

// Delete FCM token
export const deleteFCMToken = async (userId: string, token?: string): Promise<boolean> => {
  try {
    let query = supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', userId);

    if (token) {
      query = query.eq('fcm_token', token);
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting FCM token:', error);
      throw error;
    }

    console.log('FCM token(s) deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting FCM token:', error);
    return false;
  }
};

// Mark FCM token as inactive
export const deactivateFCMToken = async (userId: string, token: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('fcm_tokens')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('fcm_token', token);

    if (error) {
      console.error('Error deactivating FCM token:', error);
      throw error;
    }

    console.log('FCM token deactivated successfully');
    return true;
  } catch (error) {
    console.error('Error deactivating FCM token:', error);
    return false;
  }
};

// Get all active FCM tokens (for admin use)
export const getAllActiveFCMTokens = async (): Promise<FCMToken[]> => {
  try {
    const { data, error } = await supabase
      .from('fcm_tokens')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching all FCM tokens:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error getting all FCM tokens:', error);
    return [];
  }
};

// Get FCM tokens for specific users
export const getFCMTokensForUsers = async (userIds: string[]): Promise<FCMToken[]> => {
  try {
    const { data, error } = await supabase
      .from('fcm_tokens')
      .select('*')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching FCM tokens for users:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error getting FCM tokens for users:', error);
    return [];
  }
};

// Setup foreground message listener
export const setupForegroundMessageListener = (callback: (payload: any) => void) => {
  return onForegroundMessage((payload) => {
    console.log('Foreground FCM message received:', payload);
    
    // Show browser notification for foreground messages
    if (Notification.permission === 'granted') {
      const title = payload.notification?.title || payload.data?.title || 'NestTask Notification';
      const options = {
        body: payload.notification?.body || payload.data?.body || 'You have a new notification',
        icon: payload.notification?.icon || payload.data?.icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: payload.data?.tag || 'nesttask-foreground',
        data: payload.data,
        requireInteraction: false
      };

      new Notification(title, options);
    }

    // Call the provided callback
    callback(payload);
  });
};

// Clean up duplicate tokens for a user (keep only the most recent active one)
export const cleanupDuplicateTokens = async (userId: string): Promise<void> => {
  try {
    console.log('🧹 Cleaning up duplicate tokens for user:', userId);

    // Get all active tokens for the user, ordered by most recent first
    const { data: tokens, error: fetchError } = await supabase
      .from('fcm_tokens')
      .select('id, fcm_token, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching tokens for cleanup:', fetchError);
      return;
    }

    if (!tokens || tokens.length <= 1) {
      console.log('✅ No duplicate tokens to clean up');
      return;
    }

    // Keep the most recent token, deactivate the rest
    const tokensToDeactivate = tokens.slice(1); // Skip the first (most recent) token
    const idsToDeactivate = tokensToDeactivate.map(t => t.id);

    console.log(`🗑️ Deactivating ${idsToDeactivate.length} duplicate tokens`);

    const { error: updateError } = await supabase
      .from('fcm_tokens')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .in('id', idsToDeactivate);

    if (updateError) {
      console.error('Error deactivating duplicate tokens:', updateError);
      return;
    }

    console.log('✅ Duplicate tokens cleaned up successfully');
  } catch (error) {
    console.error('Error during duplicate token cleanup:', error);
  }
};

// Cleanup expired tokens (utility function)
export const cleanupExpiredTokens = async (): Promise<void> => {
  try {
    // Clean up tokens older than 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { error } = await supabase
      .from('fcm_tokens')
      .delete()
      .lt('updated_at', ninetyDaysAgo.toISOString());

    if (error) {
      console.error('Error cleaning up expired FCM tokens:', error);
      throw error;
    }

    console.log('✅ Expired FCM tokens cleaned up successfully');
  } catch (error) {
    console.error('Error during FCM token cleanup:', error);
  }
};

// Get token statistics for debugging
export const getTokenStatistics = async (userId?: string): Promise<any> => {
  try {
    let query = supabase
      .from('fcm_tokens')
      .select('user_id, device_type, is_active, created_at');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting token statistics:', error);
      return null;
    }

    const stats = {
      total: data?.length || 0,
      active: data?.filter(t => t.is_active).length || 0,
      inactive: data?.filter(t => !t.is_active).length || 0,
      byDeviceType: data?.reduce((acc, token) => {
        acc[token.device_type] = (acc[token.device_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {},
      byUser: userId ? undefined : data?.reduce((acc, token) => {
        acc[token.user_id] = (acc[token.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {}
    };

    return stats;
  } catch (error) {
    console.error('Error getting token statistics:', error);
    return null;
  }
};
