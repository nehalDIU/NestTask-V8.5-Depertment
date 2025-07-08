# Seed Data Scripts for NestTask

This directory contains scripts to populate your NestTask database with random test data for development and testing purposes.

## 🚀 Quick Start

1. **Check System Status**: Run `check_sample_data.sql` first
2. **Add Sample Data**: Run `add_sample_data.sql` (recommended for new users)
3. **Verify Results**: Run `check_sample_data.sql` again to see the results

## 📁 Files Overview

### 1. `add_sample_data.sql` ⭐ **RECOMMENDED**
- **Type**: User-friendly standalone script
- **Purpose**: Easy-to-use script for adding sample data
- **Creates**: 25 users, 4 section admins, and 60 tasks (configurable)
- **Features**: Progress indicators, clear messages, error handling
- **Usage**: Copy and paste into Supabase SQL Editor

### 2. `check_sample_data.sql` 🔍
- **Type**: Verification script
- **Purpose**: Check current database status and data counts
- **Shows**: User counts, task statistics, recent activity, system readiness
- **Usage**: Run before and after adding sample data

### 3. `seed_random_data.sql`
- **Type**: Advanced standalone script
- **Purpose**: Add more test data (enhanced version)
- **Creates**: 30 users, 5 section admins, and 75 tasks per run
- **Usage**: Run manually in Supabase SQL Editor

### 4. `20250708000001_add_random_seed_data.sql`
- **Type**: Migration file
- **Purpose**: One-time migration that adds initial seed data
- **Creates**: 50 regular users, 5 section admins, and 120 tasks
- **Usage**: Run automatically with Supabase migrations

### 5. `cleanup_test_data.sql`
- **Type**: Cleanup script
- **Purpose**: Remove all test/seed data
- **Usage**: Run when you want to clean up test data

## 📋 How to Use

### 🔍 Step 1: Check System Status

Before adding sample data, check if your system is ready:

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `check_sample_data.sql`
3. Click "Run"
4. Review the output to ensure departments, batches, and sections exist

### ✨ Step 2: Add Sample Data (Recommended Method)

Use the user-friendly script for the best experience:

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `add_sample_data.sql`
3. **Optional**: Modify the configuration variables at the top:
   ```sql
   users_to_create INTEGER := 25;           -- Change this number
   tasks_to_create INTEGER := 60;           -- Change this number
   section_admins_to_create INTEGER := 4;   -- Change this number
   ```
4. Click "Run"
5. Watch the progress messages and success confirmation

### 🔄 Step 3: Verify Results

After adding data, verify everything worked correctly:

1. Run `check_sample_data.sql` again
2. Review the updated statistics
3. Check the sample user and task lists

### 🧹 Cleaning Up Test Data

When you want to remove all test data:

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `cleanup_test_data.sql`
3. Click "Run"
4. Review the cleanup summary

**⚠️ Warning**: This will permanently delete all test data!

### 🔧 Alternative: Advanced Script

For more control, use the advanced script:

1. Open `seed_random_data.sql`
2. Modify the configuration variables as needed
3. Run in Supabase SQL Editor
4. Can be run multiple times safely

## What Data is Created

### Users
- **Regular Users**: Students with realistic Bangladeshi names
- **Section Admins**: Users with section administration privileges
- **Email Pattern**: `testuser[timestamp]_[number]@diu.edu.bd`
- **Password**: `Test123!` for regular users, `Admin123!` for admins
- **Fields**: Name, phone, student ID, department, batch, section assignments

### Tasks
- **Personal Tasks**: Assigned to individual users
- **Section Tasks**: Created by section admins for their sections
- **Categories**: Assignment, Project, Exam, Lab, Research, Presentation
- **Statuses**: pending, in_progress, completed, overdue
- **Due Dates**: Random dates within ±30 days from current date

## Data Relationships

The seed data maintains proper relationships:
- Users are assigned to existing departments, batches, and sections
- Tasks are linked to users and their respective sections
- Section admins are properly associated with specific sections
- All foreign key constraints are respected

## Customization

You can modify the scripts to:
- Change the number of users/tasks created
- Modify the sample names, titles, or categories
- Adjust date ranges for tasks
- Add different user roles or permissions

### Example Modifications

```sql
-- Change user count in seed_random_data.sql
user_count INTEGER := 50; -- Instead of 20

-- Add more task categories
categories TEXT[] := ARRAY['Assignment', 'Project', 'Exam', 'Lab', 'Research', 'Presentation', 'Workshop', 'Seminar'];

-- Modify date range for tasks
(current_date + (random() * 90 - 30)::int)::date, -- ±30 days becomes ±90 days
```

## Verification

After running the seed scripts, you can verify the data:

```sql
-- Check user counts
SELECT role, count(*) FROM public.users GROUP BY role;

-- Check task distribution
SELECT status, count(*) FROM public.tasks GROUP BY status;

-- Check section assignments
SELECT s.name as section_name, count(u.id) as user_count
FROM public.sections s
LEFT JOIN public.users u ON s.id = u.section_id
GROUP BY s.name
ORDER BY user_count DESC;
```

## Troubleshooting

### Common Issues

1. **"Missing required data" error**
   - Ensure departments, batches, and sections are set up first
   - Run the department setup migration: `20250411141228_populate_department_data.sql`

2. **Duplicate email errors**
   - The scripts use timestamps to avoid duplicates
   - If running multiple times quickly, wait a few seconds between runs

3. **Permission errors**
   - Ensure you're running as a user with sufficient privileges
   - Check RLS policies if data isn't visible

### Debug Queries

```sql
-- Check if departments exist
SELECT count(*) FROM public.departments;

-- Check if batches exist
SELECT count(*) FROM public.batches;

-- Check if sections exist
SELECT count(*) FROM public.sections;

-- View recent test users
SELECT email, name, role, created_at 
FROM public.users 
WHERE email LIKE '%@diu.edu.bd' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Best Practices

1. **Development Environment**: Use seed data only in development/testing environments
2. **Regular Cleanup**: Periodically clean up test data to avoid clutter
3. **Backup**: Always backup your database before running cleanup scripts
4. **Monitoring**: Monitor database size when adding large amounts of test data

## Security Notes

- Test users have simple passwords for development convenience
- Don't use these scripts in production environments
- Test emails use `@diu.edu.bd` domain to distinguish from real users
- All test data is clearly marked and easily identifiable for cleanup
