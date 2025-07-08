-- Cleanup script for removing test/seed data
-- Run this in the Supabase SQL Editor to remove test users and tasks
-- WARNING: This will permanently delete test data!

DO $$
DECLARE
    deleted_users INTEGER := 0;
    deleted_tasks INTEGER := 0;
    deleted_auth_users INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting cleanup of test data...';
    
    -- Delete tasks created by test users first (to avoid foreign key constraints)
    DELETE FROM public.tasks 
    WHERE user_id IN (
        SELECT id FROM public.users 
        WHERE email LIKE 'student%@diu.edu.bd' 
           OR email LIKE 'testuser%@diu.edu.bd'
           OR email LIKE 'sectionadmin%@diu.edu.bd'
           OR email LIKE 'admin%@diu.edu.bd'
    );
    
    GET DIAGNOSTICS deleted_tasks = ROW_COUNT;
    RAISE NOTICE 'Deleted % test tasks', deleted_tasks;
    
    -- Delete test users from public.users table
    DELETE FROM public.users 
    WHERE email LIKE 'student%@diu.edu.bd' 
       OR email LIKE 'testuser%@diu.edu.bd'
       OR email LIKE 'sectionadmin%@diu.edu.bd'
       OR email LIKE 'admin%@diu.edu.bd';
    
    GET DIAGNOSTICS deleted_users = ROW_COUNT;
    RAISE NOTICE 'Deleted % test users from public.users', deleted_users;
    
    -- Delete test users from auth.users table (this will cascade to public.users due to foreign key)
    DELETE FROM auth.users 
    WHERE email LIKE 'student%@diu.edu.bd' 
       OR email LIKE 'testuser%@diu.edu.bd'
       OR email LIKE 'sectionadmin%@diu.edu.bd'
       OR email LIKE 'admin%@diu.edu.bd';
    
    GET DIAGNOSTICS deleted_auth_users = ROW_COUNT;
    RAISE NOTICE 'Deleted % test users from auth.users', deleted_auth_users;
    
    RAISE NOTICE 'Cleanup completed successfully!';
    RAISE NOTICE 'Summary: % tasks deleted, % public users deleted, % auth users deleted', 
                 deleted_tasks, deleted_users, deleted_auth_users;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error during cleanup: %', SQLERRM;
END $$;

-- Optional: Reset sequences if needed
-- This is useful if you want to reset auto-incrementing values
/*
SELECT setval(pg_get_serial_sequence('public.tasks', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.users', 'id'), 1, false);
*/

-- Show remaining data counts
SELECT 
    'Users' as table_name,
    count(*) as remaining_count
FROM public.users
WHERE email NOT LIKE '%@nesttask.com' -- Exclude system admin accounts

UNION ALL

SELECT 
    'Tasks' as table_name,
    count(*) as remaining_count
FROM public.tasks

UNION ALL

SELECT 
    'Auth Users' as table_name,
    count(*) as remaining_count
FROM auth.users
WHERE email NOT LIKE '%@nesttask.com'; -- Exclude system admin accounts
