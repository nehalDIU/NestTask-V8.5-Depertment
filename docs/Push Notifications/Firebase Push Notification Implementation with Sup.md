<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# Firebase Push Notification Implementation with Supabase Database

Based on your NestTask project architecture, I'll provide a comprehensive solution for implementing Firebase Cloud Messaging (FCM) push notifications using Supabase as your database backend. This implementation will send notifications to section users when a section admin creates tasks.

## Architecture Overview

The system will use Firebase Cloud Messaging for push notifications while maintaining Supabase as your primary database. Here's how the components work together:

```
Section Admin Creates Task → Supabase Database → Edge Function → FCM → User Devices
```


## Database Schema for FCM Integration

### 1. FCM Tokens Table

Create a dedicated table to store FCM tokens for each user:

```sql
-- FCM tokens table
CREATE TABLE public.fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_type TEXT CHECK (device_type IN ('android', 'ios', 'web')),
  device_info JSONB, -- Store device details like model, OS version, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_used TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX idx_fcm_tokens_active ON fcm_tokens(is_active);
CREATE UNIQUE INDEX idx_fcm_tokens_user_token ON fcm_tokens(user_id, token);
```


### 2. Notification History Table

Track sent notifications for analytics and debugging:

```sql
-- Notification history table
CREATE TABLE public.notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB, -- Additional payload data
  notification_type TEXT DEFAULT 'task' CHECK (notification_type IN ('task', 'announcement', 'reminder', 'system')),
  related_id UUID, -- Reference to task, announcement, etc.
  fcm_token TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'clicked')),
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX idx_notification_history_type ON notification_history(notification_type);
CREATE INDEX idx_notification_history_related_id ON notification_history(related_id);
```


### 3. Notification Preferences Table

Allow users to control their notification preferences:

```sql
-- User notification preferences
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  task_notifications BOOLEAN DEFAULT true,
  announcement_notifications BOOLEAN DEFAULT true,
  reminder_notifications BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```


## Row Level Security (RLS) Policies

```sql
-- Enable RLS on FCM tokens table
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own tokens
CREATE POLICY "Users can manage own FCM tokens" ON fcm_tokens
FOR ALL USING (auth.uid() = user_id);

-- Enable RLS on notification history
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own notification history
CREATE POLICY "Users can view own notification history" ON notification_history
FOR SELECT USING (auth.uid() = user_id);

-- Admins can insert notifications for their sections
CREATE POLICY "Admins can create notifications" ON notification_history
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'section_admin', 'super-admin')
  )
);

-- Enable RLS on notification preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own preferences
CREATE POLICY "Users can manage own notification preferences" ON notification_preferences
FOR ALL USING (auth.uid() = user_id);
```


## Database Functions

### 1. FCM Token Management Functions

```sql
-- Function to upsert FCM token
CREATE OR REPLACE FUNCTION upsert_fcm_token(
  p_user_id UUID,
  p_token TEXT,
  p_device_type TEXT DEFAULT 'web',
  p_device_info JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  token_id UUID;
BEGIN
  -- Deactivate old tokens for the same user and device type
  UPDATE fcm_tokens 
  SET is_active = false, updated_at = now()
  WHERE user_id = p_user_id AND device_type = p_device_type AND is_active = true;
  
  -- Insert or update the new token
  INSERT INTO fcm_tokens (user_id, token, device_type, device_info, is_active)
  VALUES (p_user_id, p_token, p_device_type, p_device_info, true)
  ON CONFLICT (user_id, token) 
  DO UPDATE SET 
    is_active = true,
    device_info = p_device_info,
    updated_at = now(),
    last_used = now()
  RETURNING id INTO token_id;
  
  RETURN token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active FCM tokens for section users
CREATE OR REPLACE FUNCTION get_section_fcm_tokens(p_section_id UUID)
RETURNS TABLE (
  user_id UUID,
  token TEXT,
  device_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.user_id,
    ft.token,
    ft.device_type
  FROM fcm_tokens ft
  JOIN users u ON ft.user_id = u.id
  JOIN notification_preferences np ON u.id = np.user_id
  WHERE u.section_id = p_section_id 
    AND ft.is_active = true
    AND np.task_notifications = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```


### 2. Task Creation Trigger

```sql
-- Function to handle task creation notifications
CREATE OR REPLACE FUNCTION handle_task_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only send notifications for admin tasks
  IF NEW.is_admin_task = true AND NEW.section_id IS NOT NULL THEN
    -- Call edge function to send push notifications
    PERFORM
      net.http_post(
        url := 'https://your-project-id.supabase.co/functions/v1/send-task-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.jwt_token', true)
        ),
        body := jsonb_build_object(
          'task_id', NEW.id,
          'task_name', NEW.name,
          'section_id', NEW.section_id,
          'due_date', NEW.due_date,
          'category', NEW.category
        )
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for task notifications
CREATE TRIGGER task_notification_trigger
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION handle_task_notification();
```


## Supabase Edge Function for FCM

Create a Supabase Edge Function to handle FCM notifications[^1][^2]:

```typescript
// supabase/functions/send-task-notification/index.ts
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
}

serve(async (req) => {
  try {
    const { task_id, task_name, section_id, due_date, category }: NotificationPayload = await req.json()
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get FCM tokens for section users
    const { data: tokens, error } = await supabase
      .rpc('get_section_fcm_tokens', { p_section_id: section_id })
    
    if (error) throw error
    
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No active tokens found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Prepare notification payload
    const notification = {
      title: `New ${category.replace('-', ' ').toUpperCase()}`,
      body: `${task_name} - Due: ${new Date(due_date).toLocaleDateString()}`,
    }
    
    const data = {
      task_id,
      category,
      section_id,
      click_action: 'FLUTTER_NOTIFICATION_CLICK'
    }
    
    // Send notifications to all tokens
    const promises = tokens.map(async (tokenData) => {
      const fcmPayload = {
        to: tokenData.token,
        notification,
        data,
        priority: 'high',
        content_available: true
      }
      
      try {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${fcmServerKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fcmPayload)
        })
        
        const result = await response.json()
        
        // Log notification history
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
            status: result.success ? 'sent' : 'failed',
            error_message: result.failure ? JSON.stringify(result.results) : null
          })
        
        return { success: result.success === 1, token: tokenData.token }
      } catch (error) {
        console.error('FCM send error:', error)
        return { success: false, token: tokenData.token, error: error.message }
      }
    })
    
    const results = await Promise.all(promises)
    const successCount = results.filter(r => r.success).length
    
    return new Response(JSON.stringify({
      message: `Notifications sent to ${successCount}/${tokens.length} devices`,
      results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```


## Frontend Integration

### 1. FCM Token Registration Service

```typescript
// src/services/fcm.service.ts
import { supabase } from '../lib/supabase'

export interface FCMTokenData {
  token: string
  deviceType: 'android' | 'ios' | 'web'
  deviceInfo?: any
}

export async function registerFCMToken(tokenData: FCMTokenData): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase.rpc('upsert_fcm_token', {
      p_user_id: user.id,
      p_token: tokenData.token,
      p_device_type: tokenData.deviceType,
      p_device_info: tokenData.deviceInfo || {}
    })

    if (error) throw error
  } catch (error) {
    console.error('Error registering FCM token:', error)
    throw error
  }
}

export async function unregisterFCMToken(token: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('fcm_tokens')
      .update({ is_active: false })
      .eq('token', token)

    if (error) throw error
  } catch (error) {
    console.error('Error unregistering FCM token:', error)
    throw error
  }
}
```


### 2. React Hook for FCM Integration

```typescript
// src/hooks/useFCM.ts
import { useEffect } from 'react'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { registerFCMToken } from '../services/fcm.service'

export function useFCM() {
  useEffect(() => {
    const initializeFCM = async () => {
      try {
        // Request notification permission
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          console.log('Notification permission denied')
          return
        }

        // Get FCM token
        const messaging = getMessaging()
        const token = await getToken(messaging, {
          vapidKey: process.env.REACT_APP_VAPID_KEY
        })

        if (token) {
          // Register token with Supabase
          await registerFCMToken({
            token,
            deviceType: 'web',
            deviceInfo: {
              userAgent: navigator.userAgent,
              platform: navigator.platform
            }
          })
        }

        // Handle foreground messages
        onMessage(messaging, (payload) => {
          console.log('Foreground message received:', payload)
          
          // Show custom notification or update UI
          if (payload.notification) {
            new Notification(payload.notification.title || 'New Notification', {
              body: payload.notification.body,
              icon: '/icons/icon-192x192.png'
            })
          }
        })

      } catch (error) {
        console.error('FCM initialization error:', error)
      }
    }

    initializeFCM()
  }, [])
}
```


## Environment Variables

Add these environment variables to your Supabase Edge Function:

```bash
# In Supabase Dashboard > Edge Functions > Environment Variables
FCM_SERVER_KEY=your_firebase_server_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```


## Implementation Steps

1. **Set up Firebase Project**: Create a Firebase project and get your server key[^3][^4]
2. **Create Database Tables**: Run the SQL scripts to create FCM-related tables
3. **Deploy Edge Function**: Deploy the notification sending function to Supabase
4. **Frontend Integration**: Add FCM token registration to your React app
5. **Test Notifications**: Create test tasks as section admin to verify notifications

## Security Considerations

- Store FCM server keys securely in Supabase environment variables
- Implement proper RLS policies to prevent unauthorized access
- Validate user permissions before sending notifications
- Rate limit notification sending to prevent spam
- Handle token refresh and cleanup inactive tokens

This implementation provides a robust push notification system that integrates Firebase Cloud Messaging with your existing Supabase database architecture, ensuring section users receive notifications when admins create tasks for their section[^1][^2][^4].

<div style="text-align: center">⁂</div>

[^1]: https://bootstrapped.app/guide/how-to-implement-push-notifications-using-supabase

[^2]: https://supabase.com/docs/guides/functions/examples/push-notifications

[^3]: https://www.reddit.com/r/Supabase/comments/1eo2loi/does_push_notifications_with_firebase_require_the/

[^4]: https://stackoverflow.com/questions/73579388/how-to-setup-push-notification-with-supabase-in-flutter

[^5]: frontend-architecture.md

[^6]: README.md

[^7]: technical-specifications.md

[^8]: backend-architecture.md

[^9]: core-features.md

[^10]: database-schema.md

[^11]: https://www.youtube.com/watch?v=NfPiaJxayak

[^12]: https://makerkit.dev/blog/tutorials/real-time-notifications-supabase-nextjs

[^13]: https://stackoverflow.com/questions/69451138/firebase-database-structure-for-one-on-one-messaging

[^14]: https://community.flutterflow.io/ask-the-community/post/push-notifications-using-supabase-ZPjFSRSTj4MhtAI

[^15]: https://launchtoday.dev/blog/ios-push-notifications-supabase

[^16]: https://www.reddit.com/r/Firebase/comments/q1vwg5/database_structure_for_oneonone_messaging/

[^17]: https://supabase.com/partners/integrations

[^18]: https://www.reddit.com/r/reactnative/comments/1jagsy4/build_your_own_push_notification_system_for_free/

[^19]: https://novu.co/blog/the-ultimate-guide-to-firebase-cloud-messaging-fcm/

[^20]: https://community.flutterflow.io/ask-the-community/post/push-notification-using-firebase-fcm-token-with-supabase-cdZ2M7HhCLpUQZI

[^21]: https://supabase.com/docs/guides/getting-started/architecture

[^22]: https://firebase.google.com/docs/cloud-messaging/fcm-architecture

[^23]: https://www.youtube.com/watch?v=CiSv9E6ZKVc

[^24]: https://www.youtube.com/watch?v=mw0DLwItue4

[^25]: https://firebase.google.com/docs/database/rest/structure-data

[^26]: https://kealy.studio/blog/how-to-set-up-supabase-with-firebase-auth-in-flutterflow/

