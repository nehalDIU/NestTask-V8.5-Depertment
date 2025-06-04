import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { JWT } from 'https://esm.sh/google-auth-library';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

interface Task { id: string; section_id: string; title: string; description: string; created_by: string; }
interface WebhookPayload { type: 'INSERT'; table: string; record: Task; schema: 'public'; }

serve(async (req) => {
  const payload: WebhookPayload = await req.json();
  if (payload.table === 'tasks' && payload.type === 'INSERT') {
    const task = payload.record;
    const { data: creator } = await supabase
      .from('users')
      .select('role, section_id')
      .eq('id', task.created_by)
      .single();

    if (creator?.role === 'section_admin' && creator?.section_id === task.section_id) {
      const { data: tokens } = await supabase
        .from('fcm_tokens')
        .select('fcm_token')
        .in('user_id', (
          await supabase.from('users').select('id').eq('section_id', task.section_id)
        ).data?.map((u: any) => u.id) || []);

      if (tokens?.length) {
        const accessToken = await getGoogleAccessToken();
        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${Deno.env.get('FIREBASE_PROJECT_ID')}/messages:send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              notification: { title: `New Task: ${task.title}`, body: task.description || 'New task added.' },
              tokens: tokens.map((t: any) => t.fcm_token),
            },
          }),
        }).then((res) => res.json());

        return new Response(JSON.stringify({ success: true, response }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }
  return new Response(JSON.stringify({ success: false }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function getGoogleAccessToken() {
  const client = new JWT({
    email: Deno.env.get('FIREBASE_CLIENT_EMAIL'),
    key: Deno.env.get('FIREBASE_PRIVATE_KEY'),
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const token = await client.getAccessToken();
  return token.token;
}