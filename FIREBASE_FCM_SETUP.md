# Firebase Cloud Messaging (FCM) Setup with Supabase

This guide explains how to set up Firebase Cloud Messaging (FCM) with Supabase for push notifications in the NestTask application.

## Prerequisites

1. Firebase project with FCM enabled
2. Supabase project with database and authentication configured
3. Web application with service worker support

## Setup Steps

### 1. Firebase Project Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Add a web app to your project
4. Copy the Firebase configuration (apiKey, authDomain, etc.)
5. Generate a VAPID key in Project Settings > Cloud Messaging

### 2. Supabase Database Setup

1. Run the FCM tokens table setup SQL script in your Supabase project:

```sql
-- Create fcm_tokens table to store Firebase Cloud Messaging tokens
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  device_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Add a unique constraint to prevent duplicate tokens per user
  CONSTRAINT unique_user_token UNIQUE (user_id, fcm_token)
);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tokens
CREATE POLICY "Users can view their own tokens" 
  ON public.fcm_tokens
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own tokens
CREATE POLICY "Users can insert their own tokens" 
  ON public.fcm_tokens
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tokens
CREATE POLICY "Users can update their own tokens" 
  ON public.fcm_tokens
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own tokens
CREATE POLICY "Users can delete their own tokens" 
  ON public.fcm_tokens
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON public.fcm_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON public.fcm_tokens (fcm_token);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fcm_tokens TO authenticated;
```

### 3. Deploy Supabase Edge Function

1. Create a `send-notification` Edge Function in your Supabase project
2. Deploy the function code from `supabase/functions/send-notification/index.ts`
3. Set the required environment variables:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - `FCM_RELAY_URL`: URL to your FCM relay service (if needed)
   - `FCM_RELAY_API_KEY`: API key for your FCM relay service (if needed)

### 4. Web Application Integration

1. Update `firebase.ts` with your Firebase configuration
2. Update `firebase-messaging-sw.js` with your Firebase configuration
3. Register the service worker in your application
4. Request notification permission and register FCM tokens with Supabase
5. Handle incoming notifications in the foreground and background

## Usage

### Request Permission & Register Token

The application will automatically request notification permission and register the FCM token when a user logs in:

```typescript
// In your component
import { useFirebaseMessaging } from './hooks/useFirebaseMessaging';

function MyComponent() {
  const { permissionStatus, tokenStatus, requestPermission } = useFirebaseMessaging();
  
  // Request permission explicitly if needed
  const handleEnableNotifications = () => {
    requestPermission();
  };
  
  return (
    <div>
      {permissionStatus !== 'granted' && (
        <button onClick={handleEnableNotifications}>
          Enable Notifications
        </button>
      )}
    </div>
  );
}
```

### Send Notifications

You can send notifications using the notification service:

```typescript
import { sendNotificationToUser, sendNotificationToAll } from './services/notificationService';

// Send to a specific user
const sendToUser = async () => {
  try {
    const result = await sendNotificationToUser(
      'user-id-here',
      'Notification Title',
      'This is the notification body',
      { url: '/tasks/123' }
    );
    console.log('Notification sent:', result);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// Send to all users (admin only)
const sendToAll = async () => {
  try {
    const result = await sendNotificationToAll(
      'Announcement',
      'Important message for all users',
      { url: '/announcements/latest' }
    );
    console.log('Notification sent to all:', result);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};
```

## Troubleshooting

### Service Worker Not Registering

- Check if your service worker file is accessible at the correct path
- Ensure the service worker registration code is executed
- Verify that the browser supports service workers

### Notification Permission Denied

- User needs to manually change permission settings in browser
- Consider explaining the benefits of notifications before requesting permission

### FCM Token Not Storing in Supabase

- Check for errors in the console
- Verify that the user is authenticated
- Ensure the FCM tokens table exists with the correct schema
- Check Row Level Security policies for the FCM tokens table

### Notifications Not Showing

- Check the service worker is properly registered and running
- Verify the notification payload format is correct
- Ensure the device is connected to FCM (check console logs)
- Look for errors in the service worker console

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Web Push Notifications Guide](https://web.dev/articles/push-notifications-overview) 