import { serve } from 'https://deno.land/std@0.218.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    console.log('🧪 Starting FCM test...');

    // Test 1: Check FCM configuration
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
    const fcmConfigured = fcmServerKey && fcmServerKey !== 'your-fcm-server-key';

    // Test 2: Check database connection
    const { data: dbTest, error: dbError } = await supabase
      .from('fcm_tokens')
      .select('count(*)')
      .limit(1);

    // Test 3: Get sample FCM tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('fcm_token, user_id, created_at')
      .eq('is_active', true)
      .limit(5);

    // Test 4: Test FCM endpoint connectivity
    let fcmConnectivity = false;
    try {
      const testResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${fcmServerKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'test-token',
          notification: { title: 'Test', body: 'Test' }
        })
      });
      fcmConnectivity = true; // If we get any response, connectivity is OK
    } catch (error) {
      console.error('FCM connectivity test failed:', error);
    }

    // Test 5: Send a test notification if we have tokens
    let testNotificationResult = null;
    if (fcmConfigured && tokens && tokens.length > 0) {
      try {
        const testToken = tokens[0].fcm_token;
        const testResponse = await fetch(`${supabaseUrl}/functions/v1/send-fcm-notification`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tokens: [testToken],
            notification: {
              title: '🧪 FCM Test',
              body: 'This is a test notification from Vercel deployment',
              tag: 'fcm-test'
            },
            data: {
              type: 'test',
              timestamp: new Date().toISOString()
            }
          })
        });

        if (testResponse.ok) {
          testNotificationResult = await testResponse.json();
        } else {
          testNotificationResult = {
            error: 'Failed to send test notification',
            status: testResponse.status,
            statusText: testResponse.statusText
          };
        }
      } catch (error) {
        testNotificationResult = {
          error: 'Exception during test notification',
          message: error.message
        };
      }
    }

    // Compile test results
    const testResults = {
      timestamp: new Date().toISOString(),
      tests: {
        fcmConfiguration: {
          status: fcmConfigured ? 'PASS' : 'FAIL',
          message: fcmConfigured 
            ? 'FCM server key is configured' 
            : 'FCM server key is missing or invalid',
          details: {
            hasKey: !!fcmServerKey,
            isPlaceholder: fcmServerKey === 'your-fcm-server-key'
          }
        },
        databaseConnection: {
          status: !dbError ? 'PASS' : 'FAIL',
          message: !dbError 
            ? 'Database connection successful' 
            : 'Database connection failed',
          error: dbError?.message
        },
        fcmTokensTable: {
          status: !tokensError ? 'PASS' : 'FAIL',
          message: !tokensError 
            ? `Found ${tokens?.length || 0} active FCM tokens` 
            : 'Failed to query FCM tokens table',
          tokenCount: tokens?.length || 0,
          error: tokensError?.message
        },
        fcmConnectivity: {
          status: fcmConnectivity ? 'PASS' : 'FAIL',
          message: fcmConnectivity 
            ? 'FCM endpoint is accessible' 
            : 'FCM endpoint is not accessible'
        },
        testNotification: testNotificationResult ? {
          status: testNotificationResult.error ? 'FAIL' : 'PASS',
          message: testNotificationResult.error 
            ? 'Test notification failed' 
            : 'Test notification sent successfully',
          result: testNotificationResult
        } : {
          status: 'SKIP',
          message: 'Skipped - no FCM tokens available or FCM not configured'
        }
      },
      summary: {
        totalTests: 5,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      recommendations: []
    };

    // Calculate summary
    Object.values(testResults.tests).forEach((test: any) => {
      switch (test.status) {
        case 'PASS':
          testResults.summary.passed++;
          break;
        case 'FAIL':
          testResults.summary.failed++;
          break;
        case 'SKIP':
          testResults.summary.skipped++;
          break;
      }
    });

    // Add recommendations
    if (!fcmConfigured) {
      testResults.recommendations.push(
        'Set FCM_SERVER_KEY environment variable in Supabase project settings'
      );
    }

    if (tokensError) {
      testResults.recommendations.push(
        'Run database migration to create fcm_tokens table'
      );
    }

    if (!fcmConnectivity) {
      testResults.recommendations.push(
        'Check network connectivity and firewall settings'
      );
    }

    if (tokens && tokens.length === 0) {
      testResults.recommendations.push(
        'No active FCM tokens found - users need to grant notification permission'
      );
    }

    console.log('✅ FCM test completed:', testResults.summary);

    return new Response(JSON.stringify(testResults, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('❌ FCM test failed:', error);
    
    return new Response(JSON.stringify({
      error: 'FCM test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});
