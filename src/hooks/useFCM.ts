import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { fcmService } from '../services/fcm.service';

export interface FCMNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
  timestamp: Date;
}

export function useFCM() {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<FCMNotification | null>(null);

  // Initialize FCM when user is available
  useEffect(() => {
    if (!user) {
      setIsReady(false);
      setIsRegistered(false);
      setLoading(false);
      return;
    }

    initializeFCM();
  }, [user]);

  // Set up message listeners
  useEffect(() => {
    if (!isReady) return;

    const handleFCMMessage = (event: CustomEvent) => {
      const payload = event.detail;
      console.log('FCM message received in hook:', payload);

      if (payload.notification) {
        setLastNotification({
          title: payload.notification.title || 'New Notification',
          body: payload.notification.body || '',
          data: payload.data,
          timestamp: new Date()
        });
      }
    };

    const handleNotificationClick = (event: CustomEvent) => {
      const { action, data } = event.detail;
      console.log('Notification clicked:', action, data);

      // Handle notification click based on data
      if (data?.taskId) {
        // Navigate to task or update UI
        console.log('Navigate to task:', data.taskId);
      }
    };

    // Add event listeners
    window.addEventListener('fcm-message', handleFCMMessage as EventListener);
    window.addEventListener('notification-click', handleNotificationClick as EventListener);

    return () => {
      window.removeEventListener('fcm-message', handleFCMMessage as EventListener);
      window.removeEventListener('notification-click', handleNotificationClick as EventListener);
    };
  }, [isReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      fcmService.cleanup();
    };
  }, []);

  const initializeFCM = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize FCM service
      const initialized = await fcmService.initialize();
      setIsReady(initialized);

      if (initialized) {
        // Register token
        const registered = await fcmService.registerToken();
        setIsRegistered(registered);

        if (!registered) {
          setError('Failed to register for notifications');
        }
      } else {
        setError('Failed to initialize push notifications');
      }
    } catch (err: any) {
      console.error('Error initializing FCM:', err);
      setError(err.message || 'Failed to initialize notifications');
    } finally {
      setLoading(false);
    }
  };

  const register = useCallback(async (): Promise<boolean> => {
    if (!isReady) {
      const initialized = await initializeFCM();
      if (!initialized) return false;
    }

    try {
      setLoading(true);
      setError(null);

      const registered = await fcmService.registerToken();
      setIsRegistered(registered);

      if (!registered) {
        setError('Failed to register for notifications');
      }

      return registered;
    } catch (err: any) {
      console.error('Error registering FCM token:', err);
      setError(err.message || 'Failed to register for notifications');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isReady]);

  const unregister = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const unregistered = await fcmService.unregisterToken();
      if (unregistered) {
        setIsRegistered(false);
      }

      return unregistered;
    } catch (err: any) {
      console.error('Error unregistering FCM token:', err);
      setError(err.message || 'Failed to unregister from notifications');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLastUsed = useCallback(async () => {
    if (isReady && isRegistered) {
      await fcmService.updateTokenLastUsed();
    }
  }, [isReady, isRegistered]);

  const getNotificationPreferences = useCallback(async () => {
    if (!isReady) return null;
    return fcmService.getNotificationPreferences();
  }, [isReady]);

  const getCurrentToken = useCallback(() => {
    return fcmService.getCurrentToken();
  }, []);

  const clearLastNotification = useCallback(() => {
    setLastNotification(null);
  }, []);

  return {
    // State
    isReady,
    isRegistered,
    loading,
    error,
    lastNotification,
    
    // Actions
    register,
    unregister,
    updateLastUsed,
    getNotificationPreferences,
    getCurrentToken,
    clearLastNotification,
    
    // Utils
    reinitialize: initializeFCM
  };
}
