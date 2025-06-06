import { supabase } from '../lib/supabase';
import { getFcmToken } from '../firebase';

/**
 * Utility to test FCM token registration and Supabase integration
 */

/**
 * Test FCM token retrieval
 * @returns The FCM token or null if not available
 */
export const testFcmToken = async (): Promise<string | null> => {
  try {
    console.log('Testing FCM token retrieval...');
    
    // Check service worker registration
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log('Service worker registrations:', registrations);
      
      if (registrations.length === 0) {
        console.warn('No service worker registrations found');
      } else {
        registrations.forEach(reg => {
          console.log('Service worker registration scope:', reg.scope);
          console.log('Service worker registration state:', reg.active ? 'active' : 'inactive');
        });
      }
    } else {
      console.warn('Service workers not supported in this browser');
    }
    
    // Check notification permission
    if ('Notification' in window) {
      console.log('Notification permission status:', Notification.permission);
      
      if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted');
      }
    } else {
      console.warn('Notifications not supported in this browser');
    }
    
    // Try to get FCM token
    const token = await getFcmToken();
    
    if (token) {
      console.log('FCM token retrieved successfully');
      console.log('Token preview:', token.substring(0, 10) + '...');
      return token;
    } else {
      console.error('Failed to retrieve FCM token');
      return null;
    }
  } catch (error) {
    console.error('Error testing FCM token:', error);
    return null;
  }
};

/**
 * Test storing FCM token in Supabase
 * @param token The FCM token to store
 * @returns Success status
 */
export const testStoreTokenInSupabase = async (token: string): Promise<boolean> => {
  try {
    console.log('Testing FCM token storage in Supabase...');
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Authentication error:', userError);
      return false;
    }
    
    if (!user) {
      console.warn('No authenticated user found');
      return false;
    }
    
    console.log('Authenticated as user:', user.id);
    
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
      
      // Check if the table exists
      console.log('Checking if fcm_tokens table exists...');
      
      const { error: tableError } = await supabase
        .from('fcm_tokens')
        .select('count(*)')
        .limit(1);
      
      if (tableError) {
        console.error('Error accessing fcm_tokens table:', tableError);
        console.warn('The fcm_tokens table might not exist in your Supabase project');
      }
      
      return false;
    }
    
    console.log('FCM token stored successfully in Supabase');
    return true;
  } catch (error) {
    console.error('Error testing FCM token storage:', error);
    return false;
  }
};

/**
 * Run a complete FCM test
 * @returns Test results object
 */
export const runFcmTest = async () => {
  const results = {
    serviceWorkerSupported: 'serviceWorker' in navigator,
    notificationsSupported: 'Notification' in window,
    notificationPermission: 'Notification' in window ? Notification.permission : 'unsupported',
    tokenRetrieved: false,
    tokenStored: false,
    errors: [] as string[]
  };
  
  try {
    // Test FCM token retrieval
    const token = await testFcmToken();
    results.tokenRetrieved = !!token;
    
    // Test token storage if token was retrieved
    if (token) {
      results.tokenStored = await testStoreTokenInSupabase(token);
    } else {
      results.errors.push('Failed to retrieve FCM token');
    }
  } catch (error) {
    results.errors.push(`Test error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  console.log('FCM test results:', results);
  return results;
};

/**
 * Check if FCM is properly set up
 * @returns True if FCM is properly set up
 */
export const isFcmSetupComplete = async (): Promise<boolean> => {
  // Check service worker registration
  if (!('serviceWorker' in navigator)) {
    return false;
  }
  
  // Check notification permission
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }
  
  // Check token retrieval
  const token = await getFcmToken();
  if (!token) {
    return false;
  }
  
  // Check Supabase authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }
  
  // Check token storage
  const { data, error } = await supabase
    .from('fcm_tokens')
    .select('id')
    .eq('user_id', user.id)
    .eq('fcm_token', token)
    .limit(1);
  
  if (error || !data || data.length === 0) {
    return false;
  }
  
  return true;
}; 