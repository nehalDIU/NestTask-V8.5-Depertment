/*
  # Task Notification Trigger for FCM Push Notifications

  This migration creates a database trigger that automatically sends FCM push notifications
  when new tasks are inserted into the tasks table.

  Features:
  - Sends notifications to users based on task scope (section-specific or all users)
  - Handles different task types (admin tasks, section tasks, etc.)
  - Uses Supabase Edge Function for reliable notification delivery
  - Includes proper error handling and logging

  Trigger Logic:
  - If task has section_id: Send to users in that section only
  - If task is admin task (is_admin_task = true): Send to all users
  - If task has no section_id: Send to all users
*/

-- Create function to send FCM notifications for new tasks
CREATE OR REPLACE FUNCTION send_task_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_body TEXT;
  notification_data JSONB;
  target_user_ids UUID[];
  section_name TEXT;
  creator_name TEXT;
  task_type TEXT;
BEGIN
  -- Skip if this is not an INSERT operation
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Skip if task is not active or is a draft
  IF NEW.status = 'draft' OR NEW.is_active = false THEN
    RETURN NEW;
  END IF;

  -- Get creator name for notification
  SELECT name INTO creator_name
  FROM users 
  WHERE id = NEW.created_by;

  -- Determine task type and notification content
  IF NEW.is_admin_task = true THEN
    task_type := 'admin-task';
    notification_title := 'New Admin Task';
    notification_body := format('%s - Due: %s', NEW.name, to_char(NEW.due_date, 'Mon DD, YYYY'));
  ELSE
    task_type := 'task';
    notification_title := 'New Task Assigned';
    notification_body := format('%s - Due: %s', NEW.name, to_char(NEW.due_date, 'Mon DD, YYYY'));
  END IF;

  -- Add creator info if available
  IF creator_name IS NOT NULL THEN
    notification_body := notification_body || format(' (by %s)', creator_name);
  END IF;

  -- Determine target users based on task scope
  IF NEW.section_id IS NOT NULL THEN
    -- Task is section-specific, send to users in that section
    SELECT name INTO section_name FROM sections WHERE id = NEW.section_id;
    
    SELECT array_agg(id) INTO target_user_ids
    FROM users 
    WHERE section_id = NEW.section_id 
    AND is_active = true;
    
    -- Update notification for section-specific task
    IF section_name IS NOT NULL THEN
      notification_title := format('New Task for %s', section_name);
    END IF;
    
  ELSIF NEW.department_id IS NOT NULL THEN
    -- Task is department-specific, send to users in that department
    SELECT array_agg(id) INTO target_user_ids
    FROM users 
    WHERE department_id = NEW.department_id 
    AND is_active = true;
    
  ELSE
    -- Task is for all users (admin task or general task)
    SELECT array_agg(id) INTO target_user_ids
    FROM users 
    WHERE is_active = true;
  END IF;

  -- Skip if no target users found
  IF target_user_ids IS NULL OR array_length(target_user_ids, 1) = 0 THEN
    RAISE LOG 'No target users found for task notification: %', NEW.id;
    RETURN NEW;
  END IF;

  -- Prepare notification data
  notification_data := jsonb_build_object(
    'taskId', NEW.id,
    'taskName', NEW.name,
    'taskType', task_type,
    'sectionId', NEW.section_id,
    'departmentId', NEW.department_id,
    'dueDate', NEW.due_date,
    'priority', NEW.priority,
    'isAdminTask', NEW.is_admin_task,
    'createdBy', NEW.created_by,
    'creatorName', creator_name,
    'url', '/',
    'timestamp', extract(epoch from now())::bigint
  );

  -- Log the notification attempt
  RAISE LOG 'Sending task notification for task % to % users', NEW.id, array_length(target_user_ids, 1);

  -- Call the Edge Function to send FCM notifications
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'userIds', target_user_ids,
        'notification', jsonb_build_object(
          'title', notification_title,
          'body', notification_body,
          'icon', '/icons/icon-192x192.png',
          'badge', '/icons/icon-192x192.png',
          'tag', 'task-' || NEW.id,
          'requireInteraction', CASE WHEN NEW.is_admin_task THEN true ELSE false END,
          'actions', jsonb_build_array(
            jsonb_build_object(
              'action', 'view',
              'title', 'View Task',
              'icon', '/icons/icon-192x192.png'
            ),
            jsonb_build_object(
              'action', 'dismiss',
              'title', 'Dismiss',
              'icon', '/icons/icon-192x192.png'
            )
          )
        ),
        'data', notification_data
      )
    );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the task insertion
    RAISE LOG 'Error sending task notification for task %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS task_notification_trigger ON tasks;

-- Create trigger that fires after task insertion
CREATE TRIGGER task_notification_trigger
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION send_task_notification();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION send_task_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION send_task_notification() TO service_role;

-- Create settings for the Edge Function URL (these need to be set)
-- You'll need to run these commands with your actual values:
-- SELECT set_config('app.supabase_url', 'https://your-project.supabase.co', false);
-- SELECT set_config('app.service_role_key', 'your-service-role-key', false);

-- Create a function to set the configuration (run this after deployment)
CREATE OR REPLACE FUNCTION configure_notification_settings(
  supabase_url TEXT,
  service_role_key TEXT
)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.supabase_url', supabase_url, false);
  PERFORM set_config('app.service_role_key', service_role_key, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to configure settings
GRANT EXECUTE ON FUNCTION configure_notification_settings(TEXT, TEXT) TO service_role;
