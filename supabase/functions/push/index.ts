import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')!

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface FCMNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, any>
  requireInteraction?: boolean
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

interface FCMSendRequest {
  userIds?: string[]
  tokens?: string[]
  notification: FCMNotificationPayload
  data?: Record<string, string>
}

// Send FCM notification to a single token
async function sendFCMToToken(token: string, payload: any): Promise<{ success: boolean; error?: string; tokenInvalid?: boolean }> {
  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FIREBASE_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: payload.notification.title,
          body: payload.notification.body,
          icon: payload.notification.icon || '/icons/icon-192x192.png',
          badge: payload.notification.badge || '/icons/icon-192x192.png',
          tag: payload.notification.tag || 'nesttask-notification',
          requireInteraction: payload.notification.requireInteraction || false
        },
        data: {
          ...payload.data,
          click_action: payload.data?.url || '/'
        },
        webpush: {
          notification: {
            title: payload.notification.title,
            body: payload.notification.body,
            icon: payload.notification.icon || '/icons/icon-192x192.png',
            badge: payload.notification.badge || '/icons/icon-192x192.png',
            tag: payload.notification.tag || 'nesttask-notification',
            requireInteraction: payload.notification.requireInteraction || false,
            actions: payload.notification.actions || []
          }
        }
      })
    })

    if (response.ok) {
      const result = await response.json()
      return { success: true }
    } else {
      const errorResult = await response.json()
      console.error('FCM send error:', errorResult)
      
      // Check if token is invalid
      const isTokenInvalid = errorResult.error === 'InvalidRegistration' || 
                            errorResult.error === 'NotRegistered'
      
      return {
        success: false,
        error: errorResult.error || 'Unknown error',
        tokenInvalid: isTokenInvalid
      }
    }
  } catch (error) {
    console.error('Error sending FCM:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Get FCM tokens for user IDs
async function getFCMTokensForUsers(userIds: string[]): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('fcm_tokens')
      .select('fcm_token')
      .in('user_id', userIds)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching FCM tokens:', error)
      return []
    }

    return data?.map(row => row.fcm_token) || []
  } catch (error) {
    console.error('Error in getFCMTokensForUsers:', error)
    return []
  }
}

// Mark invalid tokens as inactive
async function markTokenAsInactive(token: string): Promise<void> {
  try {
    await supabase
      .from('fcm_tokens')
      .update({ is_active: false })
      .eq('fcm_token', token)
  } catch (error) {
    console.error('Error marking token as inactive:', error)
  }
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
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const { userIds, tokens, notification, data }: FCMSendRequest = await req.json()

    // Log the incoming request for debugging
    console.log('FCM Push Request:', {
      userIds: userIds?.length || 0,
      tokens: tokens?.length || 0,
      notification: notification?.title,
      source: req.headers.get('user-agent')?.includes('pg_net') ? 'database-trigger' : 'client'
    })

    if (!notification?.title || !notification?.body) {
      return new Response(
        JSON.stringify({ error: 'Notification title and body are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let fcmTokens: string[] = []

    // Get tokens either from userIds or direct tokens
    if (userIds && userIds.length > 0) {
      console.log(`Getting FCM tokens for ${userIds.length} users`)
      fcmTokens = await getFCMTokensForUsers(userIds)
      console.log(`Found ${fcmTokens.length} active FCM tokens`)
    } else if (tokens && tokens.length > 0) {
      fcmTokens = tokens
      console.log(`Using ${fcmTokens.length} provided tokens`)
    } else {
      return new Response(
        JSON.stringify({ error: 'Either userIds or tokens must be provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (fcmTokens.length === 0) {
      console.log('No FCM tokens found, returning success with zero sends')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No FCM tokens found for the specified users',
          results: {},
          summary: { total: 0, successful: 0, failed: 0, userIds: userIds?.length || 0 }
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    console.log(`Sending FCM notifications to ${fcmTokens.length} tokens`)
    console.log(`Notification: "${notification.title}" - "${notification.body}"`)

    // Send notifications to all tokens
    const results: Record<string, any> = {}
    const promises = fcmTokens.map(async (token) => {
      const result = await sendFCMToToken(token, { notification, data })
      results[token] = result

      // Mark invalid tokens as inactive
      if (result.tokenInvalid) {
        console.log(`Marking invalid token as inactive: ${token.substring(0, 20)}...`)
        await markTokenAsInactive(token)
      }

      return result
    })

    await Promise.all(promises)

    const summary = {
      total: fcmTokens.length,
      successful: Object.values(results).filter((r: any) => r.success).length,
      failed: Object.values(results).filter((r: any) => !r.success).length,
      userIds: userIds?.length || 0
    }

    console.log('FCM send summary:', summary)

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )

  } catch (error) {
    console.error('Error in push function:', error)

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
