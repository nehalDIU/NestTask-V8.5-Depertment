-- Test script for task notification trigger
-- Run this in Supabase SQL Editor to test the notification system

-- 1. Check if the trigger function exists
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc 
WHERE proname = 'send_task_notification';

-- 2. Check if the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'task_notification_trigger';

-- 3. Check current configuration
SELECT 
  current_setting('app.supabase_url', true) as supabase_url,
  current_setting('app.service_role_key', true) as service_role_key_configured;

-- 4. Get sample data for testing
SELECT 
  'Sample Sections:' as info,
  id,
  name,
  department_id
FROM sections 
LIMIT 3;

SELECT 
  'Sample Users by Section:' as info,
  s.name as section_name,
  COUNT(u.id) as user_count
FROM sections s
LEFT JOIN users u ON s.id = u.section_id AND u.is_active = true
GROUP BY s.id, s.name
ORDER BY user_count DESC
LIMIT 5;

-- 5. Check FCM tokens availability
SELECT 
  'FCM Token Stats:' as info,
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE is_active = true) as active_tokens,
  COUNT(DISTINCT user_id) as users_with_tokens
FROM fcm_tokens;

-- 6. Test notification targeting logic (without actually inserting)
-- This shows which users would receive notifications for different scenarios

-- Scenario 1: Section-specific task
WITH test_section AS (
  SELECT id, name FROM sections LIMIT 1
)
SELECT 
  'Section-specific task notification would target:' as scenario,
  ts.name as section_name,
  COUNT(u.id) as target_users,
  array_agg(u.name) as user_names
FROM test_section ts
JOIN users u ON u.section_id = ts.id AND u.is_active = true
GROUP BY ts.id, ts.name;

-- Scenario 2: Admin task (all users)
SELECT 
  'Admin task notification would target:' as scenario,
  COUNT(u.id) as target_users,
  COUNT(ft.id) as users_with_fcm_tokens
FROM users u
LEFT JOIN fcm_tokens ft ON u.id = ft.user_id AND ft.is_active = true
WHERE u.is_active = true;

-- 7. Sample task insertion for testing (UNCOMMENT TO TEST)
-- WARNING: This will actually send notifications if the trigger is active!

/*
-- Test 1: Insert a section-specific task
INSERT INTO tasks (
  name,
  description,
  due_date,
  priority,
  section_id,
  department_id,
  created_by,
  is_admin_task,
  status
) VALUES (
  'Test Section Task - ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
  'This is a test task for section-specific notifications',
  now() + interval '7 days',
  'medium',
  (SELECT id FROM sections LIMIT 1),
  (SELECT department_id FROM sections LIMIT 1),
  (SELECT id FROM users WHERE role IN ('admin', 'super-admin') LIMIT 1),
  false,
  'active'
);

-- Test 2: Insert an admin task (all users)
INSERT INTO tasks (
  name,
  description,
  due_date,
  priority,
  created_by,
  is_admin_task,
  status
) VALUES (
  'Test Admin Task - ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
  'This is a test admin task for all users',
  now() + interval '3 days',
  'high',
  (SELECT id FROM users WHERE role IN ('admin', 'super-admin') LIMIT 1),
  true,
  'active'
);
*/

-- 8. Check recent tasks and their notification status
SELECT 
  'Recent tasks (last 10):' as info,
  t.id,
  t.name,
  t.is_admin_task,
  s.name as section_name,
  d.name as department_name,
  t.created_at
FROM tasks t
LEFT JOIN sections s ON t.section_id = s.id
LEFT JOIN departments d ON t.department_id = d.id
ORDER BY t.created_at DESC
LIMIT 10;
