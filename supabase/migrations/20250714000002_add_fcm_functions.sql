-- FCM Database Functions
-- This migration creates functions for FCM token management, section user queries, and task notification triggers

-- 1. Function to upsert FCM token
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

-- 2. Function to get active FCM tokens for section users
CREATE OR REPLACE FUNCTION get_section_fcm_tokens(p_section_id UUID)
RETURNS TABLE (
  user_id UUID,
  token TEXT,
  device_type TEXT,
  user_name TEXT,
  user_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.user_id,
    ft.token,
    ft.device_type,
    u.name as user_name,
    u.email as user_email
  FROM fcm_tokens ft
  JOIN users u ON ft.user_id = u.id
  LEFT JOIN notification_preferences np ON u.id = np.user_id
  WHERE u.section_id = p_section_id 
    AND ft.is_active = true
    AND (np.task_notifications IS NULL OR np.task_notifications = true)
    AND u.role != 'section_admin'; -- Don't send notifications to the admin who created the task
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to get FCM tokens for all users in a section (including admins)
CREATE OR REPLACE FUNCTION get_all_section_fcm_tokens(p_section_id UUID)
RETURNS TABLE (
  user_id UUID,
  token TEXT,
  device_type TEXT,
  user_name TEXT,
  user_email TEXT,
  user_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.user_id,
    ft.token,
    ft.device_type,
    u.name as user_name,
    u.email as user_email,
    u.role as user_role
  FROM fcm_tokens ft
  JOIN users u ON ft.user_id = u.id
  LEFT JOIN notification_preferences np ON u.id = np.user_id
  WHERE u.section_id = p_section_id 
    AND ft.is_active = true
    AND (np.task_notifications IS NULL OR np.task_notifications = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to clean up inactive FCM tokens
CREATE OR REPLACE FUNCTION cleanup_inactive_fcm_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete tokens that haven't been used in 30 days
  DELETE FROM fcm_tokens 
  WHERE last_used < now() - INTERVAL '30 days'
    OR (is_active = false AND updated_at < now() - INTERVAL '7 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to check if user is section admin for a specific section
CREATE OR REPLACE FUNCTION is_section_admin_for_section(p_user_id UUID, p_section_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_user_id 
      AND section_id = p_section_id 
      AND role = 'section_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to handle task creation notifications
CREATE OR REPLACE FUNCTION handle_task_notification()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Only send notifications for admin tasks with section_id
  IF NEW.is_admin_task = true AND NEW.section_id IS NOT NULL THEN
    
    -- Get Supabase URL and service role key from environment
    supabase_url := current_setting('app.supabase_url', true);
    service_role_key := current_setting('app.service_role_key', true);
    
    -- If environment variables are not set, use default URL
    IF supabase_url IS NULL OR supabase_url = '' THEN
      supabase_url := 'https://unrjnmpxikgsocixureq.supabase.co';
    END IF;
    
    -- Call edge function to send push notifications
    PERFORM
      net.http_post(
        url := supabase_url || '/functions/v1/send-task-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
        ),
        body := jsonb_build_object(
          'task_id', NEW.id,
          'task_name', NEW.name,
          'section_id', NEW.section_id,
          'due_date', NEW.due_date,
          'category', NEW.category,
          'description', NEW.description,
          'created_by', NEW.user_id
        )
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger for task notifications (drop existing if exists)
DROP TRIGGER IF EXISTS task_notification_trigger ON tasks;
CREATE TRIGGER task_notification_trigger
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION handle_task_notification();

-- 8. Function to get user notification preferences
CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id UUID)
RETURNS TABLE (
  task_notifications BOOLEAN,
  announcement_notifications BOOLEAN,
  reminder_notifications BOOLEAN,
  email_notifications BOOLEAN,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    np.task_notifications,
    np.announcement_notifications,
    np.reminder_notifications,
    np.email_notifications,
    np.quiet_hours_start,
    np.quiet_hours_end,
    np.timezone
  FROM notification_preferences np
  WHERE np.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to update FCM token last used timestamp
CREATE OR REPLACE FUNCTION update_fcm_token_last_used(p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE fcm_tokens 
  SET last_used = now()
  WHERE token = p_token AND is_active = true;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION upsert_fcm_token(UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_section_fcm_tokens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_section_fcm_tokens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_inactive_fcm_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION is_section_admin_for_section(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notification_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_fcm_token_last_used(TEXT) TO authenticated;
