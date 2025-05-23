
nehalindex002@gmail.com

Here’s a **`requirements.md`** file that outlines everything needed for your university-focused web app upgrade — covering authentication, authorization, database schema, role management, UI requirements, and policies.

---

### 📄 `requirements.md`

---

## 📌 Project Title:

**University Academic Management Web App - Role-Based Access Control**

---

## ✅ Functional Requirements

### 1. **User Authentication**

* Signup with:

  * Full Name
  * DIU Email (must end with `@diu.edu.bd`)
  * Password
  * Department (dropdown)
  * Batch (dropdown; filtered by department)
  * Section (dropdown; filtered by batch)
* Email & Password stored securely in Supabase Auth.
* JWT tokens for session persistence.

### 2. **User Roles**

* `user`: View-only access to their section’s tasks/routines.
* `section_admin`: CRUD permissions for their section’s users/tasks/routines.
* `super_admin`: Full access to all data and permissions.

### 3. **Role-Based Dashboards**

* **User (Student)**:

  * View their section's tasks and routines.
* **Section Admin** (`AdminDashboard.tsx`):

  * Manage users (view, promote/demote within section)
  * CRUD tasks
  * CRUD routines
* **Super Admin Dashboard**:

  * Manage departments, batches, sections
  * Promote/demote any user
  * Edit/delete all tasks/routines

---

## 🗃️ Database Schema (PostgreSQL via Supabase)

```ts
Department {
  id: uuid
  name: string // CSE, SWE, etc.
  created_at: timestamp
}

Batch {
  id: uuid
  name: string // Batch 50–70
  department_id: uuid (FK to Department)
  created_at: timestamp
}

Section {
  id: uuid
  name: string // Section A–Z
  batch_id: uuid (FK to Batch)
  created_at: timestamp
}

User {
  id: uuid (same as Supabase Auth UID)
  email: string
  password: string (hashed)
  role: 'user' | 'section_admin' | 'super_admin'
  department_id: uuid (FK)
  batch_id: uuid (FK)
  section_id: uuid (FK)
  created_at: timestamp
}

Task {
  id: uuid
  title: string
  description: text
  due_date: timestamp
  section_id: uuid (FK)
  created_by: uuid (FK to User)
  created_at: timestamp
}

Routine {
  id: uuid
  title: string
  schedule: jsonb
  section_id: uuid (FK)
  created_by: uuid (FK to User)
  created_at: timestamp
}
```

---

## 🔐 Authorization Rules

### Supabase RLS Policies:

#### User Table

* Only Super Admin can view and manage all users.
* Section Admin can view/edit users from their section.
* Users can only access their own profile.

#### Task / Routine

* Section Admins can CRUD only for their section.
* Users can only read tasks/routines from their own section.
* Super Admin can access all.

---

## 💻 Frontend Requirements

### Navigation:

* Show/hide dashboard links based on role.
* Protect routes using role-based guards.

### UI Components:

* Dropdowns populated dynamically for:

  * Department → Batch → Section
* Realtime updates using Supabase subscriptions.
* Responsive UI using Tailwind CSS (or any preferred framework).
* Form validation:

  * Required fields
  * Valid DIU email (`@diu.edu.bd`)
  * Password strength (optional)

---

## 🔍 Testing Scenarios

| Test Case                                  | Expected Behavior |
| ------------------------------------------ | ----------------- |
| Signup with invalid email                  | Blocked           |
| User from Section A views Section B tasks  | Blocked           |
| Section Admin creates task for own section | Allowed           |
| Super Admin edits routine from any section | Allowed           |
| User accesses Admin Dashboard              | Blocked           |

---

## ⚙️ Technologies

* **Frontend**: React + TypeScript
* **Backend/Auth**: Supabase (Auth, DB, Policies)
* **Styling**: Tailwind CSS
* **State Management**: (Optional) Redux or Zustand
* **Form Handling**: React Hook Form + Zod/Yup
* **Notifications**: Toast / Snackbar
* **Realtime**: Supabase subscriptions

---
User= app.tsx
Section admin = AdminDashboard.tsx
Super Admin = SuperAdminDashboard.tsx

Would you like this file exported as `requirements.md` or formatted as a downloadable file?
