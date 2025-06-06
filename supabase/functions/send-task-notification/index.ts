import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';

// Simple FCM implementation for Edge Functions
const sendNotifications = async (tokens: string[], title: string, body: string) => {
  if (tokens.length === 0) return { success: 0, failure: 0 };

  try {
    const fcmApiKey = Deno.env.get('FIREBASE_API_KEY');
    if (!fcmApiKey) {
      console.error('Firebase API key not found');
      return { success: 0, failure: tokens.length };
    }

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmApiKey}`
      },
      body: JSON.stringify({
        notification: {
          title,
          body
        },
        registration_ids: tokens
      })
    });

    const result = await response.json();
    console.log('FCM response:', result);
    
    return { 
      success: result.success || 0, 
      failure: result.failure || 0 
    };
  } catch (error) {
    console.error('Error sending notifications:', error);
    return { success: 0, failure: tokens.length };
  }
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

serve(async (req) => {
  try {
    const payload = await req.json();
    const { table, type, record } = payload;

    if (table !== 'tasks' || type !== 'INSERT') {
      return new Response('Ignored: Not an INSERT on tasks table', { status: 200 });
    }

    const { user_id, section_id, name, description } = record;

    if (!section_id) {
      return new Response('Ignored: Task has no section_id', { status: 200 });
    }

    const { data: creator, error: creatorError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user_id)
      .single();

    if (creatorError || !creator) {
      console.error('Error fetching creator:', creatorError);
      return new Response('Error fetching creator', { status: 500 });
    }

    if (creator.role !== 'section_admin') {
      return new Response('Ignored: Creator is not a section_admin', { status: 200 });
    }

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('section_id', section_id)
      .neq('id', user_id);

    if (usersError || !users) {
      console.error('Error fetching users:', usersError);
      return new Response('Error fetching users', { status: 500 });
    }

    const userIds = users.map((user) => user.id);

    const { data: tokens, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('fcm_token')
      .in('user_id', userIds);

    if (tokensError || !tokens) {
      console.error('Error fetching FCM tokens:', tokensError);
      return new Response('Error fetching FCM tokens', { status: 500 });
    }

    const fcmTokens = tokens.map((token) => token.fcm_token);

    if (fcmTokens.length > 0) {
      const title = `New Task: ${name}`;
      const body = description || 'A new task has been assigned to your section.';
      
      const result = await sendNotifications(fcmTokens, title, body);
      console.log(`Notifications sent: ${result.success} successful, ${result.failure} failed`);
    }

    return new Response('Notifications processed', { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response('Unexpected error', { status: 500 });
  }
}); 