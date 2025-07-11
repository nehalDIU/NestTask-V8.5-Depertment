# Backend Architecture Documentation

## Overview

NestTask uses Supabase as a Backend-as-a-Service (BaaS) solution, providing a PostgreSQL database, authentication, real-time subscriptions, storage, and edge functions. The backend architecture follows a service-oriented approach with clear separation of concerns.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ PostgreSQL  │  │    Auth     │  │   Storage   │         │
│  │  Database   │  │   Service   │  │   Service   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Real-time   │  │    Edge     │  │     API     │         │
│  │Subscriptions│  │  Functions  │  │   Gateway   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Frontend Services                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Auth     │  │    Task     │  │   Course    │         │
│  │  Service    │  │   Service   │  │   Service   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    User     │  │   Admin     │  │  Department │         │
│  │  Service    │  │  Service    │  │   Service   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Service Layer Architecture

### Service Organization

The frontend service layer is organized into domain-specific services:

```
src/services/
├── auth.service.ts          # Authentication and user management
├── task.service.ts          # Task CRUD operations
├── course.service.ts        # Course and study materials
├── user.service.ts          # User profile management
├── admin.service.ts         # Admin operations
├── department.service.ts    # Department/batch/section management
├── teacher.service.ts       # Teacher information management
├── routine.service.ts       # Class routine management
├── announcement.service.ts  # Announcement system
└── telegram.service.ts      # Telegram integration
```

### Service Pattern

Each service follows a consistent pattern:

```typescript
// Example: task.service.ts
import { supabase } from '../lib/supabase';
import type { Task, NewTask } from '../types/task';

export async function fetchTasks(userId: string): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .or(`user_id.eq.${userId},is_admin_task.eq.true`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapTaskFromDB);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw new Error('Failed to fetch tasks');
  }
}

export async function createTask(task: NewTask, sectionId?: string): Promise<Task> {
  // Implementation details...
}

// Data mapping function
function mapTaskFromDB(dbTask: any): Task {
  return {
    id: dbTask.id,
    name: dbTask.name,
    category: dbTask.category,
    dueDate: dbTask.due_date,
    description: dbTask.description,
    status: dbTask.status,
    createdAt: dbTask.created_at,
    isAdminTask: dbTask.is_admin_task,
    sectionId: dbTask.section_id,
    googleDriveLinks: dbTask.google_drive_links || []
  };
}
```

## Authentication System

### Authentication Flow

```typescript
// Authentication service implementation
export async function loginUser({ email, password }: LoginCredentials): Promise<User> {
  try {
    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) throw authError;

    // 2. Fetch user profile from public.users table
    const { data: profile, error: profileError } = await supabase
      .from('users_with_full_info')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) throw profileError;

    // 3. Map database user to application user type
    return mapDbUserToUser(profile);
  } catch (error) {
    console.error('Login error:', error);
    throw new Error(getAuthErrorMessage(error));
  }
}
```

### User Roles and Permissions

The system supports four user roles with hierarchical permissions:

```typescript
export type UserRole = 'user' | 'section_admin' | 'admin' | 'super-admin';

// Role-based access control
const ROLE_PERMISSIONS = {
  'user': [
    'view_own_tasks',
    'create_own_tasks',
    'view_courses',
    'view_study_materials',
    'view_routine'
  ],
  'section_admin': [
    ...ROLE_PERMISSIONS.user,
    'manage_section_users',
    'create_section_tasks',
    'manage_section_courses',
    'upload_study_materials'
  ],
  'admin': [
    ...ROLE_PERMISSIONS.section_admin,
    'manage_all_users',
    'create_global_tasks',
    'manage_all_courses',
    'manage_routine',
    'view_analytics'
  ],
  'super-admin': [
    ...ROLE_PERMISSIONS.admin,
    'manage_admins',
    'manage_departments',
    'system_configuration',
    'view_system_analytics'
  ]
};
```

### Session Management

```typescript
// Session persistence and management
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id).then(setUser);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          setUser(profile);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
```

## API Endpoints and Operations

### Task Management API

```typescript
// Task CRUD operations
interface TaskAPI {
  // Fetch tasks for a user (includes admin tasks)
  fetchTasks(userId: string): Promise<Task[]>;
  
  // Create a new task
  createTask(task: NewTask, sectionId?: string): Promise<Task>;
  
  // Update existing task
  updateTask(taskId: string, updates: Partial<Task>): Promise<Task>;
  
  // Delete task
  deleteTask(taskId: string): Promise<void>;
  
  // Bulk operations for admin
  bulkCreateTasks(tasks: NewTask[], sectionId?: string): Promise<Task[]>;
  bulkUpdateTasks(updates: Array<{id: string, updates: Partial<Task>}>): Promise<void>;
}
```

### Course Management API

```typescript
interface CourseAPI {
  // Course operations
  fetchCourses(): Promise<Course[]>;
  createCourse(course: NewCourse): Promise<Course>;
  updateCourse(courseId: string, updates: Partial<Course>): Promise<Course>;
  deleteCourse(courseId: string): Promise<void>;
  
  // Study materials
  fetchStudyMaterials(courseId?: string): Promise<StudyMaterial[]>;
  createStudyMaterial(material: NewStudyMaterial): Promise<StudyMaterial>;
  updateStudyMaterial(materialId: string, updates: Partial<StudyMaterial>): Promise<StudyMaterial>;
  deleteStudyMaterial(materialId: string): Promise<void>;
}
```

### User Management API

```typescript
interface UserAPI {
  // User profile operations
  fetchUsers(): Promise<User[]>;
  fetchUserProfile(userId: string): Promise<User>;
  updateUserProfile(userId: string, updates: Partial<User>): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  
  // Admin operations
  promoteUserToSectionAdmin(userId: string, sectionId: string): Promise<void>;
  demoteUser(userId: string): Promise<void>;
  
  // Statistics
  fetchUserStats(): Promise<UserStats>;
}
```

### Admin Management API

```typescript
interface AdminAPI {
  // Admin user management
  fetchAdminUsers(): Promise<AdminUser[]>;
  createAdminUser(admin: NewAdminUser): Promise<AdminUser>;
  updateAdminPermissions(adminId: string, permissions: string[]): Promise<void>;
  deactivateAdmin(adminId: string): Promise<void>;
  
  // System analytics
  fetchAdminStats(): Promise<AdminStats>;
  fetchSystemLogs(): Promise<AdminLog[]>;
  
  // Department management
  fetchDepartments(): Promise<Department[]>;
  createDepartment(department: NewDepartment): Promise<Department>;
  fetchBatches(departmentId: string): Promise<Batch[]>;
  fetchSections(batchId: string): Promise<Section[]>;
}
```

## Business Logic Implementation

### Task Assignment Logic

```typescript
export async function createTask(task: NewTask, sectionId?: string): Promise<Task> {
  try {
    // 1. Validate user permissions
    const { data: { user } } = await supabase.auth.getUser();
    const userRole = await getUserRole(user.id);
    
    // 2. Determine task scope based on role and section
    const isAdminTask = ['admin', 'section_admin'].includes(userRole);
    const targetSectionId = userRole === 'section_admin' ? sectionId : null;
    
    // 3. Prepare task data
    const taskData = {
      ...task,
      user_id: user.id,
      is_admin_task: isAdminTask,
      section_id: targetSectionId,
      created_at: new Date().toISOString()
    };
    
    // 4. Insert task into database
    const { data, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();
    
    if (error) throw error;
    
    // 5. Send notifications if admin task
    if (isAdminTask) {
      await sendTaskNotifications(data);
    }
    
    return mapTaskFromDB(data);
  } catch (error) {
    console.error('Error creating task:', error);
    throw new Error('Failed to create task');
  }
}
```

### Permission Validation

```typescript
export async function validatePermission(
  userId: string, 
  action: string, 
  resource?: string
): Promise<boolean> {
  try {
    // Get user role and section
    const { data: user } = await supabase
      .from('users')
      .select('role, section_id')
      .eq('id', userId)
      .single();
    
    if (!user) return false;
    
    // Check role-based permissions
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    
    // Basic permission check
    if (userPermissions.includes(action)) {
      return true;
    }
    
    // Section-specific permission check
    if (user.role === 'section_admin' && resource) {
      return await validateSectionPermission(userId, action, resource);
    }
    
    return false;
  } catch (error) {
    console.error('Permission validation error:', error);
    return false;
  }
}
```

### Data Synchronization

```typescript
// Real-time data synchronization
export function useRealtimeData<T>(
  table: string,
  filter?: string,
  mapper?: (data: any) => T
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial data fetch
    const fetchData = async () => {
      try {
        let query = supabase.from(table).select('*');
        if (filter) query = query.filter(filter);
        
        const { data: initialData, error } = await query;
        if (error) throw error;
        
        const mappedData = mapper ? initialData.map(mapper) : initialData;
        setData(mappedData);
      } catch (error) {
        console.error(`Error fetching ${table}:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up real-time subscription
    const subscription = supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table },
        (payload) => {
          const mappedPayload = mapper ? mapper(payload.new) : payload.new;
          
          switch (payload.eventType) {
            case 'INSERT':
              setData(prev => [mappedPayload, ...prev]);
              break;
            case 'UPDATE':
              setData(prev => prev.map(item => 
                item.id === payload.new.id ? mappedPayload : item
              ));
              break;
            case 'DELETE':
              setData(prev => prev.filter(item => item.id !== payload.old.id));
              break;
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [table, filter]);

  return { data, loading };
}
```

## Error Handling and Validation

### Error Handling Strategy

```typescript
// Centralized error handling
export class APIError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function handleAPIError(error: any): never {
  console.error('API Error:', error);
  
  if (error.code === 'PGRST301') {
    throw new APIError('Resource not found', 'NOT_FOUND', 404);
  }
  
  if (error.code === '23505') {
    throw new APIError('Duplicate entry', 'DUPLICATE', 409);
  }
  
  if (error.message?.includes('JWT')) {
    throw new APIError('Authentication required', 'UNAUTHORIZED', 401);
  }
  
  throw new APIError(
    error.message || 'An unexpected error occurred',
    'UNKNOWN',
    500,
    error
  );
}
```

### Input Validation

```typescript
// Validation schemas
export const taskValidationSchema = {
  name: {
    required: true,
    minLength: 1,
    maxLength: 255
  },
  category: {
    required: true,
    enum: ['assignment', 'presentation', 'quiz', 'lab-report', 'others']
  },
  dueDate: {
    required: true,
    type: 'date',
    future: true
  },
  description: {
    required: false,
    maxLength: 1000
  }
};

export function validateTask(task: NewTask): ValidationResult {
  const errors: string[] = [];
  
  if (!task.name || task.name.trim().length === 0) {
    errors.push('Task name is required');
  }
  
  if (task.name && task.name.length > 255) {
    errors.push('Task name must be less than 255 characters');
  }
  
  if (!task.category) {
    errors.push('Task category is required');
  }
  
  if (!task.dueDate) {
    errors.push('Due date is required');
  } else if (new Date(task.dueDate) < new Date()) {
    errors.push('Due date must be in the future');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

## Performance Optimization

### Caching Strategy

```typescript
// Service-level caching
class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttl: number = 300000) { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  invalidate(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new CacheManager();
```

### Query Optimization

```typescript
// Optimized queries with selective fields
export async function fetchTasksOptimized(userId: string): Promise<Task[]> {
  const cacheKey = `tasks_${userId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id,
      name,
      category,
      due_date,
      status,
      is_admin_task,
      section_id,
      created_at
    `) // Only select needed fields
    .or(`user_id.eq.${userId},is_admin_task.eq.true`)
    .order('created_at', { ascending: false })
    .limit(100); // Pagination
  
  if (error) throw error;
  
  const tasks = (data || []).map(mapTaskFromDB);
  cache.set(cacheKey, tasks);
  
  return tasks;
}
```

---

*This backend architecture documentation covers the service layer, authentication, API design, business logic, and performance optimization strategies used in the NestTask application.*
