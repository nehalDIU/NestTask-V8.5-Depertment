import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { 
  checkNotificationPermission, 
  requestNotificationPermission,
  unsubscribeFromNotifications,
  getCurrentFcmToken
} from '../notifications';

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsSubscribed(false);
      setLoading(false);
      return;
    }

    checkSubscriptionStatus();
  }, [user]);

  const checkSubscriptionStatus = async () => {
    try {
      if (!('Notification' in window)) {
        setError('Push notifications are not supported in this browser');
        setLoading(false);
        return;
      }

      const permission = checkNotificationPermission();
      setIsSubscribed(permission === 'granted');
      
      // If we have permission, get the token
      if (permission === 'granted') {
        const token = await getCurrentFcmToken();
        setFcmToken(token);
      }
    } catch (error: any) {
      console.error('[usePushNotifications] Error checking subscription status:', error);
      setError(getNotificationErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const subscribe = async () => {
    if (!user) return false;

    try {
      setError(null);
      setLoading(true);

      const success = await requestNotificationPermission(user.id);
      if (!success) {
        setError('Please allow notifications in your browser settings to receive updates');
        return false;
      }

      // Update state after successful subscription
      setIsSubscribed(true);
      
      // Get and set the token
      const token = await getCurrentFcmToken();
      setFcmToken(token);
      
      return true;
    } catch (error: any) {
      console.error('[usePushNotifications] Error subscribing to notifications:', error);
      setError(getNotificationErrorMessage(error));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!user) return false;

    try {
      setError(null);
      setLoading(true);

      const success = await unsubscribeFromNotifications(user.id);
      
      // Update state after unsubscribe attempt
      if (success) {
        setIsSubscribed(false);
        setFcmToken(null);
      }
      
      return success;
    } catch (error: any) {
      console.error('[usePushNotifications] Error unsubscribing from notifications:', error);
      setError(getNotificationErrorMessage(error));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async () => {
    if (!user || !isSubscribed) return false;

    try {
      setError(null);
      
      // Create a local notification for testing
      if (Notification.permission === 'granted') {
        new Notification('Test Notification', {
          body: 'This is a test notification from NestTask',
          icon: '/icons/icon-192x192.png'
        });
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('[usePushNotifications] Error sending test notification:', error);
      setError(getNotificationErrorMessage(error));
      return false;
    }
  };

  const getNotificationErrorMessage = (error: any): string => {
    if (error.name === 'NotAllowedError') {
      return 'Notification permission denied. Please enable notifications in your browser settings.';
    }
    if (error.name === 'InvalidStateError') {
      return 'Push notification subscription is in an invalid state. Please try again.';
    }
    return error.message || 'An error occurred with push notifications. Please try again.';
  };

  return {
    isSubscribed,
    loading,
    error,
    fcmToken,
    subscribe,
    unsubscribe,
    sendTest
  };
}