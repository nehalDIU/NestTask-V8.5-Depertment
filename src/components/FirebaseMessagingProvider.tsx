import React, { createContext, useContext, useEffect } from 'react';
import useFirebaseMessaging from '../hooks/useFirebaseMessaging';
import { NotificationHandler } from './NotificationHandler';

interface MessagingContextType {
  permissionStatus: NotificationPermission | null;
  tokenStatus: 'idle' | 'loading' | 'success' | 'error';
  token: string | null;
  requestPermission: () => Promise<NotificationPermission>;
  error?: any;
}

// Create context with default values
const MessagingContext = createContext<MessagingContextType>({
  permissionStatus: null,
  tokenStatus: 'idle',
  token: null,
  requestPermission: async () => 'default',
});

interface MessagingProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component for Firebase Cloud Messaging
 * Handles notification permissions, FCM token registration with Supabase
 */
export const FirebaseMessagingProvider: React.FC<MessagingProviderProps> = ({ children }) => {
  const {
    permissionStatus,
    tokenStatus,
    token,
    error,
    requestPermission
  } = useFirebaseMessaging();

  // Debug logging
  useEffect(() => {
    console.log('Firebase Messaging status:', {
      permissionStatus,
      tokenStatus,
      tokenAvailable: !!token
    });
  }, [permissionStatus, tokenStatus, token]);

  // Create context value
  const contextValue = {
    permissionStatus,
    tokenStatus,
    token,
    requestPermission,
    error
  };

  return (
    <MessagingContext.Provider value={contextValue}>
      {/* Render the notification handler */}
      {permissionStatus === 'granted' && <NotificationHandler />}
      {children}
    </MessagingContext.Provider>
  );
};

/**
 * Hook to access Firebase Messaging context
 */
export const useMessaging = () => useContext(MessagingContext);

export default FirebaseMessagingProvider; 