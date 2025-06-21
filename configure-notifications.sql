-- Configuration script for FCM notification settings
-- Run this in Supabase SQL Editor after deploying the migration

-- Replace these values with your actual Supabase project details
SELECT configure_notification_settings(
  'https://jqpdftmgertvsgpwdvgw.supabase.co',  -- Your Supabase URL
  'your-service-role-key-here'                 -- Your Service Role Key
);

-- Verify the configuration
SELECT 
  current_setting('app.supabase_url') as supabase_url,
  current_setting('app.service_role_key') as service_role_key_set;

-- Test the trigger function (optional)
-- This will show you what the function would do without actually sending notifications
-- SELECT send_task_notification() FROM tasks LIMIT 1;
