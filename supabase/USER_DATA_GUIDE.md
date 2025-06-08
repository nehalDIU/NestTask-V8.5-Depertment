# User Data Handling Guide

This guide explains how user data is processed in the NestTask application, focusing on how department-related fields are stored and retrieved.

## Data Flow Overview

1. **User Signup**: When a user signs up using `signupUser()` in `auth.service.ts`, their data includes:
   - Basic info: email, name, password
   - Extended info: phone, studentId
   - Department info: departmentId, batchId, sectionId

2. **Storage Process**:
   - Data is stored in user metadata during Supabase auth signup
   - The `handle_new_user` database trigger creates a record in `public.users`
   - User fields are extracted from metadata and stored in the appropriate columns

3. **Field Mapping**:
   - Frontend uses camelCase (studentId, departmentId)
   - Database uses snake_case (student_id, department_id)
   - The trigger handles this conversion automatically

## Troubleshooting User Data Issues

### Missing User Fields

If user fields like phone, student_id, department_id, batch_id, or section_id are not being saved:

1. **Check Metadata Storage**:
   ```sql
   SELECT id, email, raw_user_meta_data, raw_app_meta_data
   FROM auth.users
   WHERE email = 'user@example.com';
   ```

2. **Inspect Extracted Data**:
   ```sql
   SELECT * FROM public.debug_user_data('user-uuid-here');
   ```

3. **Common Issues**:
   - Fields might be in `raw_user_meta_data` instead of `raw_app_meta_data` or vice versa
   - UUID conversion errors for department/batch/section IDs
   - Case sensitivity issues in field names (camelCase vs snake_case)

### Fixing User Data

To fix user data issues for existing users:

```sql
-- Update a user's missing fields
UPDATE public.users
SET 
  phone = '01712345678',
  student_id = '12345678',
  department_id = 'uuid-here',
  batch_id = 'uuid-here',
  section_id = 'uuid-here'
WHERE 
  email = 'user@example.com';

-- Then update auth metadata to match
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{phone}',
  '"01712345678"'
)
WHERE email = 'user@example.com';
```

## New Features

### Users with Full Info View

We've created a convenient view that joins user data with their department, batch, and section information:

```sql
SELECT * FROM public.users_with_full_info
WHERE email = 'user@example.com';
```

This view provides a complete user profile including:
- Basic user data
- Department name
- Batch name
- Section name

### Debug Functions

To debug user data issues, use the `debug_user_data` function:

```sql
SELECT * FROM public.debug_user_data('user-uuid-here');
```

This shows both the auth user record and public user record side by side for comparison.

## Best Practices

1. **Always use the trigger**: Don't manually insert into `public.users` - let the trigger handle it
2. **Check data consistency**: Periodically run the test script to ensure data integrity
3. **Use the views**: The `users_with_full_info` view simplifies data access
4. **Monitor logs**: The trigger logs diagnostic information about data extraction 