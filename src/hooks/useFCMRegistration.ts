import { useEffect, useState, useCallback } from 'react';
import {
  registerFCMToken,
  isFCMSupported,
  cleanupDuplicateTokens,
  getExistingFCMToken
} from '../services/fcm.service';
import { initializeMessaging } from '../firebase';

interface FCMRegistrationState {
  isRegistering: boolean;
  isRegistered: boolean;
  error: string | null;
  token: string | null;
}

export const useFCMRegistration = (userId?: string) => {
  const [state, setState] = useState<FCMRegistrationState>({
    isRegistering: false,
    isRegistered: false,
    error: null,
    token: null
  });

  const registerToken = useCallback(async (forceRegister = false) => {
    if (!userId) {
      console.log('⚠️ No user ID provided for FCM registration');
      return;
    }

    if (state.isRegistered && !forceRegister) {
      console.log('✅ FCM already registered for user:', userId);
      return;
    }

    if (state.isRegistering) {
      console.log('⏳ FCM registration already in progress');
      return;
    }

    setState(prev => ({ ...prev, isRegistering: true, error: null }));

    try {
      console.log('🔥 Starting FCM registration for user:', userId);

      // Check if FCM is supported
      if (!isFCMSupported()) {
        throw new Error('FCM is not supported in this browser');
      }

      // Clean up any duplicate tokens first
      console.log('🧹 Cleaning up duplicate tokens...');
      await cleanupDuplicateTokens(userId);

      // Check if we already have a valid token
      if (!forceRegister) {
        console.log('🔍 Checking for existing valid token...');
        const existingToken = await getExistingFCMToken(userId);
        if (existingToken) {
          console.log('✅ Found existing valid FCM token, reusing it');
          setState(prev => ({
            ...prev,
            isRegistering: false,
            isRegistered: true,
            token: existingToken,
            error: null
          }));
          return;
        }
      }

      // Initialize messaging first
      console.log('🚀 Initializing FCM messaging...');
      await initializeMessaging();

      // Wait for service worker to be ready
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
        console.log('✅ Service worker is ready');
      }

      // Register FCM token (this now handles deduplication internally)
      console.log('🎫 Registering FCM token...');
      const token = await registerFCMToken(userId);

      if (token) {
        console.log('✅ FCM token registered successfully:', token.substring(0, 20) + '...');
        setState(prev => ({
          ...prev,
          isRegistering: false,
          isRegistered: true,
          token,
          error: null
        }));
      } else {
        throw new Error('Failed to generate FCM token');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ FCM registration failed:', errorMessage);
      setState(prev => ({
        ...prev,
        isRegistering: false,
        isRegistered: false,
        error: errorMessage
      }));
    }
  }, [userId, state.isRegistered, state.isRegistering]);

  // Auto-register when user ID is available
  useEffect(() => {
    if (userId && !state.isRegistered && !state.isRegistering) {
      // Add a delay to ensure everything is properly initialized
      const timer = setTimeout(() => {
        registerToken();
      }, 2000); // 2 second delay

      return () => clearTimeout(timer);
    }
  }, [userId, registerToken, state.isRegistered, state.isRegistering]);

  // Retry registration on window focus (in case user granted permission)
  useEffect(() => {
    const handleFocus = () => {
      if (userId && !state.isRegistered && !state.isRegistering) {
        console.log('🔄 Window focused, retrying FCM registration...');
        registerToken();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [userId, registerToken, state.isRegistered, state.isRegistering]);

  return {
    ...state,
    registerToken: () => registerToken(true), // Force re-registration
    retry: () => registerToken(true)
  };
};
