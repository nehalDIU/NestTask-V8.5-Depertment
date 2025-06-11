import { supabase } from '../lib/supabase';
import { getFCMToken, requestNotificationPermission as requestFCMPermission, initializeFCM } from '../firebase';

// Create FCM tokens table if it doesn't exist
export async function createFCMTokensTable(): Promise<boolean> {
  try {
    console.log('🔧 Attempting to create FCM tokens table...');

    const { error } = await supabase.rpc('create_fcm_tokens_table_if_not_exists');

    if (error) {
      console.error('❌ Failed to create FCM tokens table:', error);

      // Try alternative approach using raw SQL
      const { error: sqlError } = await supabase
        .from('fcm_tokens')
        .select('id')
        .limit(1);

      if (sqlError && sqlError.code === 'PGRST116') {
        console.warn('⚠️ FCM tokens table does not exist and cannot be created automatically');
        console.info('💡 Please run the following SQL in your Supabase dashboard:');
        console.info(`
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, fcm_token)
);
        `);
        return false;
      }

      return false;
    }

    console.log('✅ FCM tokens table created successfully');
    return true;
  } catch (error) {
    console.error('❌ Error creating FCM tokens table:', error);
    return false;
  }
}

// Test database connection specifically for FCM tokens table
export async function testFCMDatabaseConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing FCM database connection...');

    // Test basic connection first
    const { data: testData, error: testError } = await supabase
      .from('fcm_tokens')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('❌ FCM database connection failed:', {
        error: testError.message,
        code: testError.code,
        details: testError.details,
        hint: testError.hint
      });

      // Check if the table doesn't exist
      if (testError.code === 'PGRST116' || testError.message.includes('relation "fcm_tokens" does not exist')) {
        console.warn('⚠️ FCM tokens table does not exist. Please run the migration.');
        return false;
      }

      return false;
    }

    console.log('✅ FCM database connection successful');
    return true;
  } catch (error) {
    console.error('❌ FCM database connection test error:', error);
    return false;
  }
}

// Request notification permission (using FCM)
export async function requestNotificationPermission(): Promise<boolean> {
  return await requestFCMPermission();
}

// Subscribe to push notifications using FCM
export async function subscribeToPushNotifications(userId: string) {
  try {
    console.log('🔔 Starting FCM subscription process for user:', userId.substring(0, 8) + '...');

    // Validate inputs
    if (!userId) {
      throw new Error('User ID is required for FCM subscription');
    }

    // Initialize FCM and get token
    console.log('🔥 Initializing FCM...');
    const fcmToken = await initializeFCM();

    if (!fcmToken) {
      console.warn('❌ Failed to get FCM token - permission may not be granted');
      return null;
    }

    console.log('✅ FCM token obtained:', {
      tokenLength: fcmToken.length,
      tokenPrefix: fcmToken.substring(0, 20) + '...'
    });

    // Save FCM token to database
    console.log('💾 Saving FCM token to database...');
    await saveFCMToken(userId, fcmToken);
    console.log('✅ FCM token saved to database successfully');

    // Verify the token was saved by reading it back
    try {
      const { data: verifyData, error: verifyError } = await supabase
        .from('fcm_tokens')
        .select('fcm_token')
        .eq('user_id', userId)
        .eq('fcm_token', fcmToken)
        .single();

      if (verifyError) {
        console.warn('⚠️ Could not verify FCM token was saved:', verifyError.message);
      } else if (verifyData) {
        console.log('✅ FCM token verified in database');
      }
    } catch (verifyError) {
      console.warn('⚠️ FCM token verification failed:', verifyError);
    }

    // Return a mock subscription object for compatibility
    return {
      endpoint: `fcm:${fcmToken}`,
      keys: {
        p256dh: 'fcm-token',
        auth: 'fcm-auth'
      },
      fcmToken
    };
  } catch (error) {
    console.error('❌ Error in FCM subscription:', {
      error: error.message,
      stack: error.stack,
      userId: userId.substring(0, 8) + '...'
    });
    return null;
  }
}

// Save FCM token to database with enhanced error handling
async function saveFCMToken(userId: string, fcmToken: string) {
  try {
    console.log('💾 Attempting to save FCM token to database...', {
      userId: userId.substring(0, 8) + '...',
      tokenLength: fcmToken.length,
      environment: import.meta.env.MODE,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.substring(0, 30) + '...'
    });

    // First, check if we can connect to Supabase
    const { data: testData, error: testError } = await supabase
      .from('fcm_tokens')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('❌ Supabase connection test failed:', testError);
      throw new Error(`Database connection failed: ${testError.message}`);
    }

    console.log('✅ Supabase connection test passed');

    // Now try to save the FCM token
    const { data, error } = await supabase
      .from('fcm_tokens')
      .upsert({
        user_id: userId,
        fcm_token: fcmToken,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,fcm_token'
      })
      .select();

    if (error) {
      console.error('❌ FCM token save failed:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('✅ FCM token saved successfully:', {
      recordsAffected: data?.length || 0,
      userId: userId.substring(0, 8) + '...'
    });

    return data;
  } catch (error) {
    console.error('❌ Error saving FCM token:', {
      error: error.message,
      stack: error.stack,
      userId: userId.substring(0, 8) + '...',
      tokenLength: fcmToken.length
    });
    throw error;
  }
}

// Legacy function for backward compatibility
async function saveSubscription(userId: string, subscription: any) {
  if (subscription.fcmToken) {
    return await saveFCMToken(userId, subscription.fcmToken);
  }
  // Handle legacy web-push subscriptions if needed
  console.warn('Legacy subscription format detected');
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(userId: string) {
  try {
    // Remove FCM token from database
    const { error } = await supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing FCM token:', error);
      return false;
    }

    // Also clean up legacy push_subscriptions if they exist
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    return true;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}

// Check if user has FCM token
export async function checkFCMSubscription(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('fcm_tokens')
      .select('fcm_token')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking FCM subscription:', error);
      return false;
    }

    return !!data?.fcm_token;
  } catch (error) {
    console.error('Error checking FCM subscription:', error);
    return false;
  }
}