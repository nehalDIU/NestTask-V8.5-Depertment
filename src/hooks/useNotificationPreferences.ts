import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { requestNotificationPermission, registerFCMToken, deactivateFCMToken } from '../services/fcm.service';
import { showSuccessToast, showErrorToast } from '../utils/notifications';

export interface NotificationPreferences {
  enabled: boolean;
  tasks: boolean;
  announcements: boolean;
  reminders: boolean;
  email: boolean;
  push: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  tasks: true,
  announcements: true,
  reminders: true,
  email: true,
  push: true
};

export function useNotificationPreferences(userId?: string) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [fcmSupported, setFcmSupported] = useState(false);

  // Check notification support and permission status
  useEffect(() => {
    const checkNotificationSupport = () => {
      if ('Notification' in window) {
        setPermissionStatus(Notification.permission);
        setFcmSupported(true);
      } else {
        setFcmSupported(false);
      }
    };

    checkNotificationSupport();

    // Listen for permission changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 'Notification' in window) {
        setPermissionStatus(Notification.permission);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Load user preferences
  useEffect(() => {
    if (userId) {
      loadPreferences();
    }
  }, [userId]);

  const loadPreferences = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // Try to get preferences from user metadata first
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;

      const userPreferences = user?.user_metadata?.notificationPreferences;
      
      if (userPreferences) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...userPreferences });
      } else {
        // If no preferences found, use defaults
        setPreferences(DEFAULT_PREFERENCES);
      }
    } catch (err: any) {
      console.error('Error loading notification preferences:', err);
      setError(err.message);
      // Use defaults on error
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    if (!userId) return false;

    try {
      setError(null);
      const updatedPreferences = { ...preferences, ...newPreferences };

      // Save to user metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          notificationPreferences: updatedPreferences
        }
      });

      if (error) throw error;

      setPreferences(updatedPreferences);
      showSuccessToast('Notification preferences updated');
      return true;
    } catch (err: any) {
      console.error('Error saving notification preferences:', err);
      setError(err.message);
      showErrorToast('Failed to save preferences');
      return false;
    }
  };

  const requestPermission = async () => {
    try {
      setError(null);
      
      if (!fcmSupported) {
        throw new Error('Notifications are not supported in this browser');
      }

      const granted = await requestNotificationPermission();
      
      if (granted) {
        setPermissionStatus('granted');
        
        // Register FCM token if permission granted
        if (userId) {
          await registerFCMToken(userId);
        }
        
        // Update preferences to enable push notifications
        await savePreferences({ push: true, enabled: true });
        
        return true;
      } else {
        setPermissionStatus('denied');
        
        // Update preferences to disable push notifications
        await savePreferences({ push: false });
        
        return false;
      }
    } catch (err: any) {
      console.error('Error requesting notification permission:', err);
      setError(err.message);
      showErrorToast(err.message);
      return false;
    }
  };

  const disableNotifications = async () => {
    try {
      setError(null);
      
      if (userId) {
        // Deactivate FCM tokens
        await deactivateFCMToken(userId);
      }
      
      // Update preferences
      await savePreferences({ push: false, enabled: false });
      
      showSuccessToast('Notifications disabled');
      return true;
    } catch (err: any) {
      console.error('Error disabling notifications:', err);
      setError(err.message);
      showErrorToast('Failed to disable notifications');
      return false;
    }
  };

  const enableNotifications = async () => {
    if (permissionStatus === 'granted') {
      // Permission already granted, just update preferences
      return await savePreferences({ push: true, enabled: true });
    } else {
      // Need to request permission
      return await requestPermission();
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (key === 'push' && value && permissionStatus !== 'granted') {
      // If trying to enable push notifications, request permission first
      return await requestPermission();
    } else if (key === 'push' && !value) {
      // If disabling push notifications, deactivate tokens
      if (userId) {
        await deactivateFCMToken(userId);
      }
    }
    
    return await savePreferences({ [key]: value });
  };

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'Notifications are enabled';
      case 'denied':
        return 'Notifications are blocked. Please enable them in your browser settings.';
      case 'default':
        return 'Click to enable notifications';
      default:
        return 'Unknown permission status';
    }
  };

  const canRequestPermission = () => {
    return fcmSupported && permissionStatus !== 'denied';
  };

  const isFullyEnabled = () => {
    return preferences.enabled && preferences.push && permissionStatus === 'granted';
  };

  return {
    preferences,
    loading,
    error,
    permissionStatus,
    fcmSupported,
    savePreferences,
    requestPermission,
    disableNotifications,
    enableNotifications,
    updatePreference,
    getPermissionStatusText,
    canRequestPermission,
    isFullyEnabled,
    refresh: loadPreferences
  };
}
