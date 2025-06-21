# Task Notification Setup Guide

This guide explains how to set up automatic FCM push notifications when new tasks are created, with section-based targeting.

## 🎯 How It Works

When a new task is inserted into the `tasks` table, the system automatically:

1. **Determines the target audience**:
   - If `section_id` is specified → Send to users in that section only
   - If `is_admin_task = true` → Send to all users
   - If `department_id` is specified → Send to users in that department
   - Otherwise → Send to all users

2. **Sends FCM notifications** via Supabase Edge Function
3. **Handles errors gracefully** without affecting task creation

## 📋 Setup Steps

### Step 1: Deploy the Edge Function

```bash
# Make sure you're in the project directory
cd /path/to/your/project

# Deploy the push notification function
supabase functions deploy push
```

### Step 2: Set Environment Variables

In your Supabase Dashboard:
1. Go to **Project Settings** → **Edge Functions**
2. Add these environment variables:
   - `FIREBASE_SERVER_KEY`: Your Firebase Server Key (from Firebase Console)
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key

### Step 3: Run Database Migrations

```bash
# Apply the FCM tokens table migration
supabase db push

# Or manually run the SQL files in Supabase SQL Editor:
# 1. supabase/migrations/20250619000001_create_fcm_tokens_table.sql
# 2. supabase/migrations/20250619000002_create_task_notification_trigger.sql
```

### Step 4: Configure Notification Settings

Run this in **Supabase SQL Editor**:

```sql
-- Replace with your actual values
SELECT configure_notification_settings(
  'https://your-project.supabase.co',  -- Your Supabase URL
  'your-service-role-key-here'         -- Your Service Role Key
);
```

### Step 5: Test the Setup

1. **Run the test script** in Supabase SQL Editor:
   ```sql
   -- Copy and paste contents of test-task-notifications.sql
   ```

2. **Create a test task** (uncomment the test sections in the script)

3. **Check the Edge Function logs** in Supabase Dashboard

## 🔧 Notification Logic

### Section-Specific Tasks
```sql
-- When a section admin creates a task for their section
INSERT INTO tasks (
  name, description, due_date, section_id, created_by
) VALUES (
  'Section A Task', 'Task for Section A only', '2024-01-15', 'section-a-id', 'admin-id'
);
-- → Sends notifications only to users in Section A
```

### Admin Tasks
```sql
-- When an admin creates a task for everyone
INSERT INTO tasks (
  name, description, due_date, is_admin_task, created_by
) VALUES (
  'Company-wide Task', 'Task for all employees', '2024-01-15', true, 'admin-id'
);
-- → Sends notifications to all users
```

### Department Tasks
```sql
-- When a task is created for a specific department
INSERT INTO tasks (
  name, description, due_date, department_id, created_by
) VALUES (
  'Department Task', 'Task for IT Department', '2024-01-15', 'it-dept-id', 'admin-id'
);
-- → Sends notifications to all users in IT Department
```

## 📱 Notification Content

The notifications include:

- **Title**: Based on task type and scope
  - `"New Admin Task"` for admin tasks
  - `"New Task for [Section Name]"` for section tasks
  - `"New Task Assigned"` for general tasks

- **Body**: Task name, due date, and creator
  - `"Task Name - Due: Jan 15, 2024 (by John Doe)"`

- **Actions**: View Task, Dismiss

- **Data**: Complete task information for app navigation

## 🐛 Troubleshooting

### Check if Trigger is Working
```sql
-- Check trigger exists
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'task_notification_trigger';

-- Check function exists
SELECT proname FROM pg_proc 
WHERE proname = 'send_task_notification';
```

### Check Configuration
```sql
-- Verify settings
SELECT 
  current_setting('app.supabase_url', true) as url,
  current_setting('app.service_role_key', true) as key_set;
```

### Check Edge Function Logs
1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click on **push** function
3. Check **Logs** tab for any errors

### Check FCM Tokens
```sql
-- Check if users have FCM tokens
SELECT 
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE is_active = true) as active_tokens,
  COUNT(DISTINCT user_id) as users_with_tokens
FROM fcm_tokens;
```

## 🔒 Security

- The trigger function runs with `SECURITY DEFINER` to access the Edge Function
- Only authenticated users can execute the notification functions
- Invalid FCM tokens are automatically marked as inactive
- The trigger includes error handling to prevent task creation failures

## 📊 Monitoring

### Check Notification Success Rate
```sql
-- This would require adding a notifications log table
-- You can monitor via Edge Function logs for now
```

### Performance Considerations
- The trigger is asynchronous and won't slow down task creation
- Failed notifications are logged but don't affect the task insertion
- Invalid tokens are cleaned up automatically

## 🚀 Testing

Use the provided test script to:
1. Verify the trigger is installed correctly
2. Check targeting logic
3. Test actual notification sending (carefully!)
4. Monitor Edge Function performance

## 📝 Notes

- Notifications are only sent for `active` tasks (not drafts)
- The system handles missing user data gracefully
- Edge Function includes comprehensive logging for debugging
- Fallback mechanisms ensure reliability
