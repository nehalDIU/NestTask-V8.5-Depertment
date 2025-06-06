import { getFcmToken, saveFcmToken, removeFcmToken, initializeMessaging } from './firebase';

/**
 * Request notification permission and register FCM token
 * @param userId - User ID to associate with the FCM token
 * @returns Promise<boolean> - Whether the operation was successful
 */
export const requestNotificationPermission = async (userId: string): Promise<boolean> => {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('[Notifications] This browser does not support notifications');
      return false;
    }
    
    // Initialize Firebase messaging
    const messagingSupported = await initializeMessaging();
    if (!messagingSupported) {
      console.warn('[Notifications] Firebase messaging is not supported in this browser');
      return false;
    }
    
    // Request permission from the user
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Notifications] Permission not granted');
      return false;
    }
    
    console.log('[Notifications] Permission granted, saving FCM token');
    
    // Save the FCM token to the database
    const tokenSaved = await saveFcmToken(userId);
    
    if (!tokenSaved) {
      console.error('[Notifications] Failed to save FCM token');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[Notifications] Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Check if the user has granted notification permission
 * @returns 'granted' | 'denied' | 'default' | 'unsupported'
 */
export const checkNotificationPermission = (): string => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};

/**
 * Unsubscribe from notifications by removing FCM token
 * @param userId - User ID associated with the FCM token
 * @returns Promise<boolean> - Whether the operation was successful
 */
export const unsubscribeFromNotifications = async (userId: string): Promise<boolean> => {
  try {
    // Remove the FCM token
    const success = await removeFcmToken(userId);
    
    if (!success) {
      console.error('[Notifications] Failed to remove FCM token');
      return false;
    }
    
    console.log('[Notifications] Successfully unsubscribed from notifications');
    return true;
  } catch (error) {
    console.error('[Notifications] Error unsubscribing from notifications:', error);
    return false;
  }
};

/**
 * Get the current FCM token if available
 * @returns Promise<string | null> - The FCM token or null
 */
export const getCurrentFcmToken = async (): Promise<string | null> => {
  return await getFcmToken();
};