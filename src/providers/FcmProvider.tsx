import React, { createContext, useContext, useState, useEffect } from 'react';
import { onMessageListener } from '../firebase';
import useFcmRegistration from '../hooks/useFcmRegistration';

interface FcmNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  timestamp: Date;
}

interface FcmContextValue {
  // Registration status
  token: string | null;
  status: string;
  isRegistered: boolean;
  isLoading: boolean;
  hasError: boolean;
  
  // Permission
  permission: NotificationPermission | null;
  isPermissionGranted: boolean;
  
  // Actions
  requestPermission: () => Promise<void>;
  
  // Recent notifications
  recentNotifications: FcmNotification[];
  clearNotifications: () => void;
}

// Create context with default values
const FcmContext = createContext<FcmContextValue>({
  token: null,
  status: 'initial',
  isRegistered: false,
  isLoading: false,
  hasError: false,
  permission: null,
  isPermissionGranted: false,
  requestPermission: async () => {},
  recentNotifications: [],
  clearNotifications: () => {}
});

interface FcmProviderProps {
  children: React.ReactNode;
  autoRegister?: boolean;
  maxRecentNotifications?: number;
}

/**
 * Provider component for Firebase Cloud Messaging
 * Handles registration, permissions, and incoming notifications
 */
export function FcmProvider({
  children,
  autoRegister = true,
  maxRecentNotifications = 5
}: FcmProviderProps) {
  // Use the FCM registration hook
  const {
    status,
    token,
    permission,
    register,
    isRegistering,
    isPermissionGranted,
    isRegistered,
    isLoading,
    hasError,
    error
  } = useFcmRegistration();

  // Store recent notifications
  const [recentNotifications, setRecentNotifications] = useState<FcmNotification[]>([]);

  // Request permission handler
  const requestPermission = async () => {
    if (!isLoading) {
      await register(true);
    }
  };

  // Clear notifications
  const clearNotifications = () => {
    setRecentNotifications([]);
  };

  // Listen for incoming messages when registered
  useEffect(() => {
    if (!isRegistered || !token) {
      return;
    }

    console.log('Setting up FCM message listener');
    
    const handleMessage = async () => {
      try {
        const payload = await onMessageListener();
        
        if (!payload) return;

        console.log('FCM message received:', payload);
        
        // Extract notification data
        const { notification, data = {} } = payload as any;
        
        if (!notification || !notification.title) {
          console.warn('Received FCM message with invalid notification format:', payload);
          return;
        }
        
        // Create notification object
        const fcmNotification: FcmNotification = {
          id: data.id || Date.now().toString(),
          title: notification.title,
          body: notification.body || '',
          data,
          timestamp: new Date()
        };
        
        // Add to recent notifications
        setRecentNotifications(prev => {
          const updated = [fcmNotification, ...prev].slice(0, maxRecentNotifications);
          return updated;
        });
        
        // Show browser notification if app is not in focus
        if (document.visibilityState !== 'visible') {
          try {
            new Notification(notification.title, {
              body: notification.body || '',
              icon: '/icons/icon-192x192.png', // Make sure path is correct
              data
            });
          } catch (error) {
            console.error('Error displaying notification:', error);
          }
        }
      } catch (error) {
        console.error('Error handling FCM message:', error);
      }
      
      // Set up listener again
      handleMessage();
    };

    // Start listening
    handleMessage();
    
    // No cleanup needed as the listener is self-perpetuating
  }, [isRegistered, token, maxRecentNotifications]);

  // Debug logging
  useEffect(() => {
    console.log('FCM registration status:', {
      status,
      permission,
      token: token ? `${token.substring(0, 10)}...` : null,
      isRegistered
    });
  }, [status, permission, token, isRegistered]);

  // Auto-register if enabled
  useEffect(() => {
    if (autoRegister) {
      // Only attempt registration if notification permission is granted or default
      if (
        'Notification' in window && 
        (Notification.permission === 'granted' || Notification.permission === 'default')
      ) {
        register();
      }
    }
  }, [autoRegister, register]);

  // Create context value
  const contextValue: FcmContextValue = {
    token,
    status,
    isRegistered,
    isLoading,
    hasError,
    permission,
    isPermissionGranted,
    requestPermission,
    recentNotifications,
    clearNotifications
  };

  return (
    <FcmContext.Provider value={contextValue}>
      {children}
    </FcmContext.Provider>
  );
}

/**
 * Hook to access FCM context
 */
export const useFcm = () => useContext(FcmContext);

export default FcmProvider; 