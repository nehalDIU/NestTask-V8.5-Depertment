import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useNotificationPreferences } from './useNotificationPreferences';
import {
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications
} from '../utils/pushNotifications';

export function usePushNotifications() {
  const { user } = useAuth();
  const {
    isFullyEnabled,
    permissionStatus,
    fcmSupported,
    requestPermission,
    disableNotifications
  } = useNotificationPreferences(user?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      if (!fcmSupported) {
        setError('Push notifications are not supported in this browser');
        setLoading(false);
        return;
      }

      // The subscription status is now handled by useNotificationPreferences
      // We just need to check if there are any errors
      setError(null);
    } catch (error: any) {
      console.error('Error checking subscription status:', error);
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

      // Use the new notification preferences system
      const success = await requestPermission();
      if (!success) {
        setError('Please allow notifications in your browser settings to receive updates');
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Error subscribing to notifications:', error);
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

      // Use the new notification preferences system
      const success = await disableNotifications();
      return success;
    } catch (error: any) {
      console.error('Error unsubscribing from notifications:', error);
      setError(getNotificationErrorMessage(error));
      return false;
    } finally {
      setLoading(false);
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
    isSubscribed: isFullyEnabled(),
    loading,
    error,
    subscribe,
    unsubscribe,
    permissionStatus,
    fcmSupported
  };
}