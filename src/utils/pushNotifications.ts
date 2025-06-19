import { supabase } from '../lib/supabase';
import {
  registerFCMToken,
  deactivateFCMToken,
  requestNotificationPermission as requestFCMPermission,
  setupForegroundMessageListener
} from '../services/fcm.service';

// Legacy VAPID key for backward compatibility
const VAPID_PUBLIC_KEY = 'BIuYLLr8y2QBCcfOE2aTDzKeT4FQ2JLTwEcz_L0VEMWzX3FfzOBjag7mkj2gCRLArcmtsE1aZC7WfRI6blb-yTE';

// Convert VAPID public key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Request notification permission (now uses FCM)
export async function requestNotificationPermission(): Promise<boolean> {
  return await requestFCMPermission();
}

// Subscribe to push notifications (now uses FCM with fallback to web-push)
export async function subscribeToPushNotifications(userId: string) {
  try {
    // Try FCM first
    const fcmSuccess = await registerFCMToken(userId);
    if (fcmSuccess) {
      console.log('Successfully registered FCM token');

      // Set up foreground message listener
      setupForegroundMessageListener();

      return { type: 'fcm', success: true };
    }

    // Fallback to legacy web-push for backward compatibility
    console.log('FCM registration failed, falling back to web-push');

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported');
      return null;
    }

    // Wait for service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Get existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // If subscription exists, return it
    if (subscription) {
      await saveSubscription(userId, subscription);
      return { type: 'webpush', subscription };
    }

    try {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      await saveSubscription(userId, subscription);
      return { type: 'webpush', subscription };
    } catch (subscribeError) {
      console.error('Failed to subscribe to push notifications:', subscribeError);
      // If subscription fails, unsubscribe to allow retry
      if (subscription) {
        await subscription.unsubscribe();
      }
      return null;
    }
  } catch (error) {
    console.error('Error in push notification subscription:', error);
    return null;
  }
}

// Save subscription to database
async function saveSubscription(userId: string, subscription: PushSubscription) {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        subscription: JSON.stringify(subscription),
        created_at: new Date().toISOString()
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving push subscription:', error);
    throw error;
  }
}

// Unsubscribe from push notifications (handles both FCM and web-push)
export async function unsubscribeFromPushNotifications(userId: string) {
  try {
    let success = false;

    // Deactivate FCM tokens
    try {
      const fcmSuccess = await deactivateFCMToken(userId);
      if (fcmSuccess) {
        success = true;
        console.log('FCM tokens deactivated successfully');
      }
    } catch (fcmError) {
      console.warn('Failed to deactivate FCM tokens:', fcmError);
    }

    // Also handle legacy web-push subscriptions
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          await subscription.unsubscribe();

          // Remove subscription from database
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId);

          success = true;
          console.log('Web-push subscription removed successfully');
        }
      }
    } catch (webPushError) {
      console.warn('Failed to remove web-push subscription:', webPushError);
    }

    return success;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}