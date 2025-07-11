# Firebase Push Notification Implementation Guide

## Overview

This guide provides step-by-step instructions for setting up and testing the Firebase Cloud Messaging (FCM) integration with Supabase for the NestTask application.

## Prerequisites

1. Firebase project created (nesttask-73c13)
2. Supabase project configured
3. Firebase Admin SDK service account key
4. Web app registered in Firebase console

## Setup Instructions

### 1. Firebase Console Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `nesttask-73c13`
3. Navigate to **Project Settings** > **Cloud Messaging**
4. Generate a new **Web Push Certificate** (VAPID key)
5. Copy the **Server Key** and **VAPID Key**

### 2. Environment Variables

Update your `.env` file with the following Firebase configuration:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=nesttask-73c13.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nesttask-73c13
VITE_FIREBASE_STORAGE_BUCKET=nesttask-73c13.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_firebase_app_id_here
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
```

### 3. Supabase Edge Function Environment Variables

In your Supabase Dashboard, go to **Edge Functions** > **Environment Variables** and add:

```bash
FCM_SERVER_KEY=your_firebase_server_key
FIREBASE_PROJECT_ID=nesttask-73c13
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Database Migration

Run the database migrations to create FCM tables:

```bash
# Apply FCM tables migration
supabase db push

# Or manually run the SQL files:
# - supabase/migrations/20250714000001_add_fcm_tables.sql
# - supabase/migrations/20250714000002_add_fcm_functions.sql
```

### 5. Deploy Edge Functions

Deploy the FCM notification edge function:

```bash
supabase functions deploy send-task-notification
```

## Testing the Implementation

### 1. User Registration for Notifications

1. **Login as a regular user**
2. **Check browser console** for FCM initialization logs:
   ```
   FCM service initialized successfully
   FCM token registered successfully
   ```
3. **Verify in database** that FCM token is stored:
   ```sql
   SELECT * FROM fcm_tokens WHERE user_id = 'your-user-id';
   ```

### 2. Section Admin Task Creation

1. **Login as a section admin**
2. **Create a new task** with the following properties:
   - Task name: "Test FCM Notification"
   - Category: "assignment"
   - Due date: Tomorrow
   - Description: "Testing Firebase push notifications"
3. **Submit the task**
4. **Check the database trigger execution**:
   ```sql
   SELECT * FROM notification_history 
   WHERE related_id = 'your-task-id' 
   ORDER BY sent_at DESC;
   ```

### 3. Notification Delivery Verification

1. **Check browser console** for foreground message logs
2. **Verify notification appears** in browser (if user is active)
3. **Check notification history** in database:
   ```sql
   SELECT 
     nh.*,
     u.name as user_name,
     u.email as user_email
   FROM notification_history nh
   JOIN users u ON nh.user_id = u.id
   WHERE nh.notification_type = 'task'
   ORDER BY nh.sent_at DESC
   LIMIT 10;
   ```

### 4. Section-Based Targeting

1. **Verify only section users receive notifications**:
   ```sql
   SELECT 
     u.name,
     u.email,
     u.section_id,
     nh.status
   FROM notification_history nh
   JOIN users u ON nh.user_id = u.id
   WHERE nh.related_id = 'your-task-id';
   ```

2. **Confirm section admin doesn't receive their own notification**

## Troubleshooting

### Common Issues

1. **FCM Token Not Generated**
   - Check if VAPID key is correctly configured
   - Verify notification permission is granted
   - Check browser console for errors

2. **Notifications Not Sent**
   - Verify FCM server key in Supabase environment variables
   - Check edge function logs in Supabase dashboard
   - Ensure database trigger is properly configured

3. **Wrong Users Receiving Notifications**
   - Verify section_id is correctly set on tasks
   - Check the `get_section_fcm_tokens` function
   - Ensure RLS policies are working correctly

### Debug Commands

```sql
-- Check FCM tokens for a section
SELECT * FROM get_section_fcm_tokens('section-uuid-here');

-- Check notification preferences
SELECT * FROM notification_preferences WHERE user_id = 'user-uuid-here';

-- Check recent notification history
SELECT * FROM notification_history ORDER BY sent_at DESC LIMIT 20;

-- Check task creation with section_id
SELECT id, name, section_id, is_admin_task, created_at 
FROM tasks 
WHERE is_admin_task = true 
ORDER BY created_at DESC 
LIMIT 10;
```

## Security Considerations

1. **FCM Server Key**: Keep secure in Supabase environment variables
2. **VAPID Key**: Can be public but should be project-specific
3. **RLS Policies**: Ensure users can only access their own tokens
4. **Token Cleanup**: Inactive tokens are automatically cleaned up after 30 days

## Performance Optimization

1. **Token Management**: Old tokens are automatically deactivated
2. **Batch Notifications**: Edge function handles multiple tokens efficiently
3. **Error Handling**: Failed notifications are logged for debugging
4. **Caching**: FCM tokens are cached for better performance

## Monitoring and Analytics

Monitor the following metrics:

1. **Token Registration Rate**: `SELECT COUNT(*) FROM fcm_tokens WHERE is_active = true;`
2. **Notification Success Rate**: 
   ```sql
   SELECT 
     status,
     COUNT(*) as count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
   FROM notification_history 
   WHERE sent_at > NOW() - INTERVAL '7 days'
   GROUP BY status;
   ```
3. **User Engagement**: Track notification clicks and interactions

## Next Steps

1. **Mobile App Integration**: Extend FCM to React Native or Flutter apps
2. **Advanced Targeting**: Add more granular notification preferences
3. **Rich Notifications**: Implement images and action buttons
4. **Analytics Integration**: Connect with Firebase Analytics for insights
