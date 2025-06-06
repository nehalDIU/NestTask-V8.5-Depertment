import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getFcmToken } from '../firebase';

interface MessagingStatus {
  permissionStatus: NotificationPermission | null;
  tokenStatus: 'idle' | 'loading' | 'success' | 'error';
  token: string | null;
  error?: any;
}

/**
 * Enhanced hook for Firebase Cloud Messaging with Supabase integration
 * Handles notification permissions, FCM token registration and updates
 */
export const useFirebaseMessaging = () => {
  const [status, setStatus] = useState<MessagingStatus>({
    permissionStatus: null,
    tokenStatus: 'idle',
    token: null
  });

  // Request notification permission
  const requestPermission = useCallback(async () => {
    try {
      if (!('Notification' in window)) {
        setStatus(prev => ({
          ...prev,
          permissionStatus: 'denied',
          tokenStatus: 'error',
          error: 'Notifications not supported'
        }));
        return 'denied';
      }

      const permission = await Notification.requestPermission();
      setStatus(prev => ({ ...prev, permissionStatus: permission }));
      
      // If permission granted, get and register token
      if (permission === 'granted') {
        registerToken();
      }
      
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setStatus(prev => ({
        ...prev,
        permissionStatus: 'denied',
        tokenStatus: 'error',
        error
      }));
      return 'denied';
    }
  }, []);

  // Register FCM token with Supabase
  const registerToken = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, tokenStatus: 'loading' }));
      
      // Get FCM token
      const token = await getFcmToken();
      if (!token) {
        setStatus(prev => ({
          ...prev,
          tokenStatus: 'error',
          error: 'Failed to get FCM token'
        }));
        return null;
      }
      
      // Store token temporarily
      setStatus(prev => ({ ...prev, token }));
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setStatus(prev => ({
          ...prev,
          tokenStatus: 'error',
          error: userError || 'No authenticated user'
        }));
        return token;
      }
      
      // Store token in Supabase
      const { error: upsertError } = await supabase
        .from('fcm_tokens')
        .upsert({
          user_id: user.id,
          fcm_token: token,
          created_at: new Date().toISOString(),
          last_used: new Date().toISOString(),
          device_info: navigator.userAgent
        });
        
      if (upsertError) {
        console.error('Error storing FCM token in Supabase:', upsertError);
        setStatus(prev => ({
          ...prev,
          tokenStatus: 'error',
          error: upsertError
        }));
        return token;
      }
      
      // Success
      setStatus(prev => ({
        ...prev,
        tokenStatus: 'success'
      }));
      
      console.log('FCM token registered successfully with Supabase');
      return token;
    } catch (error) {
      console.error('Error registering FCM token:', error);
      setStatus(prev => ({
        ...prev,
        tokenStatus: 'error',
        error
      }));
      return null;
    }
  }, []);

  // Update token usage in Supabase
  const updateTokenUsage = useCallback(async (token: string) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      
      // Update token usage timestamp
      const { error } = await supabase
        .from('fcm_tokens')
        .update({ last_used: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('fcm_token', token);
        
      if (error) {
        console.error('Error updating token usage:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating token usage:', error);
      return false;
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      // Check current permission status
      if ('Notification' in window) {
        const permission = Notification.permission;
        setStatus(prev => ({ ...prev, permissionStatus: permission }));
        
        // If permission already granted, register token
        if (permission === 'granted') {
          await registerToken();
        }
      }
    };
    
    initialize();
    
    // Set up periodic update for token usage
    const intervalId = setInterval(() => {
      if (status.token && status.tokenStatus === 'success') {
        updateTokenUsage(status.token).catch(error => {
          console.error('Error in periodic token update:', error);
        });
      }
    }, 12 * 60 * 60 * 1000); // Every 12 hours
    
    return () => {
      clearInterval(intervalId);
    };
  }, [registerToken, updateTokenUsage]);

  return {
    ...status,
    requestPermission,
    registerToken,
    updateTokenUsage
  };
};

export default useFirebaseMessaging; 