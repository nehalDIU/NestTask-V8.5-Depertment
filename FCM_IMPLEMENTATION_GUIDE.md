# Firebase Cloud Messaging (FCM) Implementation Guide

This guide explains the Firebase Cloud Messaging implementation in the NestTask application.

## Overview

The FCM implementation provides push notification functionality with the following features:

- **Token Management**: Automatic registration, refresh, and cleanup of FCM tokens
- **Database Integration**: Supabase storage for FCM tokens with proper RLS policies
- **Authentication Integration**: Automatic token registration on login/signup
- **Notification Services**: Send notifications for admin tasks and announcements
- **Permission Management**: User-friendly permission request handling
- **Fallback Support**: Web Push API as fallback for unsupported browsers

## Files Created/Modified

### New Files

1. **src/firebase.ts** - Firebase configuration and FCM initialization
2. **src/services/fcm.service.ts** - FCM token management service
3. **src/services/fcm-notifications.service.ts** - FCM notification sending service
4. **src/hooks/useFCMPermissions.ts** - Hook for managing FCM permissions
5. **src/components/NotificationPermissionManager.tsx** - UI component for permission management
6. **public/firebase-messaging-sw.js** - FCM service worker for background notifications
7. **supabase/migrations/20250619000001_create_fcm_tokens_table.sql** - Database schema for FCM tokens
8. **supabase/functions/send-fcm-notification/index.ts** - Edge function for sending FCM notifications

### Modified Files

1. **src/services/auth.service.ts** - Added FCM token registration on login/signup
2. **src/hooks/useNotifications.ts** - Integrated FCM foreground message listener
3. **src/services/task.service.ts** - Added FCM notifications for admin tasks
4. **src/App.tsx** - Added FCM initialization
5. **package.json** - Added Firebase SDK dependency

## Setup Instructions

### 1. Firebase Project Setup

1. Create a new Firebase project at https://console.firebase.google.com/
2. Enable Cloud Messaging in the Firebase console
3. Generate a Web App configuration
4. Generate VAPID keys for web push
5. Download the service account key for admin operations

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your Firebase configuration:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key

# For Supabase Edge Functions
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_service_account_email
```

### 3. Database Migration

Run the FCM tokens table migration:

```bash
# If using Supabase CLI
supabase db push

# Or manually execute the SQL in supabase/migrations/20250619000001_create_fcm_tokens_table.sql
```

### 4. Deploy Supabase Edge Function

Deploy the FCM notification sending function:

```bash
supabase functions deploy send-fcm-notification
```

## Usage

### Automatic Token Registration

FCM tokens are automatically registered when users:
- Log in successfully
- Sign up for a new account
- Grant notification permissions

### Manual Permission Management

Use the `NotificationPermissionManager` component:

```tsx
import { NotificationPermissionManager } from './components/NotificationPermissionManager';

<NotificationPermissionManager 
  userId={user.id}
  onPermissionChange={(permission) => {
    console.log('Permission changed:', permission);
  }}
/>
```

### Sending Notifications

```typescript
import { sendAdminTaskNotification, sendAnnouncementNotification } from './services/fcm-notifications.service';

// Send notification for admin task
await sendAdminTaskNotification(task);

// Send notification for announcement
await sendAnnouncementNotification(announcement);
```

### Using FCM Permissions Hook

```tsx
import { useFCMPermissions } from './hooks/useFCMPermissions';

const { 
  permission, 
  isNotificationsEnabled, 
  requestPermission, 
  disableNotifications 
} = useFCMPermissions(user?.id);
```

## Database Schema

### fcm_tokens Table

```sql
CREATE TABLE fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token text NOT NULL,
  device_type text NOT NULL DEFAULT 'web',
  device_info jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Security Features

- **Row Level Security (RLS)**: Users can only access their own tokens
- **Admin Policies**: Admins can manage all tokens
- **Token Cleanup**: Automatic cleanup of expired/invalid tokens
- **Unique Constraints**: Prevent duplicate tokens per user

## Error Handling

The implementation includes comprehensive error handling:

- **Invalid Tokens**: Automatically deactivated in database
- **Permission Denied**: Graceful fallback to Web Push API
- **Network Errors**: Retry logic and fallback mechanisms
- **Service Worker Errors**: Proper error logging and recovery

## Testing

### Test Notification

```typescript
import { sendTestNotification } from './services/fcm-notifications.service';

// Send test notification to specific user
const success = await sendTestNotification(userId);
```

### Permission Testing

1. Open browser developer tools
2. Go to Application > Storage > Clear storage
3. Refresh the page
4. Test permission request flow

## Troubleshooting

### Common Issues

1. **Service Worker Not Loading**
   - Ensure `firebase-messaging-sw.js` is in the `public` directory
   - Check browser console for service worker errors

2. **Notifications Not Received**
   - Verify Firebase configuration
   - Check notification permissions in browser
   - Ensure FCM tokens are properly stored in database

3. **VAPID Key Errors**
   - Verify VAPID key is correctly set in environment variables
   - Ensure VAPID key matches Firebase project settings

### Debug Mode

Enable debug logging by setting:

```javascript
// In browser console
localStorage.setItem('debug', 'fcm:*');
```

## Browser Support

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Limited support (iOS 16.4+)
- **Edge**: Full support

## Performance Considerations

- **Token Caching**: Tokens are cached locally to reduce API calls
- **Batch Operations**: Multiple notifications sent in batches
- **Background Sync**: Service worker handles offline scenarios
- **Memory Management**: Proper cleanup of event listeners

## Security Best Practices

1. **Environment Variables**: Never commit Firebase keys to version control
2. **Token Rotation**: Implement regular token refresh
3. **Permission Validation**: Always validate user permissions
4. **Rate Limiting**: Implement rate limiting for notification sending
5. **Data Encryption**: Consider encrypting sensitive notification data

## Future Enhancements

- **Rich Notifications**: Add image and action button support
- **Notification Categories**: Implement notification categories
- **Analytics**: Add notification delivery analytics
- **A/B Testing**: Implement notification content testing
- **Scheduling**: Add scheduled notification support
