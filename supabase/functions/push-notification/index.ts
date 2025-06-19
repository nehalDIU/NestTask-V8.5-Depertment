import { serve } from 'https://deno.land/std@0.218.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import webpush from 'npm:web-push@3.6.7';

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY');
const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID');

// Legacy web-push configuration (for backward compatibility)
const VAPID_PUBLIC_KEY = 'BP0OqfYrKQh6jjbGPsCsh-RmZtsJKoDrcGdOLEgBn2ke2qbRR2DoC2cgF2XeRDKWcqFbWKWzJhLfhrxoRuTbxU8';
const VAPID_PRIVATE_KEY = 'N4XWQgw1uXxhu7H7AK3a84xJFZKVBwR1YqJuWl1qkFw';

webpush.setVapidDetails(
  'mailto:sheikhshariarnehal@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// FCM notification sending function
async function sendFCMNotification(token: string, payload: any) {
  if (!FIREBASE_SERVER_KEY) {
    throw new Error('Firebase Server Key not configured');
  }

  const fcmPayload = {
    to: token,
    notification: {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-192x192.png',
      tag: payload.tag || 'nesttask-notification',
      requireInteraction: payload.requireInteraction || false
    },
    data: payload.data || {},
    webpush: {
      headers: {
        Urgency: 'high'
      },
      notification: {
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/icon-192x192.png',
        actions: payload.actions || []
      }
    }
  };

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${FIREBASE_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fcmPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FCM request failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

// Send notifications to multiple users
async function sendNotificationToUsers(userIds: string[], payload: any, notificationType: 'fcm' | 'webpush' | 'both' = 'both') {
  const results = [];

  for (const userId of userIds) {
    try {
      if (notificationType === 'fcm' || notificationType === 'both') {
        // Get FCM tokens for the user
        const { data: fcmTokens, error: fcmError } = await supabase
          .from('fcm_tokens')
          .select('fcm_token')
          .eq('user_id', userId)
          .eq('is_active', true);

        if (!fcmError && fcmTokens?.length) {
          for (const tokenData of fcmTokens) {
            try {
              await sendFCMNotification(tokenData.fcm_token, payload);
              results.push({ userId, type: 'fcm', status: 'success' });
            } catch (error) {
              console.error(`Failed to send FCM notification to user ${userId}:`, error);
              results.push({ userId, type: 'fcm', status: 'error', error: error.message });
            }
          }
        }
      }

      if (notificationType === 'webpush' || notificationType === 'both') {
        // Get web-push subscriptions for the user (backward compatibility)
        const { data: subscriptions, error: subError } = await supabase
          .from('push_subscriptions')
          .select('subscription')
          .eq('user_id', userId);

        if (!subError && subscriptions?.length) {
          for (const subData of subscriptions) {
            try {
              const subscription = JSON.parse(subData.subscription);
              await webpush.sendNotification(subscription, JSON.stringify(payload));
              results.push({ userId, type: 'webpush', status: 'success' });
            } catch (error) {
              console.error(`Failed to send web-push notification to user ${userId}:`, error);
              results.push({ userId, type: 'webpush', status: 'error', error: error.message });
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error processing notifications for user ${userId}:`, error);
      results.push({ userId, type: 'error', status: 'error', error: error.message });
    }
  }

  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const body = await req.json();

    // Support multiple notification formats
    if (body.subscription && body.payload) {
      // Legacy web-push format
      await webpush.sendNotification(body.subscription, JSON.stringify(body.payload));
      return new Response(
        JSON.stringify({ success: true, type: 'webpush' }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    } else if (body.fcmToken && body.payload) {
      // FCM format
      const result = await sendFCMNotification(body.fcmToken, body.payload);
      return new Response(
        JSON.stringify({ success: true, type: 'fcm', result }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    } else if (body.userIds && body.payload) {
      // Bulk notification format
      const results = await sendNotificationToUsers(
        body.userIds,
        body.payload,
        body.notificationType || 'both'
      );
      return new Response(
        JSON.stringify({ success: true, type: 'bulk', results }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
  } catch (error) {
    console.error('Error sending notification:', error);

    return new Response(
      JSON.stringify({ error: 'Failed to send notification', details: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});