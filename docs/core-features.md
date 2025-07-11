# Core Features and User Workflows Documentation

## Overview

NestTask provides a comprehensive set of features designed to support academic task management, course administration, and institutional workflows. The system is built around a role-based architecture that provides different capabilities based on user permissions.

## User Roles and Permissions

### Role Hierarchy

```
Super Admin
    ├── Admin
    │   ├── Section Admin
    │   │   └── User (Student)
    │   └── User (Student)
    └── User (Student)
```

### Permission Matrix

| Feature | User | Section Admin | Admin | Super Admin |
|---------|------|---------------|-------|-------------|
| **Task Management** |
| View own tasks | ✅ | ✅ | ✅ | ✅ |
| Create personal tasks | ✅ | ✅ | ✅ | ✅ |
| View section admin tasks | ✅ | ✅ | ✅ | ✅ |
| Create section tasks | ❌ | ✅ (own section) | ✅ | ✅ |
| Create global tasks | ❌ | ❌ | ✅ | ✅ |
| Delete any task | ❌ | ✅ (section tasks) | ✅ | ✅ |
| **User Management** |
| View own profile | ✅ | ✅ | ✅ | ✅ |
| Edit own profile | ✅ | ✅ | ✅ | ✅ |
| View section users | ❌ | ✅ (own section) | ✅ | ✅ |
| View all users | ❌ | ❌ | ✅ | ✅ |
| Delete users | ❌ | ❌ | ✅ | ✅ |
| Promote to section admin | ❌ | ❌ | ✅ | ✅ |
| **Course Management** |
| View courses | ✅ | ✅ | ✅ | ✅ |
| Create courses | ❌ | ✅ | ✅ | ✅ |
| Edit courses | ❌ | ✅ (own section) | ✅ | ✅ |
| Delete courses | ❌ | ❌ | ✅ | ✅ |
| **Study Materials** |
| View materials | ✅ | ✅ | ✅ | ✅ |
| Upload materials | ❌ | ✅ | ✅ | ✅ |
| Delete materials | ❌ | ✅ (own uploads) | ✅ | ✅ |
| **System Administration** |
| Manage departments | ❌ | ❌ | ❌ | ✅ |
| Manage admins | ❌ | ❌ | ❌ | ✅ |
| View system analytics | ❌ | ❌ | ✅ | ✅ |
| System configuration | ❌ | ❌ | ❌ | ✅ |

## Core Features

### 1. Task Management System

#### Task Categories
The system supports multiple task categories to organize academic work:

- **Assignment**: Written assignments and homework
- **Presentation**: Class presentations and seminars
- **Quiz**: Short assessments and pop quizzes
- **Lab Report**: Laboratory experiment reports
- **Lab Final**: Final laboratory examinations
- **Lab Performance**: Ongoing lab performance assessments
- **Project**: Long-term projects and capstone work
- **Midterm**: Mid-semester examinations
- **Final Exam**: End-of-semester examinations
- **Documents**: General document submissions
- **BLC**: Blended Learning Center related tasks
- **Groups**: Group work and collaborative tasks
- **Others**: Miscellaneous academic tasks

#### Task Status Workflow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  My Tasks   │───▶│ In Progress │───▶│  Completed  │
│ (Created)   │    │ (Working)   │    │  (Finished) │
└─────────────┘    └─────────────┘    └─────────────┘
```

#### Task Properties
- **Name**: Descriptive title of the task
- **Description**: Detailed instructions or requirements
- **Category**: Classification of the task type
- **Due Date**: Deadline for completion
- **Status**: Current state of the task
- **Priority**: High, Medium, or Low (future enhancement)
- **Google Drive Links**: Associated file links
- **Section Assignment**: For admin-created tasks

### 2. User Management System

#### User Registration Workflow

```
1. User visits registration page
2. Enters personal information:
   - Name, Email (@diu.edu.bd required)
   - Phone, Student ID
   - Department, Batch, Section selection
3. System validates email domain
4. Creates auth.users record
5. Trigger creates public.users profile
6. User receives confirmation email
7. Account activated upon email verification
```

#### Profile Management
- **Personal Information**: Name, email, phone, student ID
- **Academic Information**: Department, batch, section assignment
- **Activity Tracking**: Last active timestamp, login history
- **Role Management**: Automatic role assignment based on permissions

#### Section-Based Organization
Users are organized hierarchically:
- **Department**: Top-level academic division (e.g., CSE, EEE)
- **Batch**: Academic year group (e.g., Batch 2021, Batch 2022)
- **Section**: Class division within batch (e.g., Section A, Section B)

### 3. Course Management System

#### Course Information Structure
```typescript
interface Course {
  id: string;
  name: string;           // Course title
  code: string;           // Course code (e.g., CSE101)
  teacher: string;        // Primary instructor name
  teacherId?: string;     // Reference to teacher record
  classTimes: ClassTime[]; // Schedule information
  telegramGroup?: string; // Telegram group link
  blcLink?: string;       // BLC course link
  blcEnrollKey?: string;  // BLC enrollment key
  credit?: number;        // Credit hours
  section?: string;       // Associated section
  sectionId?: string;     // Section reference
}
```

#### Class Schedule Management
- **Day and Time**: Weekly schedule slots
- **Classroom**: Physical or virtual location
- **Teacher Assignment**: Instructor for each slot
- **Section Specific**: Different schedules per section

### 4. Study Materials System

#### Material Categories
- **Task**: Task-related documents and resources
- **Presentation**: Lecture slides and presentations
- **Assignment**: Assignment instructions and templates
- **Quiz**: Quiz materials and practice questions
- **Lab Report**: Lab report templates and examples
- **Documents**: General course documents
- **BLC**: Blended Learning Center materials
- **Class Slide**: Lecture presentations
- **Others**: Miscellaneous educational resources

#### File Management
- **Multiple File Support**: Upload multiple files per material
- **Google Drive Integration**: Link to Google Drive files
- **Category Organization**: Automatic categorization
- **Course Association**: Link materials to specific courses

### 5. Class Routine System

#### Routine Structure
```typescript
interface RoutineSlot {
  id: string;
  dayOfWeek: number;      // 0-6 (Sunday-Saturday)
  startTime: string;      // HH:MM format
  endTime: string;        // HH:MM format
  courseId: string;       // Associated course
  teacherId: string;      // Assigned teacher
  roomNumber?: string;    // Classroom location
  sectionId: string;      // Target section
}
```

#### Features
- **Weekly View**: Complete week schedule display
- **Section-Specific**: Different routines per section
- **Teacher Assignment**: Automatic teacher scheduling
- **Room Management**: Classroom allocation
- **Conflict Detection**: Prevent scheduling conflicts

### 6. Notification System

#### Notification Types
- **Task Notifications**: New task assignments, due date reminders
- **Announcement Notifications**: Important announcements
- **System Notifications**: Account updates, system maintenance
- **Course Notifications**: Course updates, material uploads

#### Delivery Channels
- **In-App Notifications**: Real-time notification center
- **Push Notifications**: Browser/PWA push notifications
- **Email Notifications**: Critical updates via email

### 7. Administrative Features

#### Admin Dashboard Components
- **User Statistics**: Total users, active users, new registrations
- **Task Analytics**: Task completion rates, category distribution
- **Course Management**: Course creation, editing, deletion
- **User Management**: User roles, permissions, section assignments
- **System Monitoring**: Performance metrics, error tracking

#### Section Admin Capabilities
- **Section User Management**: View and manage section users
- **Section Task Assignment**: Create tasks for section students
- **Section Course Management**: Manage section-specific courses
- **Section Analytics**: Performance metrics for their section

## User Workflows

### 1. Student Daily Workflow

```
1. Login to application
2. View dashboard with:
   - Today's tasks
   - Upcoming deadlines
   - Recent announcements
3. Check task list by category
4. Update task status as work progresses
5. Access course materials when needed
6. Check class routine for schedule
7. Receive notifications for new assignments
```

### 2. Task Creation Workflow (Student)

```
1. Navigate to task creation form
2. Fill in task details:
   - Name and description
   - Select category
   - Set due date
   - Add Google Drive links (optional)
3. Submit task
4. Task appears in "My Tasks" status
5. Update status as work progresses
6. Mark as completed when finished
```

### 3. Admin Task Assignment Workflow

```
1. Admin/Section Admin accesses task manager
2. Creates new task with:
   - Task details and requirements
   - Target section selection
   - Due date and priority
   - Associated materials/links
3. System validates permissions
4. Task is created and assigned to section
5. Notifications sent to target users
6. Task appears in students' task lists
7. Admin can monitor completion status
```

### 4. Course Management Workflow

```
1. Admin navigates to course management
2. Creates new course with:
   - Course name and code
   - Teacher assignment
   - Class schedule
   - Section assignment
   - Additional resources (Telegram, BLC)
3. Course is published to students
4. Students can view course information
5. Study materials can be uploaded
6. Routine is automatically updated
```

### 5. User Registration and Onboarding

```
1. New user visits registration page
2. Selects department from dropdown
3. Selects batch based on department
4. Selects section based on batch
5. Fills personal information
6. Submits registration form
7. Email verification sent
8. User confirms email
9. Account activated
10. User can login and access features
```

### 6. Section Admin Promotion Workflow

```
1. Admin identifies suitable user for promotion
2. Accesses user management interface
3. Selects user and target section
4. Initiates promotion process
5. System validates permissions
6. User role updated to 'section_admin'
7. User gains section-specific permissions
8. Notification sent to promoted user
9. User can access admin features for their section
```

## Department-Specific Features

### Academic Structure Support
- **Multi-Department**: Support for multiple academic departments
- **Batch Management**: Academic year-based organization
- **Section Division**: Class-level organization within batches
- **Cross-Section Tasks**: Admin tasks can span multiple sections

### Hierarchical Data Access
- **Department Level**: Super admins see all departments
- **Batch Level**: Admins see all batches in their scope
- **Section Level**: Section admins see only their section
- **User Level**: Students see only their own data

### Reporting and Analytics
- **Department Statistics**: User distribution, activity metrics
- **Batch Performance**: Academic progress tracking
- **Section Analytics**: Class-specific performance metrics
- **Individual Progress**: Personal task completion rates

## Integration Features

### Google Drive Integration
- **File Linking**: Direct links to Google Drive files
- **Multiple Links**: Support for multiple file links per task/material
- **Access Control**: Proper sharing permissions required

### Telegram Integration
- **Group Links**: Direct links to course Telegram groups
- **Communication**: Seamless communication channel integration

### BLC (Blended Learning Center) Integration
- **Course Links**: Direct access to BLC courses
- **Enrollment Keys**: Automatic enrollment key management
- **Resource Synchronization**: Sync with BLC materials

### PWA Features
- **Offline Access**: Continue working without internet
- **Push Notifications**: Real-time updates even when app is closed
- **Install Prompt**: Native app-like installation
- **Background Sync**: Sync data when connection is restored

---

*This core features documentation provides a comprehensive overview of all major application functions, user workflows, and department-specific capabilities in the NestTask system.*
