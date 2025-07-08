-- Standalone seed script for adding random users and tasks
-- This can be run multiple times to add more test data
-- Run this in the Supabase SQL Editor

-- Generate random users and tasks
DO $$
DECLARE
    dept_ids UUID[];
    batch_ids UUID[];
    section_ids UUID[];
    user_count INTEGER := 30; -- Number of users to create
    task_count INTEGER := 75; -- Number of tasks to create
    admin_count INTEGER := 5; -- Number of section admins to create
    i INTEGER;
    random_dept_id UUID;
    random_batch_id UUID;
    random_section_id UUID;
    random_user_id UUID;
    new_user_id UUID;
    
    -- Sample data arrays
    first_names TEXT[] := ARRAY[
        'Arif', 'Rashida', 'Kamal', 'Nasreen', 'Rafiq', 'Salma', 'Jahangir', 'Ruma',
        'Mizanur', 'Shahida', 'Alamgir', 'Rehana', 'Shamsul', 'Rokeya', 'Abdur',
        'Fatema', 'Golam', 'Rahima', 'Mostafa', 'Shireen', 'Nurul', 'Hasina',
        'Delwar', 'Rashida', 'Anwar', 'Sultana', 'Mahbub', 'Parvin', 'Shahin', 'Nasir',
        'Taslima', 'Rubel', 'Monira', 'Shakil', 'Rashida', 'Mamun', 'Sabina', 'Rahim',
        'Nasir', 'Shahana', 'Billal', 'Roksana', 'Masud', 'Shiuly', 'Faruk', 'Rashida'
    ];
    
    last_names TEXT[] := ARRAY[
        'Rahman', 'Ahmed', 'Khan', 'Begum', 'Hassan', 'Khatun', 'Ali', 'Sultana',
        'Islam', 'Akter', 'Uddin', 'Bibi', 'Hossain', 'Nessa', 'Karim', 'Parvin',
        'Miah', 'Rashid', 'Siddique', 'Fatima', 'Bhuiyan', 'Nasreen', 'Chowdhury', 'Ruma',
        'Sarkar', 'Mondal', 'Das', 'Roy', 'Sheikh', 'Talukder', 'Sikder', 'Bepari'
    ];
    
    task_titles TEXT[] := ARRAY[
        'Software Engineering Project',
        'Database Design Assignment',
        'Web Development Task',
        'Mobile App Development',
        'System Analysis Report',
        'Algorithm Implementation',
        'Data Structure Assignment',
        'Network Security Project',
        'Machine Learning Model',
        'Cloud Computing Task',
        'DevOps Pipeline Setup',
        'UI/UX Design Project',
        'API Development Task',
        'Testing and QA Assignment',
        'Code Review Session',
        'Technical Documentation',
        'Research Paper Writing',
        'Presentation Preparation',
        'Group Project Coordination',
        'Final Exam Preparation',
        'Cybersecurity Analysis',
        'Blockchain Implementation',
        'IoT Device Programming',
        'Artificial Intelligence Study',
        'Game Development Project',
        'E-commerce Platform Design',
        'Social Media App Creation',
        'Data Analytics Dashboard',
        'Virtual Reality Experience',
        'Augmented Reality App'
    ];
    
    categories TEXT[] := ARRAY['Assignment', 'Project', 'Exam', 'Lab', 'Research', 'Presentation'];
    statuses TEXT[] := ARRAY['pending', 'in_progress', 'completed', 'overdue'];
    
BEGIN
    -- Get existing department, batch, and section IDs
    SELECT ARRAY(SELECT id FROM public.departments) INTO dept_ids;
    SELECT ARRAY(SELECT id FROM public.batches) INTO batch_ids;
    SELECT ARRAY(SELECT id FROM public.sections) INTO section_ids;
    
    -- Check if we have the required data
    IF array_length(dept_ids, 1) IS NULL OR array_length(batch_ids, 1) IS NULL OR array_length(section_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'Missing required data: departments, batches, or sections. Please run the department setup migration first.';
    END IF;
    
    RAISE NOTICE 'Creating % users, % section admins, and % tasks...', user_count, admin_count, task_count;
    
    -- Create regular users
    FOR i IN 1..user_count LOOP
        -- Select random IDs
        random_dept_id := dept_ids[(random() * (array_length(dept_ids, 1) - 1))::int + 1];
        random_batch_id := batch_ids[(random() * (array_length(batch_ids, 1) - 1))::int + 1];
        random_section_id := section_ids[(random() * (array_length(section_ids, 1) - 1))::int + 1];
        
        new_user_id := gen_random_uuid();
        
        -- Create auth user
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
            'testuser' || extract(epoch from now())::bigint || '_' || i || '@diu.edu.bd',
            crypt('Test123!', gen_salt('bf')),
            now(),
            'authenticated',
            jsonb_build_object(
                'name', first_names[(random() * (array_length(first_names, 1) - 1))::int + 1] || ' ' || 
                        last_names[(random() * (array_length(last_names, 1) - 1))::int + 1],
                'phone', '+880' || (1600000000 + (random() * 199999999)::bigint)::text,
                'studentId', 'TS-' || extract(year from now())::text || '-' || lpad(i::text, 4, '0'),
                'departmentId', random_dept_id::text,
                'batchId', random_batch_id::text,
                'sectionId', random_section_id::text
            ),
            now(),
            now()
        );
    END LOOP;
    
    -- Create section admin users
    FOR i IN 1..admin_count LOOP
        random_section_id := section_ids[(random() * (array_length(section_ids, 1) - 1))::int + 1];
        
        -- Get batch and department for this section
        SELECT b.department_id, s.batch_id 
        INTO random_dept_id, random_batch_id
        FROM public.sections s
        JOIN public.batches b ON s.batch_id = b.id
        WHERE s.id = random_section_id;
        
        new_user_id := gen_random_uuid();
        
        -- Create section admin auth user
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
            'admin' || extract(epoch from now())::bigint || '_' || i || '@diu.edu.bd',
            crypt('Admin123!', gen_salt('bf')),
            now(),
            'authenticated',
            jsonb_build_object(
                'name', 'Section Admin ' || i || ' (' || extract(epoch from now())::bigint || ')',
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
    
    -- Wait a moment for the trigger to process users
    PERFORM pg_sleep(2);
    
    -- Create random tasks
    FOR i IN 1..task_count LOOP
        -- Get a random user (could be regular user or admin)
        SELECT id, section_id 
        INTO random_user_id, random_section_id
        FROM public.users 
        WHERE email LIKE '%@diu.edu.bd'
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
                categories[(random() * (array_length(categories, 1) - 1))::int + 1],
                (current_date + (random() * 60 - 15)::int)::date,
                'This is a randomly generated task for testing purposes. ' ||
                'It includes various requirements and deadlines that students need to follow. ' ||
                'Please complete this task according to the specified guidelines and submit on time.',
                statuses[(random() * (array_length(statuses, 1) - 1))::int + 1],
                random_user_id,
                random_section_id,
                now() - (random() * interval '15 days')
            );
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Successfully created % users, % section admins, and % tasks!', user_count, admin_count, task_count;
    RAISE NOTICE 'You can run this script multiple times to add more test data.';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating seed data: %', SQLERRM;
    RAISE NOTICE 'Make sure the departments, batches, and sections are properly set up first.';
END $$;
