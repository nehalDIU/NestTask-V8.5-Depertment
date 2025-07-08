-- Sample Data Verification Script for NestTask
-- Run this script in the Supabase SQL Editor to check current data status
-- This helps you understand what data exists before adding more

-- ============================================================================
-- CURRENT DATA OVERVIEW
-- ============================================================================

-- Check departments, batches, and sections
SELECT 
    '🏢 DEPARTMENTS' as data_type,
    count(*) as total_count,
    string_agg(name, ', ' ORDER BY name) as sample_names
FROM public.departments

UNION ALL

SELECT 
    '📚 BATCHES' as data_type,
    count(*) as total_count,
    string_agg(name, ', ' ORDER BY name LIMIT 5) || 
    CASE WHEN count(*) > 5 THEN ' (and ' || (count(*) - 5)::text || ' more)' ELSE '' END as sample_names
FROM public.batches

UNION ALL

SELECT 
    '📝 SECTIONS' as data_type,
    count(*) as total_count,
    string_agg(name, ', ' ORDER BY name LIMIT 5) || 
    CASE WHEN count(*) > 5 THEN ' (and ' || (count(*) - 5)::text || ' more)' ELSE '' END as sample_names
FROM public.sections;

-- ============================================================================
-- USER STATISTICS
-- ============================================================================

SELECT 
    '👥 USER BREAKDOWN' as category,
    '' as subcategory,
    0 as count,
    '' as details
WHERE FALSE

UNION ALL

SELECT 
    '👥 USER BREAKDOWN' as category,
    'Total Users' as subcategory,
    count(*)::integer as count,
    'All users in the system' as details
FROM public.users

UNION ALL

SELECT 
    '👥 USER BREAKDOWN' as category,
    'Regular Users' as subcategory,
    count(*)::integer as count,
    'Users with role = user' as details
FROM public.users 
WHERE role = 'user'

UNION ALL

SELECT 
    '👥 USER BREAKDOWN' as category,
    'Section Admins' as subcategory,
    count(*)::integer as count,
    'Users with section admin privileges' as details
FROM public.users 
WHERE role = 'section_admin'

UNION ALL

SELECT 
    '👥 USER BREAKDOWN' as category,
    'Super Admins' as subcategory,
    count(*)::integer as count,
    'Users with super admin privileges' as details
FROM public.users 
WHERE role = 'super-admin'

UNION ALL

SELECT 
    '👥 USER BREAKDOWN' as category,
    'Test Users' as subcategory,
    count(*)::integer as count,
    'Users with @diu.edu.bd emails (sample data)' as details
FROM public.users 
WHERE email LIKE '%@diu.edu.bd'

ORDER BY category, subcategory;

-- ============================================================================
-- TASK STATISTICS
-- ============================================================================

SELECT 
    '📋 TASK BREAKDOWN' as category,
    '' as subcategory,
    0 as count,
    '' as details
WHERE FALSE

UNION ALL

SELECT 
    '📋 TASK BREAKDOWN' as category,
    'Total Tasks' as subcategory,
    count(*)::integer as count,
    'All tasks in the system' as details
FROM public.tasks

UNION ALL

SELECT 
    '📋 TASK BREAKDOWN' as category,
    status as subcategory,
    count(*)::integer as count,
    'Tasks with status: ' || status as details
FROM public.tasks 
GROUP BY status

UNION ALL

SELECT 
    '📋 TASK BREAKDOWN' as category,
    category as subcategory,
    count(*)::integer as count,
    'Tasks in category: ' || category as details
FROM public.tasks 
GROUP BY category

ORDER BY category, subcategory;

-- ============================================================================
-- RECENT ACTIVITY
-- ============================================================================

SELECT 
    '🕒 RECENT ACTIVITY' as info_type,
    'Latest Users' as detail_type,
    count(*) as count,
    'Users created in the last 7 days' as description
FROM public.users 
WHERE created_at > now() - interval '7 days'

UNION ALL

SELECT 
    '🕒 RECENT ACTIVITY' as info_type,
    'Latest Tasks' as detail_type,
    count(*) as count,
    'Tasks created in the last 7 days' as description
FROM public.tasks 
WHERE created_at > now() - interval '7 days'

UNION ALL

SELECT 
    '🕒 RECENT ACTIVITY' as info_type,
    'Today Users' as detail_type,
    count(*) as count,
    'Users created today' as description
FROM public.users 
WHERE created_at::date = current_date

UNION ALL

SELECT 
    '🕒 RECENT ACTIVITY' as info_type,
    'Today Tasks' as detail_type,
    count(*) as count,
    'Tasks created today' as description
FROM public.tasks 
WHERE created_at::date = current_date;

-- ============================================================================
-- SAMPLE USER DETAILS (Latest 10)
-- ============================================================================

SELECT 
    '👤 SAMPLE USERS (Latest 10)' as section,
    u.email,
    u.name,
    u.role,
    d.name as department,
    b.name as batch,
    s.name as section,
    u.created_at::date as created_date
FROM public.users u
LEFT JOIN public.departments d ON u.department_id = d.id
LEFT JOIN public.batches b ON u.batch_id = b.id
LEFT JOIN public.sections s ON u.section_id = s.id
ORDER BY u.created_at DESC
LIMIT 10;

-- ============================================================================
-- SAMPLE TASK DETAILS (Latest 10)
-- ============================================================================

SELECT 
    '📋 SAMPLE TASKS (Latest 10)' as section,
    t.name as task_name,
    t.category,
    t.status,
    t.due_date,
    u.name as assigned_to,
    s.name as section,
    t.created_at::date as created_date
FROM public.tasks t
LEFT JOIN public.users u ON t.user_id = u.id
LEFT JOIN public.sections s ON t.section_id = s.id
ORDER BY t.created_at DESC
LIMIT 10;

-- ============================================================================
-- SYSTEM READINESS CHECK
-- ============================================================================

WITH readiness_check AS (
    SELECT 
        (SELECT count(*) FROM public.departments) as dept_count,
        (SELECT count(*) FROM public.batches) as batch_count,
        (SELECT count(*) FROM public.sections) as section_count
)
SELECT 
    '🔍 SYSTEM READINESS' as check_type,
    CASE 
        WHEN dept_count > 0 AND batch_count > 0 AND section_count > 0 THEN '✅ READY'
        ELSE '❌ NOT READY'
    END as status,
    CASE 
        WHEN dept_count = 0 THEN 'Missing departments. '
        ELSE ''
    END ||
    CASE 
        WHEN batch_count = 0 THEN 'Missing batches. '
        ELSE ''
    END ||
    CASE 
        WHEN section_count = 0 THEN 'Missing sections. '
        ELSE ''
    END ||
    CASE 
        WHEN dept_count > 0 AND batch_count > 0 AND section_count > 0 THEN 'System is ready for sample data generation!'
        ELSE 'Run department setup migration first.'
    END as message
FROM readiness_check;

-- ============================================================================
-- HELPFUL INFORMATION
-- ============================================================================

SELECT 
    '💡 NEXT STEPS' as info_type,
    'If system is ready' as condition,
    'Run add_sample_data.sql to generate sample users and tasks' as action

UNION ALL

SELECT 
    '💡 NEXT STEPS' as info_type,
    'If system is not ready' as condition,
    'Run migration: 20250411141228_populate_department_data.sql' as action

UNION ALL

SELECT 
    '💡 NEXT STEPS' as info_type,
    'To clean up test data' as condition,
    'Run cleanup_test_data.sql to remove all sample data' as action;
