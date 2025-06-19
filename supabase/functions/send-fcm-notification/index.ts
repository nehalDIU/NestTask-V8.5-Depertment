import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// You'll need to set these environment variables in your Supabase project
const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') || 'nesttask-diu'
const FIREBASE_PRIVATE_KEY = Deno.env.get('FIREBASE_PRIVATE_KEY') || ''
const FIREBASE_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL') || ''

interface FCMMessage {
  token: string
  notification?: {
    title: string
    body: string
    icon?: string
    badge?: string
  }
  data?: Record<string, string>
  webpush?: {
    notification?: {
      title: string
      body: string
      icon?: string
      badge?: string
      tag?: string
      requireInteraction?: boolean
      actions?: Array<{
        action: string
        title: string
        icon?: string
      }>
    }
  }
}

interface FCMBatchRequest {
  tokens: string[]
  notification?: {
    title: string
    body: string
    icon?: string
    badge?: string
  }
  data?: Record<string, string>
  webpush?: {
    notification?: {
      title: string
      body: string
      icon?: string
      badge?: string
      tag?: string
      requireInteraction?: boolean
      actions?: Array<{
        action: string
        title: string
        icon?: string
      }>
    }
  }
}

// Generate JWT token for Firebase Admin SDK
async function generateAccessToken(): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }

  // For production, you would use proper JWT signing
  // This is a simplified version - you'll need to implement proper RSA signing
  const encodedHeader = btoa(JSON.stringify(header))
  const encodedPayload = btoa(JSON.stringify(payload))
  
  // Note: In a real implementation, you'd need to sign this with your private key
  // For now, we'll use a placeholder approach
  const signature = 'placeholder-signature'
  
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

// Send FCM message to a single token
async function sendFCMMessage(message: FCMMessage): Promise<{ success: boolean; messageId?: string; error?: string; tokenInvalid?: boolean }> {
  try {
    // Get access token
    const accessToken = await generateAccessToken()

    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          token: message.token,
          notification: message.notification,
          data: message.data,
          webpush: message.webpush
        }
      })
    })

    if (response.ok) {
      const result = await response.json()
      return {
        success: true,
        messageId: result.name
      }
    } else {
      const error = await response.json()
      console.error('FCM send error:', error)
      
      // Check if token is invalid
      const isTokenInvalid = error.error?.details?.some((detail: any) => 
        detail.errorCode === 'UNREGISTERED' || 
        detail.errorCode === 'INVALID_ARGUMENT'
      )
      
      return {
        success: false,
        error: error.error?.message || 'Unknown error',
        tokenInvalid: isTokenInvalid
      }
    }
  } catch (error) {
    console.error('Error sending FCM message:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
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
    const { tokens, notification, data, webpush }: FCMBatchRequest = await req.json()

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No tokens provided' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    // Send notifications to all tokens
    const results: Record<string, any> = {}
    
    for (const token of tokens) {
      const message: FCMMessage = {
        token,
        notification,
        data,
        webpush
      }
      
      results[token] = await sendFCMMessage(message)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: {
          total: tokens.length,
          successful: Object.values(results).filter((r: any) => r.success).length,
          failed: Object.values(results).filter((r: any) => !r.success).length
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  } catch (error) {
    console.error('Error in send-fcm-notification function:', error)
    
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
