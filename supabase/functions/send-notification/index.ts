import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Create a Supabase client with the service role key for admin access
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  userId?: string;  // Optional: Send to specific user
  topic?: string;   // Optional: Send to a topic
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        status: 204,
      });
    }

    // Check request method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get request body
    const payload: NotificationPayload = await req.json();
    
    // Validate required fields
    if (!payload.title || !payload.body) {
      return new Response(JSON.stringify({ error: 'Missing required fields: title and body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check authentication (JWT token)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get auth token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify token with Supabase Auth
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Determine if user has permission to send notifications
    const { data: userRoles } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
      
    const isAdmin = userRoles?.role === 'admin' || userRoles?.role === 'super-admin';
    
    // For security, only admins can send to specific users or all users
    if (!isAdmin && payload.userId && payload.userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Permission denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get FCM tokens
    let fcmTokensQuery = supabaseAdmin.from('fcm_tokens').select('fcm_token');
    
    // Filter by user if specified
    if (payload.userId) {
      fcmTokensQuery = fcmTokensQuery.eq('user_id', payload.userId);
    }
    
    const { data: tokens, error: tokensError } = await fcmTokensQuery;
    
    if (tokensError) {
      return new Response(JSON.stringify({ error: 'Error fetching FCM tokens' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No tokens found for notification' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prepare FCM message
    const fcmPayload = {
      message: {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        token: tokens.map(t => t.fcm_token),
      },
    };

    // Send notifications using Firebase Admin SDK via a secure proxy
    const fcmResponse = await fetch(Deno.env.get('FCM_RELAY_URL') || 'https://your-fcm-relay-service.com/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('FCM_RELAY_API_KEY')}`,
      },
      body: JSON.stringify(fcmPayload),
    });

    const fcmData = await fcmResponse.json();

    // Update last_used timestamp for the tokens
    await supabaseAdmin
      .from('fcm_tokens')
      .update({ last_used: new Date().toISOString() })
      .in('fcm_token', tokens.map(t => t.fcm_token));

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Notifications sent successfully', 
      recipients: tokens.length,
      fcmResponse: fcmData 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}); 