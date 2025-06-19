-- Run this in Supabase SQL Editor to check stored FCM tokens

-- Check all FCM tokens
SELECT 
  id,
  user_id,
  LEFT(fcm_token, 50) || '...' as token_preview,
  device_type,
  is_active,
  created_at,
  updated_at
FROM fcm_tokens 
ORDER BY created_at DESC;

-- Check tokens for specific user (replace with actual user ID)
-- SELECT * FROM fcm_tokens WHERE user_id = 'your-user-id-here';

-- Check if tokens are properly linked to users
SELECT 
  ft.id,
  ft.user_id,
  u.email,
  u.name,
  LEFT(ft.fcm_token, 30) || '...' as token_preview,
  ft.device_type,
  ft.is_active,
  ft.created_at
FROM fcm_tokens ft
JOIN auth.users au ON ft.user_id = au.id
LEFT JOIN users u ON ft.user_id = u.id
ORDER BY ft.created_at DESC;
