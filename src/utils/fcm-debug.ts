import { supabase } from '../lib/supabase';
import { registerFCMToken, getUserFCMTokens } from '../services/fcm.service';

// Function to test service worker accessibility
export const testServiceWorker = async () => {
  try {
    console.log('🔧 Testing service worker accessibility...');

    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.error('❌ Service Worker not supported');
      return;
    }

    // Test if firebase-messaging-sw.js is accessible
    try {
      const response = await fetch('/firebase-messaging-sw.js');
      if (response.ok) {
        console.log('✅ firebase-messaging-sw.js is accessible');
      } else {
        console.error('❌ firebase-messaging-sw.js not accessible:', response.status);
      }
    } catch (fetchError) {
      console.error('❌ Error fetching firebase-messaging-sw.js:', fetchError);
    }

    // Check current service worker registrations
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log('📋 Current service worker registrations:', registrations);

    // Check if our FCM service worker is registered
    const fcmRegistration = registrations.find(reg =>
      reg.scope.includes('/') && reg.active?.scriptURL.includes('firebase-messaging-sw.js')
    );

    if (fcmRegistration) {
      console.log('✅ FCM service worker is registered:', fcmRegistration);
    } else {
      console.log('⚠️ FCM service worker not found in registrations');
    }

  } catch (error) {
    console.error('❌ Service worker test error:', error);
  }
};

// Debug function to test FCM token registration
export const debugFCMTokens = async () => {
  try {
    console.log('🔍 Starting FCM Debug...');

    // Test service worker first
    await testServiceWorker();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ No authenticated user found:', userError);
      return;
    }

    console.log('👤 Current user:', user.id);
    
    // Check if fcm_tokens table exists
    console.log('🔍 Checking if fcm_tokens table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('fcm_tokens')
      .select('count')
      .limit(1);
    
    if (tableError) {
      console.error('❌ FCM tokens table does not exist or is not accessible:', tableError);
      console.log('💡 Please run the SQL migration to create the fcm_tokens table');
      return;
    }
    
    console.log('✅ FCM tokens table exists');
    
    // Check current tokens
    console.log('🔍 Checking existing FCM tokens...');
    const existingTokens = await getUserFCMTokens(user.id);
    console.log('📱 Existing tokens:', existingTokens);
    
    // Try to register a new token
    console.log('🚀 Attempting to register FCM token...');
    const newToken = await registerFCMToken(user.id);
    
    if (newToken) {
      console.log('✅ FCM token registration successful!');
      
      // Check tokens again
      const updatedTokens = await getUserFCMTokens(user.id);
      console.log('📱 Updated tokens:', updatedTokens);
    } else {
      console.log('❌ FCM token registration failed');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
};

// Function to manually test database connection
export const testFCMDatabase = async () => {
  try {
    console.log('🔍 Testing FCM database connection...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ No authenticated user');
      return;
    }
    
    // Test insert
    const testToken = `test-token-${Date.now()}`;
    const { data, error } = await supabase
      .from('fcm_tokens')
      .insert({
        user_id: user.id,
        fcm_token: testToken,
        device_type: 'web',
        device_info: { test: true },
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Database insert failed:', error);
    } else {
      console.log('✅ Database insert successful:', data);
      
      // Clean up test token
      await supabase
        .from('fcm_tokens')
        .delete()
        .eq('id', data.id);
      
      console.log('🧹 Test token cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Database test error:', error);
  }
};

// Function to test sending notifications
export const testSendNotification = async () => {
  try {
    console.log('🧪 Testing FCM notification sending...');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ No authenticated user');
      return;
    }

    // Get user's FCM tokens
    const { data: tokens, error } = await supabase
      .from('fcm_tokens')
      .select('fcm_token')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching tokens:', error);
      return;
    }

    if (!tokens || tokens.length === 0) {
      console.error('❌ No FCM tokens found for user');
      return;
    }

    console.log('📱 Found', tokens.length, 'FCM tokens');

    // Import the notification service
    const { sendFCMNotification } = await import('../services/fcm-notifications.service');

    // Send test notification
    const payload = {
      title: 'Test Notification',
      body: 'This is a test notification from NestTask FCM system',
      icon: '/icons/icon-192x192.png',
      tag: 'test-notification',
      data: {
        url: '/',
        type: 'test',
        timestamp: Date.now().toString()
      }
    };

    const tokenStrings = tokens.map(t => t.fcm_token);
    console.log('📤 Sending notification to tokens...');

    const results = await sendFCMNotification(tokenStrings, payload);

    console.log('📊 Notification results:', results);

    const successCount = Object.values(results).filter(r => r.success).length;
    const failureCount = Object.values(results).filter(r => !r.success).length;

    console.log(`✅ Success: ${successCount}, ❌ Failed: ${failureCount}`);

  } catch (error) {
    console.error('❌ Test notification error:', error);
  }
};

// Function to test browser notifications (fallback)
export const testBrowserNotification = () => {
  try {
    console.log('🔔 Testing browser notification...');

    if (!('Notification' in window)) {
      console.error('❌ Browser notifications not supported');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.error('❌ Notification permission not granted');
      return;
    }

    const notification = new Notification('Test Browser Notification', {
      body: 'This is a test browser notification',
      icon: '/icons/icon-192x192.png',
      tag: 'test-browser-notification'
    });

    notification.onclick = () => {
      console.log('🖱️ Notification clicked');
      notification.close();
    };

    console.log('✅ Browser notification sent');

  } catch (error) {
    console.error('❌ Browser notification error:', error);
  }
};

// Function to manually test FCM token generation
export const testFCMTokenGeneration = async () => {
  try {
    console.log('🎫 Testing FCM token generation manually...');

    // Import FCM functions
    const { initializeMessaging, getFCMToken, requestNotificationPermission } = await import('../firebase');

    // Check notification permission
    console.log('🔔 Current notification permission:', Notification.permission);

    if (Notification.permission !== 'granted') {
      console.log('🔔 Requesting notification permission...');
      const permission = await requestNotificationPermission();
      console.log('🔔 Permission result:', permission);

      if (permission !== 'granted') {
        console.error('❌ Notification permission denied');
        return;
      }
    }

    // Initialize messaging
    console.log('🚀 Initializing FCM messaging...');
    const messaging = await initializeMessaging();

    if (!messaging) {
      console.error('❌ Failed to initialize FCM messaging');
      return;
    }

    // Generate token
    console.log('🎫 Generating FCM token...');
    const token = await getFCMToken();

    if (token) {
      console.log('✅ FCM token generated successfully!');
      console.log('🎫 Token:', token);
      return token;
    } else {
      console.error('❌ Failed to generate FCM token');
      return null;
    }

  } catch (error) {
    console.error('❌ FCM token generation test error:', error);
    return null;
  }
};

// Function to check FCM prerequisites
export const checkFCMPrerequisites = () => {
  console.log('🔍 Checking FCM prerequisites...');

  const checks = {
    https: location.protocol === 'https:' || location.hostname === 'localhost',
    serviceWorker: 'serviceWorker' in navigator,
    notification: 'Notification' in window,
    pushManager: 'PushManager' in window,
    permission: Notification.permission
  };

  console.log('📋 FCM Prerequisites Check:');
  console.log('  ✅ HTTPS/Localhost:', checks.https);
  console.log('  ✅ Service Worker:', checks.serviceWorker);
  console.log('  ✅ Notifications:', checks.notification);
  console.log('  ✅ Push Manager:', checks.pushManager);
  console.log('  🔔 Permission:', checks.permission);

  const allGood = checks.https && checks.serviceWorker && checks.notification && checks.pushManager;

  if (allGood) {
    console.log('✅ All FCM prerequisites met!');
  } else {
    console.log('❌ Some FCM prerequisites are missing');
  }

  return checks;
};

// Function to check token management
export const debugTokenManagement = async () => {
  try {
    console.log('🔍 Debugging FCM token management...');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ No authenticated user');
      return;
    }

    // Import token management functions
    const {
      getTokenStatistics,
      cleanupDuplicateTokens,
      getUserFCMTokens
    } = await import('../services/fcm.service');

    // Get current tokens for user
    console.log('📊 Current tokens for user:');
    const userTokens = await getUserFCMTokens(user.id);
    console.table(userTokens.map(token => ({
      id: token.id,
      token_preview: token.fcm_token.substring(0, 30) + '...',
      is_active: token.is_active,
      created_at: token.created_at,
      updated_at: token.updated_at
    })));

    // Get statistics
    console.log('📈 Token statistics for user:');
    const userStats = await getTokenStatistics(user.id);
    console.log(userStats);

    // Check for duplicates
    const activeDuplicates = userTokens.filter(t => t.is_active).length;
    if (activeDuplicates > 1) {
      console.warn(`⚠️ Found ${activeDuplicates} active tokens (potential duplicates)`);
      console.log('🧹 Running duplicate cleanup...');
      await cleanupDuplicateTokens(user.id);

      // Check again after cleanup
      const tokensAfterCleanup = await getUserFCMTokens(user.id);
      const activeAfterCleanup = tokensAfterCleanup.filter(t => t.is_active).length;
      console.log(`✅ After cleanup: ${activeAfterCleanup} active tokens`);
    } else {
      console.log('✅ No duplicate tokens found');
    }

  } catch (error) {
    console.error('❌ Token management debug error:', error);
  }
};

// Function to simulate logout/login cycle
export const simulateLogoutLogin = async () => {
  try {
    console.log('🔄 Simulating logout/login cycle...');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ No authenticated user');
      return;
    }

    // Import functions
    const { deactivateFCMTokensForUser, registerFCMToken } = await import('../services/fcm.service');

    console.log('1️⃣ Simulating logout - deactivating tokens...');
    await deactivateFCMTokensForUser(user.id);

    console.log('2️⃣ Simulating login - registering new token...');
    const newToken = await registerFCMToken(user.id);

    if (newToken) {
      console.log('✅ Logout/login simulation completed successfully');
      console.log('🎫 New token:', newToken.substring(0, 30) + '...');
    } else {
      console.error('❌ Failed to register token during simulation');
    }

    // Show final state
    await debugTokenManagement();

  } catch (error) {
    console.error('❌ Logout/login simulation error:', error);
  }
};

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).debugFCMTokens = debugFCMTokens;
  (window as any).testFCMDatabase = testFCMDatabase;
  (window as any).testSendNotification = testSendNotification;
  (window as any).testBrowserNotification = testBrowserNotification;
  (window as any).testServiceWorker = testServiceWorker;
  (window as any).testFCMTokenGeneration = testFCMTokenGeneration;
  (window as any).checkFCMPrerequisites = checkFCMPrerequisites;
  (window as any).debugTokenManagement = debugTokenManagement;
  (window as any).simulateLogoutLogin = simulateLogoutLogin;
}
