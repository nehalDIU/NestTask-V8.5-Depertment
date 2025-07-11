import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')!

interface NotificationPayload {
  task_id: string
  task_name: string
  section_id: string
  due_date: string
  category: string
  description?: string
  created_by: string
}

interface FCMTokenData {
  user_id: string
  token: string
  device_type: string
  user_name: string
  user_email: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { task_id, task_name, section_id, due_date, category, description, created_by }: NotificationPayload = await req.json()
    
    console.log('Received task notification request:', { task_id, task_name, section_id, category })
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get FCM tokens for section users (excluding the admin who created the task)
    const { data: tokens, error } = await supabase
      .rpc('get_section_fcm_tokens', { p_section_id: section_id })
    
    if (error) {
      console.error('Error fetching FCM tokens:', error)
      throw error
    }
    
    if (!tokens || tokens.length === 0) {
      console.log('No active FCM tokens found for section:', section_id)
      return new Response(JSON.stringify({ 
        message: 'No active tokens found for this section',
        section_id,
        task_id 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    console.log(`Found ${tokens.length} FCM tokens for section ${section_id}`)
    
    // Prepare notification payload
    const notification = {
      title: `New ${category.replace('-', ' ').toUpperCase()}`,
      body: `${task_name} - Due: ${new Date(due_date).toLocaleDateString()}`,
    }
    
    const data = {
      task_id,
      category,
      section_id,
      type: 'task',
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      url: '/'
    }
    
    // Send notifications to all tokens
    const promises = tokens.map(async (tokenData: FCMTokenData) => {
      const fcmPayload = {
        to: tokenData.token,
        notification,
        data,
        priority: 'high',
        content_available: true,
        webpush: {
          notification: {
            title: notification.title,
            body: notification.body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            tag: `task-${task_id}`,
            requireInteraction: true,
            actions: [
              {
                action: 'view',
                title: 'View Task'
              },
              {
                action: 'dismiss',
                title: 'Dismiss'
              }
            ]
          },
          fcm_options: {
            link: '/'
          }
        }
      }
      
      try {
        console.log(`Sending FCM notification to user ${tokenData.user_name} (${tokenData.user_email})`)
        
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${fcmServerKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fcmPayload)
        })
        
        const result = await response.json()
        console.log('FCM response:', result)
        
        // Determine status based on FCM response
        let status = 'failed'
        let errorMessage = null
        
        if (result.success === 1) {
          status = 'sent'
        } else if (result.failure === 1) {
          status = 'failed'
          errorMessage = JSON.stringify(result.results)
        }
        
        // Log notification history
        const { error: historyError } = await supabase
          .from('notification_history')
          .insert({
            user_id: tokenData.user_id,
            title: notification.title,
            body: notification.body,
            data: data,
            notification_type: 'task',
            related_id: task_id,
            fcm_token: tokenData.token,
            status: status,
            error_message: errorMessage
          })
        
        if (historyError) {
          console.error('Error logging notification history:', historyError)
        }
        
        return { 
          success: result.success === 1, 
          token: tokenData.token,
          user_id: tokenData.user_id,
          user_name: tokenData.user_name,
          fcm_result: result
        }
      } catch (error) {
        console.error('FCM send error:', error)
        
        // Log failed notification
        await supabase
          .from('notification_history')
          .insert({
            user_id: tokenData.user_id,
            title: notification.title,
            body: notification.body,
            data: data,
            notification_type: 'task',
            related_id: task_id,
            fcm_token: tokenData.token,
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
        
        return { 
          success: false, 
          token: tokenData.token,
          user_id: tokenData.user_id,
          user_name: tokenData.user_name,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })
    
    const results = await Promise.all(promises)
    const successCount = results.filter(r => r.success).length
    
    console.log(`Notification results: ${successCount}/${tokens.length} successful`)
    
    return new Response(JSON.stringify({
      message: `Notifications sent to ${successCount}/${tokens.length} devices`,
      task_id,
      section_id,
      results,
      summary: {
        total: tokens.length,
        successful: successCount,
        failed: tokens.length - successCount
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Error in send-task-notification function:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Failed to send task notifications'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
