# Firebase Cloud Messaging (FCM) Implementation Guide

This guide explains the complete FCM push notification implementation for the NestTask application.

## Overview

The implementation includes:
- Firebase Cloud Messaging (FCM) integration
- Supabase database storage for FCM tokens
- Token management with automatic refresh and cleanup
- User notification preferences
- Backward compatibility with existing web-push system
- Admin notification sending capabilities

## Files Created/Modified

### New Files
- `src/firebase.ts` - Firebase configuration and FCM initialization
- `src/services/fcm.service.ts` - FCM token management service
- `src/services/notification.service.ts` - Notification sending service
- `src/hooks/useNotificationPreferences.ts` - User notification preferences hook
- `src/components/NotificationSettings.tsx` - Notification settings UI component
- `src/components/NotificationPrompt.tsx` - Notification permission prompt
- `src/components/FCMIntegrationExample.tsx` - Integration examples
- `public/firebase-messaging-sw.js` - Firebase service worker for background messages
- `supabase/migrations/20250619000001_add_fcm_tokens.sql` - Database migration for FCM tokens

### Modified Files
- `src/services/auth.service.ts` - Added FCM token registration on login/signup
- `src/hooks/useAuth.ts` - Added FCM token refresh on auth state changes
- `src/service-worker.ts` - Enhanced with FCM support
- `src/utils/pushNotifications.ts` - Updated to use FCM with fallback
- `src/hooks/usePushNotifications.ts` - Updated to use new FCM system
- `src/services/task.service.ts` - Updated to use new notification system
- `supabase/functions/push-notification/index.ts` - Enhanced to support FCM
- `src/types/supabase.ts` - Added FCM tokens table types

## Setup Instructions

### 1. Install Dependencies
```bash
npm install firebase
```

### 2. Firebase Project Setup
1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Cloud Messaging in the Firebase console
3. Generate a Web Push certificate (VAPID key)
4. Get your Firebase configuration values

### 3. Environment Variables
Add these to your `.env` file:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_VAPID_KEY=your-vapid-key
```

For Supabase Edge Functions, also add:
```env
FIREBASE_SERVER_KEY=your-server-key
FIREBASE_PROJECT_ID=your-project-id
```

### 4. Update Firebase Service Worker
Edit `public/firebase-messaging-sw.js` and replace the placeholder configuration with your actual Firebase config.

### 5. Database Migration
Run the FCM tokens migration:
```bash
supabase migration up
```

### 6. Deploy Supabase Edge Function
```bash
supabase functions deploy push-notification
```

## Usage

### Basic Integration
```tsx
import { FCMIntegrationExample } from './components/FCMIntegrationExample';

function App() {
  return (
    <div>
      <FCMIntegrationExample />
      {/* Your app content */}
    </div>
  );
}
```

### Notification Settings
```tsx
import { NotificationSettings } from './components/NotificationSettings';

function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <NotificationSettings />
    </div>
  );
}
```

### Sending Notifications
```tsx
import { sendNotificationToSection, sendTaskNotification } from './services/notification.service';

// Send to a specific section
await sendNotificationToSection('section-id', {
  title: 'New Assignment',
  body: 'You have a new assignment due tomorrow',
  data: { type: 'assignment', url: '/assignments' }
});

// Send task notification
await sendTaskNotification(task);
```

## API Reference

### FCM Service (`src/services/fcm.service.ts`)
- `registerFCMToken(userId)` - Register FCM token for user
- `refreshFCMToken(userId)` - Refresh FCM token
- `deactivateFCMToken(userId)` - Deactivate FCM tokens
- `requestNotificationPermission()` - Request notification permission

### Notification Service (`src/services/notification.service.ts`)
- `sendFCMNotification(token, payload)` - Send to specific token
- `sendBulkNotifications(request)` - Send to multiple users
- `sendNotificationToSection(sectionId, payload)` - Send to section
- `sendNotificationToBatch(batchId, payload)` - Send to batch
- `sendNotificationToDepartment(departmentId, payload)` - Send to department
- `sendTaskNotification(task)` - Send task notification

### Notification Preferences Hook
```tsx
const {
  preferences,
  permissionStatus,
  requestPermission,
  updatePreference,
  isFullyEnabled
} = useNotificationPreferences(userId);
```

## Database Schema

### FCM Tokens Table
```sql
CREATE TABLE fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token text NOT NULL,
  device_type text NOT NULL DEFAULT 'web',
  platform text,
  device_id text,
  is_active boolean DEFAULT true,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, fcm_token)
);
```

## Security Considerations

1. **Token Management**: FCM tokens are automatically cleaned up after 30 days of inactivity
2. **User Permissions**: Users can control notification preferences
3. **RLS Policies**: Database access is restricted by Row Level Security
4. **VAPID Keys**: Keep VAPID keys secure and rotate them periodically

## Troubleshooting

### Common Issues
1. **Notifications not working**: Check browser permissions and Firebase configuration
2. **Token registration fails**: Verify VAPID key and Firebase setup
3. **Background messages not received**: Check service worker registration
4. **Database errors**: Verify migration was applied correctly

### Debug Mode
Enable debug logging by setting:
```javascript
localStorage.setItem('debug', 'fcm:*');
```

## Migration from Web-Push

The implementation maintains backward compatibility with the existing web-push system:
- Existing subscriptions continue to work
- New users automatically use FCM
- Gradual migration as users re-authenticate

## Performance Considerations

1. **Token Cleanup**: Automatic cleanup prevents database bloat
2. **Batch Operations**: Bulk notification sending for efficiency
3. **Caching**: Service worker caching for offline support
4. **Rate Limiting**: Consider implementing rate limits for notification sending

## Future Enhancements

1. **Rich Notifications**: Add image and action button support
2. **Scheduling**: Implement scheduled notifications
3. **Analytics**: Track notification delivery and engagement
4. **A/B Testing**: Test different notification strategies
5. **Personalization**: AI-powered notification timing and content
