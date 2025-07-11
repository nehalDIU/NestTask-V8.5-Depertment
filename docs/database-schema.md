# Database Schema Documentation

## Overview

NestTask uses PostgreSQL as its primary database, managed through Supabase. The database schema is designed to support a hierarchical educational institution structure with departments, batches, and sections, along with comprehensive task and course management capabilities.

## Database Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │    Auth     │    │   Public    │    │   Storage   │     │
│  │   Schema    │    │   Schema    │    │   Buckets   │     │
│  │             │    │             │    │             │     │
│  │ • users     │    │ • users     │    │ • files     │     │
│  │ • sessions  │    │ • tasks     │    │ • images    │     │
│  │ • refresh   │    │ • courses   │    │ • docs      │     │
│  │   tokens    │    │ • materials │    │             │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Core Tables

### 1. User Management Tables

#### users
Primary user information table with department hierarchy integration.

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'section_admin', 'super-admin')),
  phone TEXT,
  student_id TEXT,
  department_id UUID REFERENCES public.departments(id),
  batch_id UUID REFERENCES public.batches(id),
  section_id UUID REFERENCES public.sections(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_active TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
```sql
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_section_id ON users(section_id);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_email ON users(email);
```

#### departments
Top-level organizational units (e.g., Computer Science, Engineering).

```sql
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### batches
Academic year groups within departments (e.g., Batch 2021, Batch 2022).

```sql
CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  academic_year TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, department_id)
);
```

#### sections
Class sections within batches (e.g., Section A, Section B).

```sql
CREATE TABLE public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  capacity INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, batch_id)
);
```

### 2. Task Management Tables

#### tasks
Core task management table supporting both personal and administrative tasks.

```sql
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'assignment', 'presentation', 'quiz', 'lab-report', 
    'lab-final', 'lab-performance', 'task', 'documents',
    'blc', 'groups', 'project', 'midterm', 'final-exam', 'others'
  )),
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'my-tasks' CHECK (status IN ('my-tasks', 'in-progress', 'completed')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id),
  is_admin_task BOOLEAN DEFAULT false,
  google_drive_links TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
```sql
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_section_id ON tasks(section_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_is_admin_task ON tasks(is_admin_task);
```

### 3. Course Management Tables

#### courses
Course information with teacher and schedule details.

```sql
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  teacher TEXT NOT NULL,
  teacher_id UUID REFERENCES public.teachers(id),
  class_time JSONB, -- Stores array of {day, time, classroom} objects
  telegram_group TEXT,
  blc_link TEXT,
  blc_enroll_key TEXT,
  credit DECIMAL(3,1),
  section_id UUID REFERENCES public.sections(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
```

#### study_materials
Educational resources linked to courses.

```sql
CREATE TABLE public.study_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Task', 'Presentation', 'Assignment', 'Quiz', 'Lab Report',
    'Lab Final', 'Lab Performance', 'Documents', 'BLC', 'Groups',
    'Others', 'Midterm', 'Final Exam', 'Project', 'Class Slide', 'Slide'
  )),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  file_urls TEXT[],
  google_drive_links TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);
```

#### teachers
Teacher information and contact details.

```sql
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  department_id UUID REFERENCES public.departments(id),
  designation TEXT,
  office_location TEXT,
  consultation_hours TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4. Routine Management Tables

#### routine_slots
Class schedule management.

```sql
CREATE TABLE public.routine_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id),
  room_number TEXT,
  section_id UUID REFERENCES public.sections(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(day_of_week, start_time, section_id, room_number)
);
```

### 5. Communication Tables

#### announcements
System-wide and section-specific announcements.

```sql
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'general' CHECK (type IN ('general', 'urgent', 'academic', 'event')),
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'students', 'teachers', 'admins')),
  section_id UUID REFERENCES public.sections(id), -- NULL for global announcements
  department_id UUID REFERENCES public.departments(id),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### notifications
User-specific notification system.

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT false,
  related_id UUID, -- Can reference tasks, announcements, etc.
  related_type TEXT, -- 'task', 'announcement', etc.
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Database Views

### users_with_full_info
Comprehensive user view with department hierarchy.

```sql
CREATE OR REPLACE VIEW public.users_with_full_info AS
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.phone,
  u.student_id AS "studentId",
  u.department_id AS "departmentId",
  d.name AS "departmentName",
  u.batch_id AS "batchId",
  b.name AS "batchName",
  u.section_id AS "sectionId",
  s.name AS "sectionName",
  u.created_at AS "createdAt",
  u.last_active AS "lastActive"
FROM 
  public.users u
LEFT JOIN 
  public.departments d ON u.department_id = d.id
LEFT JOIN 
  public.batches b ON u.batch_id = b.id
LEFT JOIN 
  public.sections s ON u.section_id = s.id;
```

### tasks_with_details
Enhanced task view with user and section information.

```sql
CREATE OR REPLACE VIEW public.tasks_with_details AS
SELECT 
  t.*,
  u.name AS assigned_by_name,
  s.name AS section_name,
  d.name AS department_name
FROM 
  public.tasks t
LEFT JOIN 
  public.users u ON t.user_id = u.id
LEFT JOIN 
  public.sections s ON t.section_id = s.id
LEFT JOIN 
  public.batches b ON s.batch_id = b.id
LEFT JOIN 
  public.departments d ON b.department_id = d.id;
```

## Database Functions

### User Management Functions

#### get_current_user_with_section()
Returns current user with complete section information.

```sql
CREATE OR REPLACE FUNCTION public.get_current_user_with_section()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  phone TEXT,
  student_id TEXT,
  department_id UUID,
  department_name TEXT,
  batch_id UUID,
  batch_name TEXT,
  section_id UUID,
  section_name TEXT,
  created_at TIMESTAMPTZ,
  last_active TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.phone,
    u.student_id,
    u.department_id,
    d.name as department_name,
    u.batch_id,
    b.name as batch_name,
    u.section_id,
    s.name as section_name,
    u.created_at,
    u.last_active
  FROM public.users u
  LEFT JOIN public.departments d ON u.department_id = d.id
  LEFT JOIN public.batches b ON u.batch_id = b.id
  LEFT JOIN public.sections s ON u.section_id = s.id
  WHERE u.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### promote_user_to_section_admin()
Promotes a user to section admin role.

```sql
CREATE OR REPLACE FUNCTION public.promote_user_to_section_admin(
  target_user_id UUID,
  target_section_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Check if current user is admin or super-admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super-admin')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Update user role and section
  UPDATE public.users 
  SET 
    role = 'section_admin',
    section_id = target_section_id
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Statistics Functions

#### get_user_stats()
Returns user statistics for admin dashboard.

```sql
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS json
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  total_users integer;
  active_today integer;
  new_this_week integer;
BEGIN
  SELECT COUNT(*) INTO total_users FROM users;
  
  SELECT COUNT(*) INTO active_today 
  FROM users 
  WHERE last_active >= CURRENT_DATE;
  
  SELECT COUNT(*) INTO new_this_week 
  FROM users 
  WHERE created_at >= (CURRENT_DATE - INTERVAL '7 days');
  
  RETURN json_build_object(
    'total_users', total_users,
    'active_today', active_today,
    'new_this_week', new_this_week
  );
END;
$$;
```

## Database Triggers

### User Activity Tracking

```sql
-- Update last_active timestamp on user activity
CREATE OR REPLACE FUNCTION handle_user_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
  SET last_active = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_activity
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_activity();
```

### New User Profile Creation

```sql
-- Automatically create user profile when auth user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, phone, student_id, department_id, batch_id, section_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'studentId',
    (NEW.raw_user_meta_data->>'departmentId')::UUID,
    (NEW.raw_user_meta_data->>'batchId')::UUID,
    (NEW.raw_user_meta_data->>'sectionId')::UUID
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Task Activity Logging

```sql
-- Log task activities for audit trail
CREATE OR REPLACE FUNCTION handle_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activities (type, title, user_id, metadata)
  VALUES (
    'task',
    CASE
      WHEN TG_OP = 'INSERT' THEN 'New task created: ' || NEW.name
      WHEN TG_OP = 'UPDATE' THEN 'Task updated: ' || NEW.name
      WHEN TG_OP = 'DELETE' THEN 'Task deleted: ' || OLD.name
    END,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.user_id
      ELSE NEW.user_id
    END,
    jsonb_build_object(
      'task_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
      'operation', TG_OP
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER task_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION handle_task_activity();
```

## Row Level Security (RLS) Policies

### Users Table Policies

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile and admins can view all
CREATE POLICY "Users can view own profile or admins can view all" ON users
FOR SELECT USING (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super-admin')
  )
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
FOR UPDATE USING (auth.uid() = id);
```

### Tasks Table Policies

```sql
-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Users can view their own tasks and admin tasks for their section
CREATE POLICY "Users can view own tasks and section admin tasks" ON tasks
FOR SELECT USING (
  auth.uid() = user_id
  OR (
    is_admin_task = true
    AND (
      section_id IS NULL -- Global admin tasks
      OR section_id IN (
        SELECT section_id FROM users WHERE id = auth.uid()
      )
    )
  )
);

-- Users can create their own tasks, admins can create admin tasks
CREATE POLICY "Users can create tasks" ON tasks
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR (
    is_admin_task = true
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() 
      AND role IN ('admin', 'section_admin')
    )
  )
);
```

## Sample Data Structure

### Department Hierarchy Example

```sql
-- Sample departments
INSERT INTO departments (id, name, code) VALUES
('dept-1', 'Computer Science & Engineering', 'CSE'),
('dept-2', 'Electrical & Electronic Engineering', 'EEE');

-- Sample batches
INSERT INTO batches (id, name, department_id, academic_year) VALUES
('batch-1', 'Batch 2021', 'dept-1', '2021'),
('batch-2', 'Batch 2022', 'dept-1', '2022');

-- Sample sections
INSERT INTO sections (id, name, batch_id) VALUES
('section-1', 'Section A', 'batch-1'),
('section-2', 'Section B', 'batch-1');
```

### Sample Users

```sql
-- Sample users with different roles
INSERT INTO users (id, email, name, role, section_id) VALUES
('user-1', 'student1@diu.edu.bd', 'John Doe', 'user', 'section-1'),
('user-2', 'admin1@diu.edu.bd', 'Jane Smith', 'section_admin', 'section-1'),
('user-3', 'superadmin@diu.edu.bd', 'Admin User', 'super-admin', NULL);
```

---

*This database schema documentation provides a comprehensive overview of the PostgreSQL database structure used in NestTask, including tables, relationships, functions, triggers, and security policies.*
