import { supabase } from '../lib/supabase';
import { getFCMToken, requestNotificationPermission as requestFCMPermission, initializeFCM } from '../firebase';

// Request notification permission (using FCM)
export async function requestNotificationPermission(): Promise<boolean> {
  return await requestFCMPermission();
}

// Subscribe to push notifications using FCM
export async function subscribeToPushNotifications(userId: string) {
  try {
    // Initialize FCM and get token
    const fcmToken = await initializeFCM();

    if (!fcmToken) {
      console.warn('Failed to get FCM token');
      return null;
    }

    // Save FCM token to database
    await saveFCMToken(userId, fcmToken);

    // Return a mock subscription object for compatibility
    return {
      endpoint: `fcm:${fcmToken}`,
      keys: {
        p256dh: 'fcm-token',
        auth: 'fcm-auth'
      },
      fcmToken
    };
  } catch (error) {
    console.error('Error in FCM subscription:', error);
    return null;
  }
}

// Save FCM token to database
async function saveFCMToken(userId: string, fcmToken: string) {
  try {
    const { error } = await supabase
      .from('fcm_tokens')
      .upsert({
        user_id: userId,
        fcm_token: fcmToken,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving FCM token:', error);
    throw error;
  }
}

// Legacy function for backward compatibility
async function saveSubscription(userId: string, subscription: any) {
  if (subscription.fcmToken) {
    return await saveFCMToken(userId, subscription.fcmToken);
  }
  // Handle legacy web-push subscriptions if needed
  console.warn('Legacy subscription format detected');
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(userId: string) {
  try {
    // Remove FCM token from database
    const { error } = await supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing FCM token:', error);
      return false;
    }

    // Also clean up legacy push_subscriptions if they exist
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    return true;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}

// Check if user has FCM token
export async function checkFCMSubscription(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('fcm_tokens')
      .select('fcm_token')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking FCM subscription:', error);
      return false;
    }

    return !!data?.fcm_token;
  } catch (error) {
    console.error('Error checking FCM subscription:', error);
    return false;
  }
}