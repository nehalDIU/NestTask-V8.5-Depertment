-- Run this in Supabase SQL Editor to check if the FCM tokens table exists and is properly configured

-- Check if the table exists
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'fcm_tokens';

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'fcm_tokens' 
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'fcm_tokens';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'fcm_tokens';

-- Test insert (this will help identify permission issues)
-- Replace 'your-user-id-here' with an actual user ID from auth.users
-- SELECT auth.uid(); -- Run this first to get your current user ID

-- Example test insert (uncomment and modify):
-- INSERT INTO fcm_tokens (user_id, fcm_token, device_type) 
-- VALUES (auth.uid(), 'test-token-123', 'web');

-- Check if any tokens exist
SELECT COUNT(*) as token_count FROM fcm_tokens;
