import { serve } from 'https://deno.land/std@0.218.0/http/server.ts';

// FCM Server Key - Replace with your actual FCM server key
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY') || 'your-fcm-server-key';
const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';

interface FCMPayload {
  to?: string;
  registration_ids?: string[];
  notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    requireInteraction?: boolean;
  };
  data?: Record<string, any>;
  webpush?: {
    headers?: Record<string, string>;
    data?: Record<string, any>;
    notification?: Record<string, any>;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
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
    const { tokens, notification, data } = await req.json();

    if (!tokens || (!Array.isArray(tokens) && typeof tokens !== 'string')) {
      return new Response(
        JSON.stringify({ error: 'Invalid tokens provided' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Prepare FCM payload
    const fcmPayload: FCMPayload = {
      notification: {
        title: notification?.title || 'NestTask Notification',
        body: notification?.body || 'You have a new notification',
        icon: notification?.icon || '/icons/icon-192x192.png',
        badge: notification?.badge || '/icons/icon-192x192.png',
        tag: notification?.tag || 'nesttask-notification',
        requireInteraction: notification?.requireInteraction || true,
      },
      data: data || {},
      webpush: {
        headers: {
          'TTL': '86400' // 24 hours
        },
        notification: {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          actions: [
            {
              action: 'open',
              title: 'Open App',
              icon: '/icons/icon-192x192.png'
            },
            {
              action: 'dismiss',
              title: 'Dismiss',
              icon: '/icons/icon-192x192.png'
            }
          ]
        }
      }
    };

    // Handle single token or multiple tokens
    if (typeof tokens === 'string') {
      fcmPayload.to = tokens;
    } else {
      fcmPayload.registration_ids = tokens;
    }

    // Send notification to FCM
    const response = await fetch(FCM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('FCM Error:', result);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send FCM notification',
          details: result 
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        result: result
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('Error sending FCM notification:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
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
