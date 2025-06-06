import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import firebase, { getFcmToken } from '../firebase';

// Export as both named and default export for compatibility
export const useFcmToken = () => {
  useEffect(() => {
    const registerToken = async () => {
      try {
        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Notification permission denied');
          return;
        }

        // Get FCM token - try both import methods
        let token;
        try {
          // Try the named import first
          token = await getFcmToken();
        } catch (err) {
          console.log('Trying default import method for FCM token');
          // If that fails, try the default import
          token = await firebase.getFcmToken();
        }
        
        if (!token) return;

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Store token in fcm_tokens table
        await supabase
          .from('fcm_tokens')
          .upsert({ user_id: user.id, fcm_token: token });
        console.log('FCM token registered');
      } catch (error) {
        console.error('Error registering FCM token:', error);
      }
    };

    registerToken();
  }, []);
};

// Add default export to ensure compatibility with both import styles
export default useFcmToken;