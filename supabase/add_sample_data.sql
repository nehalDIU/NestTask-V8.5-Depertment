-- Quick Sample Data Generator for NestTask
-- Run this script in the Supabase SQL Editor to add sample users and tasks
-- This script is designed to be simple and easy to customize

-- ============================================================================
-- CONFIGURATION - Modify these values to change the amount of data generated
-- ============================================================================

DO $$
DECLARE
    -- Configuration variables (modify these as needed)
    users_to_create INTEGER := 25;
    tasks_to_create INTEGER := 60;
    section_admins_to_create INTEGER := 4;
    
    -- Internal variables (don't modify these)
    dept_ids UUID[];
    batch_ids UUID[];
    section_ids UUID[];
    i INTEGER;
    random_dept_id UUID;
    random_batch_id UUID;
    random_section_id UUID;
    random_user_id UUID;
    new_user_id UUID;
    timestamp_suffix TEXT;
    
    -- Sample data arrays
    bangladeshi_first_names TEXT[] := ARRAY[
        'Aminul', 'Rashida', 'Kamal', 'Nasreen', 'Rafiq', 'Salma', 'Jahangir', 'Ruma',
        'Mizanur', 'Shahida', 'Alamgir', 'Rehana', 'Shamsul', 'Rokeya', 'Abdur', 'Fatema',
        'Golam', 'Rahima', 'Mostafa', 'Shireen', 'Nurul', 'Hasina', 'Delwar', 'Sultana',
        'Mahbub', 'Parvin', 'Shahin', 'Nasir', 'Taslima', 'Rubel', 'Monira', 'Shakil',
        'Mamun', 'Sabina', 'Rahim', 'Shahana', 'Billal', 'Roksana', 'Masud', 'Shiuly'
    ];
    
    bangladeshi_last_names TEXT[] := ARRAY[
        'Rahman', 'Ahmed', 'Khan', 'Begum', 'Hassan', 'Khatun', 'Ali', 'Sultana',
        'Islam', 'Akter', 'Uddin', 'Bibi', 'Hossain', 'Nessa', 'Karim', 'Parvin',
        'Miah', 'Rashid', 'Siddique', 'Fatima', 'Bhuiyan', 'Nasreen', 'Chowdhury',
        'Sarkar', 'Mondal', 'Das', 'Roy', 'Sheikh', 'Talukder', 'Sikder', 'Bepari'
    ];
    
    task_titles TEXT[] := ARRAY[
        'Complete Programming Assignment',
        'Database Design Project',
        'Web Development Task',
        'Mobile App Prototype',
        'System Analysis Report',
        'Algorithm Implementation',
        'Data Structure Exercise',
        'Network Configuration',
        'Machine Learning Study',
        'Cloud Computing Lab',
        'Software Testing Task',
        'UI/UX Design Project',
        'API Development',
        'Code Documentation',
        'Research Paper Draft',
        'Group Presentation',
        'Final Project Proposal',
        'Lab Report Submission',
        'Exam Preparation',
        'Technical Review'
    ];
    
    task_categories TEXT[] := ARRAY['Assignment', 'Project', 'Exam', 'Lab', 'Research', 'Presentation'];
    task_statuses TEXT[] := ARRAY['pending', 'in_progress', 'completed', 'overdue'];
    
BEGIN
    -- Generate timestamp suffix to ensure unique emails
    timestamp_suffix := extract(epoch from now())::bigint::text;
    
    RAISE NOTICE '🚀 Starting to create sample data...';
    RAISE NOTICE '📊 Configuration: % users, % tasks, % section admins', 
                 users_to_create, tasks_to_create, section_admins_to_create;
    
    -- Get existing department, batch, and section IDs
    SELECT ARRAY(SELECT id FROM public.departments) INTO dept_ids;
    SELECT ARRAY(SELECT id FROM public.batches) INTO batch_ids;
    SELECT ARRAY(SELECT id FROM public.sections) INTO section_ids;
    
    -- Validate required data exists
    IF array_length(dept_ids, 1) IS NULL THEN
        RAISE EXCEPTION '❌ No departments found! Please set up departments first.';
    END IF;
    
    IF array_length(batch_ids, 1) IS NULL THEN
        RAISE EXCEPTION '❌ No batches found! Please set up batches first.';
    END IF;
    
    IF array_length(section_ids, 1) IS NULL THEN
        RAISE EXCEPTION '❌ No sections found! Please set up sections first.';
    END IF;
    
    RAISE NOTICE '✅ Found % departments, % batches, % sections', 
                 array_length(dept_ids, 1), array_length(batch_ids, 1), array_length(section_ids, 1);
    
    -- ========================================================================
    -- CREATE REGULAR USERS
    -- ========================================================================
    
    RAISE NOTICE '👥 Creating % regular users...', users_to_create;
    
    FOR i IN 1..users_to_create LOOP
        -- Select random department, batch, and section
        random_dept_id := dept_ids[(random() * (array_length(dept_ids, 1) - 1))::int + 1];
        random_batch_id := batch_ids[(random() * (array_length(batch_ids, 1) - 1))::int + 1];
        random_section_id := section_ids[(random() * (array_length(section_ids, 1) - 1))::int + 1];
        
        new_user_id := gen_random_uuid();
        
        -- Create user in auth.users table
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            role,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            new_user_id,
            'student' || timestamp_suffix || '_' || i || '@diu.edu.bd',
            crypt('Student123!', gen_salt('bf')),
            now(),
            'authenticated',
            jsonb_build_object(
                'name', bangladeshi_first_names[(random() * (array_length(bangladeshi_first_names, 1) - 1))::int + 1] || ' ' || 
                        bangladeshi_last_names[(random() * (array_length(bangladeshi_last_names, 1) - 1))::int + 1],
                'phone', '+880' || (1600000000 + (random() * 199999999)::bigint)::text,
                'studentId', 'ST-' || extract(year from now())::text || '-' || lpad(i::text, 4, '0'),
                'departmentId', random_dept_id::text,
                'batchId', random_batch_id::text,
                'sectionId', random_section_id::text
            ),
            now(),
            now()
        );
        
        -- Progress indicator
        IF i % 10 = 0 THEN
            RAISE NOTICE '   📝 Created % users so far...', i;
        END IF;
    END LOOP;
    
    -- ========================================================================
    -- CREATE SECTION ADMIN USERS
    -- ========================================================================
    
    RAISE NOTICE '👨‍💼 Creating % section admin users...', section_admins_to_create;
    
    FOR i IN 1..section_admins_to_create LOOP
        random_section_id := section_ids[(random() * (array_length(section_ids, 1) - 1))::int + 1];
        
        -- Get batch and department for this section
        SELECT b.department_id, s.batch_id 
        INTO random_dept_id, random_batch_id
        FROM public.sections s
        JOIN public.batches b ON s.batch_id = b.id
        WHERE s.id = random_section_id;
        
        new_user_id := gen_random_uuid();
        
        -- Create section admin user
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            role,
            raw_user_meta_data,
            raw_app_meta_data,
            created_at,
            updated_at
        ) VALUES (
            new_user_id,
            'sectionadmin' || timestamp_suffix || '_' || i || '@diu.edu.bd',
            crypt('Admin123!', gen_salt('bf')),
            now(),
            'authenticated',
            jsonb_build_object(
                'name', 'Section Admin ' || i || ' (' || timestamp_suffix || ')',
                'phone', '+880' || (1800000000 + (random() * 99999999)::bigint)::text,
                'studentId', 'ADM-' || extract(year from now())::text || '-' || lpad(i::text, 3, '0'),
                'departmentId', random_dept_id::text,
                'batchId', random_batch_id::text,
                'sectionId', random_section_id::text
            ),
            jsonb_build_object('role', 'section_admin'),
            now(),
            now()
        );
    END LOOP;
    
    -- Wait for triggers to process
    RAISE NOTICE '⏳ Waiting for user creation triggers to complete...';
    PERFORM pg_sleep(3);
    
    -- ========================================================================
    -- CREATE TASKS
    -- ========================================================================
    
    RAISE NOTICE '📋 Creating % tasks...', tasks_to_create;
    
    FOR i IN 1..tasks_to_create LOOP
        -- Get a random user from our newly created users
        SELECT id, section_id 
        INTO random_user_id, random_section_id
        FROM public.users 
        WHERE email LIKE '%' || timestamp_suffix || '%@diu.edu.bd'
        ORDER BY random()
        LIMIT 1;
        
        IF random_user_id IS NOT NULL THEN
            INSERT INTO public.tasks (
                name,
                category,
                due_date,
                description,
                status,
                user_id,
                section_id,
                created_at
            ) VALUES (
                task_titles[(random() * (array_length(task_titles, 1) - 1))::int + 1],
                task_categories[(random() * (array_length(task_categories, 1) - 1))::int + 1],
                (current_date + (random() * 60 - 15)::int)::date, -- Random date ±15 days from today
                'This is a sample task created for testing and demonstration purposes. ' ||
                'It includes realistic requirements and deadlines that students typically encounter. ' ||
                'Please complete this task according to the specified guidelines and submit on time.',
                task_statuses[(random() * (array_length(task_statuses, 1) - 1))::int + 1],
                random_user_id,
                random_section_id,
                now() - (random() * interval '10 days') -- Created sometime in the last 10 days
            );
        END IF;
        
        -- Progress indicator
        IF i % 20 = 0 THEN
            RAISE NOTICE '   📝 Created % tasks so far...', i;
        END IF;
    END LOOP;
    
    -- ========================================================================
    -- SUCCESS MESSAGE
    -- ========================================================================
    
    RAISE NOTICE '🎉 Sample data creation completed successfully!';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '   👥 Regular users: %', users_to_create;
    RAISE NOTICE '   👨‍💼 Section admins: %', section_admins_to_create;
    RAISE NOTICE '   📋 Tasks: %', tasks_to_create;
    RAISE NOTICE '';
    RAISE NOTICE '🔑 Login credentials:';
    RAISE NOTICE '   Regular users: student%_[number]@diu.edu.bd / Student123!', timestamp_suffix;
    RAISE NOTICE '   Section admins: sectionadmin%_[number]@diu.edu.bd / Admin123!', timestamp_suffix;
    RAISE NOTICE '';
    RAISE NOTICE '💡 You can run this script multiple times to add more sample data.';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error creating sample data: %', SQLERRM;
    RAISE NOTICE '💡 Make sure departments, batches, and sections are set up first.';
    RAISE NOTICE '💡 Check the department setup migration: 20250411141228_populate_department_data.sql';
END $$;
