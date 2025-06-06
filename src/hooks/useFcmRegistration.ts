import { useState, useEffect, useCallback } from 'react';
import { 
  registerFcmToken, 
  updateFcmTokenUsage,
  cleanupOldTokens,
  requestNotificationPermission
} from '../services/fcmService';

/**
 * Status of FCM token registration process
 */
export type FcmRegistrationStatus = 
  | 'initial'      // Initial state
  | 'checking'     // Checking permission
  | 'requesting'   // Requesting permission
  | 'denied'       // Permission denied
  | 'generating'   // Generating FCM token
  | 'storing'      // Storing token in Supabase
  | 'registered'   // Successfully registered
  | 'error';       // Error occurred

/**
 * Result of FCM registration process
 */
export interface FcmRegistrationResult {
  status: FcmRegistrationStatus;
  token: string | null;
  permission: NotificationPermission | null;
  error?: any;
  lastUpdated: Date;
}

/**
 * Hook for FCM token registration that integrates with Supabase
 * Handles the complete flow:
 * 1. Check notification permission
 * 2. Request permission if needed
 * 3. Generate FCM token
 * 4. Store token in Supabase
 * 5. Set up periodic updates
 */
export function useFcmRegistration() {
  // Registration state
  const [result, setResult] = useState<FcmRegistrationResult>({
    status: 'initial',
    token: null,
    permission: null,
    lastUpdated: new Date()
  });

  // Flag to prevent multiple concurrent registrations
  const [isRegistering, setIsRegistering] = useState(false);

  /**
   * Register FCM token
   */
  const register = useCallback(async (force = false) => {
    // Prevent concurrent registrations
    if (isRegistering && !force) {
      console.log('FCM registration already in progress');
      return;
    }

    try {
      setIsRegistering(true);
      
      // Check current notification permission
      setResult(prev => ({
        ...prev,
        status: 'checking',
        lastUpdated: new Date()
      }));
      
      // Skip if notifications aren't supported
      if (!('Notification' in window)) {
        setResult(prev => ({
          ...prev,
          status: 'error',
          error: 'Notifications not supported in this browser',
          lastUpdated: new Date()
        }));
        return;
      }
      
      // Get current notification permission
      const permission = Notification.permission;
      setResult(prev => ({
        ...prev,
        permission,
        lastUpdated: new Date()
      }));
      
      // If permission denied, we can't proceed
      if (permission === 'denied') {
        setResult(prev => ({
          ...prev,
          status: 'denied',
          lastUpdated: new Date()
        }));
        return;
      }
      
      // Request permission if needed
      if (permission !== 'granted') {
        setResult(prev => ({
          ...prev,
          status: 'requesting',
          lastUpdated: new Date()
        }));
        
        const newPermission = await requestNotificationPermission();
        setResult(prev => ({
          ...prev,
          permission: newPermission,
          lastUpdated: new Date()
        }));
        
        if (newPermission !== 'granted') {
          setResult(prev => ({
            ...prev,
            status: 'denied',
            lastUpdated: new Date()
          }));
          return;
        }
      }
      
      // Generate and register FCM token
      setResult(prev => ({
        ...prev,
        status: 'generating',
        lastUpdated: new Date()
      }));
      
      // First clean up old tokens
      await cleanupOldTokens().catch(error => {
        console.warn('Error cleaning up old tokens:', error);
      });
      
      // Register new token
      setResult(prev => ({
        ...prev,
        status: 'storing',
        lastUpdated: new Date()
      }));
      
      const registrationResult = await registerFcmToken();
      
      if (registrationResult.success && registrationResult.token) {
        // Successfully registered
        setResult({
          status: 'registered',
          token: registrationResult.token,
          permission: 'granted',
          lastUpdated: new Date()
        });
      } else {
        // Registration failed
        setResult({
          status: 'error',
          token: null,
          permission: Notification.permission as NotificationPermission,
          error: registrationResult.error || 'Unknown error during FCM registration',
          lastUpdated: new Date()
        });
      }
    } catch (error) {
      // Unexpected error
      setResult({
        status: 'error',
        token: null,
        permission: Notification.permission as NotificationPermission,
        error,
        lastUpdated: new Date()
      });
    } finally {
      setIsRegistering(false);
    }
  }, [isRegistering]);

  // Initial registration on mount
  useEffect(() => {
    // Only run if notification permission is already granted or default
    if (
      'Notification' in window && 
      (Notification.permission === 'granted' || Notification.permission === 'default')
    ) {
      register();
    } else if ('Notification' in window && Notification.permission === 'denied') {
      setResult({
        status: 'denied',
        token: null,
        permission: 'denied',
        lastUpdated: new Date()
      });
    }
    
    // Set up periodic token update
    const intervalId = setInterval(() => {
      // Update token usage if registered
      if (result.status === 'registered' && result.token) {
        updateFcmTokenUsage(result.token).catch(error => {
          console.warn('Error updating token usage:', error);
        });
      }
    }, 24 * 60 * 60 * 1000); // Once per day
    
    return () => {
      clearInterval(intervalId);
    };
  }, [register, result.status, result.token]);

  return {
    ...result,
    register,
    isRegistering,
    
    // Utility for UI display
    isPermissionGranted: result.permission === 'granted',
    
    // Check if registration was successful
    isRegistered: result.status === 'registered' && !!result.token,
    
    // In progress states
    isLoading: ['checking', 'requesting', 'generating', 'storing'].includes(result.status),
    
    // Has error
    hasError: result.status === 'error'
  };
}

export default useFcmRegistration; 