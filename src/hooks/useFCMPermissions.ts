import { useState, useEffect, useCallback } from 'react';
import { 
  requestNotificationPermission, 
  isFCMSupported, 
  registerFCMToken,
  deleteFCMToken,
  getUserFCMTokens
} from '../services/fcm.service';

export interface FCMPermissionState {
  permission: NotificationPermission;
  isSupported: boolean;
  isLoading: boolean;
  hasActiveTokens: boolean;
  error: string | null;
}

export const useFCMPermissions = (userId?: string) => {
  const [state, setState] = useState<FCMPermissionState>({
    permission: 'default',
    isSupported: false,
    isLoading: false,
    hasActiveTokens: false,
    error: null
  });

  // Check initial state
  useEffect(() => {
    const checkInitialState = async () => {
      const isSupported = isFCMSupported();
      const permission = 'Notification' in window ? Notification.permission : 'denied';
      
      let hasActiveTokens = false;
      if (userId && permission === 'granted') {
        try {
          const tokens = await getUserFCMTokens(userId);
          hasActiveTokens = tokens.length > 0;
        } catch (error) {
          console.error('Error checking FCM tokens:', error);
        }
      }

      setState(prev => ({
        ...prev,
        permission,
        isSupported,
        hasActiveTokens
      }));
    };

    checkInitialState();
  }, [userId]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'FCM is not supported in this browser' }));
      return 'denied';
    }

    if (!userId) {
      setState(prev => ({ ...prev, error: 'User ID is required' }));
      return 'denied';
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const permission = await requestNotificationPermission();
      
      if (permission === 'granted') {
        // Register FCM token
        const token = await registerFCMToken(userId);
        if (token) {
          setState(prev => ({
            ...prev,
            permission,
            hasActiveTokens: true,
            isLoading: false
          }));
        } else {
          setState(prev => ({
            ...prev,
            permission,
            hasActiveTokens: false,
            isLoading: false,
            error: 'Failed to register FCM token'
          }));
        }
      } else {
        setState(prev => ({
          ...prev,
          permission,
          hasActiveTokens: false,
          isLoading: false,
          error: permission === 'denied' ? 'Notification permission denied' : null
        }));
      }

      return permission;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to request permission';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return 'denied';
    }
  }, [state.isSupported, userId]);

  // Disable notifications
  const disableNotifications = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      setState(prev => ({ ...prev, error: 'User ID is required' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const success = await deleteFCMToken(userId);
      
      setState(prev => ({
        ...prev,
        hasActiveTokens: false,
        isLoading: false
      }));

      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disable notifications';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return false;
    }
  }, [userId]);

  // Refresh token status
  const refreshTokenStatus = useCallback(async () => {
    if (!userId) return;

    try {
      const tokens = await getUserFCMTokens(userId);
      setState(prev => ({
        ...prev,
        hasActiveTokens: tokens.length > 0
      }));
    } catch (error) {
      console.error('Error refreshing token status:', error);
    }
  }, [userId]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Check if notifications are fully enabled
  const isNotificationsEnabled = state.permission === 'granted' && state.hasActiveTokens;

  // Check if notifications can be enabled
  const canEnableNotifications = state.isSupported && state.permission !== 'denied';

  return {
    ...state,
    isNotificationsEnabled,
    canEnableNotifications,
    requestPermission,
    disableNotifications,
    refreshTokenStatus,
    clearError
  };
};
