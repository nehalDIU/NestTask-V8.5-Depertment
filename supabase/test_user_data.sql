-- Test script for user data storage
-- Run this in the Supabase SQL Editor to verify user data is being saved correctly

-- 1. View all users with their metadata
SELECT 
  u.id,
  u.email,
  u.role,
  u.phone,
  u.student_id,
  u.department_id,
  d.name as department_name,
  u.batch_id,
  b.name as batch_name,
  u.section_id,
  s.name as section_name
FROM 
  public.users u
LEFT JOIN 
  public.departments d ON u.department_id = d.id
LEFT JOIN 
  public.batches b ON u.batch_id = b.id
LEFT JOIN 
  public.sections s ON u.section_id = s.id
ORDER BY u.created_at DESC
LIMIT 10;

-- 2. Check how metadata is stored in auth.users
SELECT 
  id, 
  email, 
  role,
  raw_user_meta_data,
  raw_app_meta_data
FROM 
  auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 3. Test the debug function
SELECT * FROM public.debug_user_data('00000000-0000-0000-0000-000000000000'); -- Replace with actual user UUID

-- 4. Check for any role inconsistencies
SELECT 
  au.id, 
  au.email, 
  au.role as auth_role, 
  au.raw_app_meta_data->>'role' as meta_role,
  pu.role as public_role
FROM 
  auth.users au
JOIN 
  public.users pu ON au.id = pu.id
WHERE 
  au.raw_app_meta_data->>'role' != pu.role OR
  au.role != pu.role
LIMIT 10;

-- 5. Check for users with missing data in required fields
SELECT 
  id, 
  email, 
  role,
  phone,
  student_id,
  department_id,
  batch_id,
  section_id
FROM 
  public.users 
WHERE 
  phone IS NULL OR
  student_id IS NULL
ORDER BY created_at DESC
LIMIT 10; 