# NestTask - Technical Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Frontend Documentation](#frontend-documentation)
3. [Backend Documentation](#backend-documentation)
4. [Database Schema](#database-schema)
5. [Core Features](#core-features)
6. [Technical Specifications](#technical-specifications)

---

## Project Overview

### Project Description

**NestTask** is a comprehensive task management application designed specifically for educational institutions, particularly universities. It serves as a centralized platform for students, teachers, and administrators to manage academic tasks, assignments, courses, study materials, and class routines efficiently.

### Purpose and Vision

The application aims to:
- Streamline academic task management for students and faculty
- Provide a unified platform for course and study material management
- Enable efficient communication between students and teachers
- Support department-specific workflows and administrative functions
- Offer offline-first capabilities for uninterrupted productivity

### Key Features

#### For Students
- **Task Management**: Create, track, and manage academic tasks with categories (assignments, presentations, quizzes, lab reports, etc.)
- **Course Information**: Access course details, teacher information, class schedules, and Telegram groups
- **Study Materials**: Browse and download course-related materials organized by category
- **Class Routine**: View personalized class schedules and timetables
- **Notifications**: Receive push notifications for new tasks and announcements
- **Offline Support**: Continue working even without internet connectivity

#### For Teachers/Admins
- **Task Assignment**: Create and assign tasks to specific sections or all students
- **Course Management**: Manage course information, schedules, and associated materials
- **Student Management**: View and manage student information within their sections
- **Study Material Upload**: Upload and organize educational resources
- **Routine Management**: Create and manage class schedules
- **Analytics**: Access usage statistics and student engagement metrics

#### For Super Admins
- **System Administration**: Complete control over users, departments, batches, and sections
- **Admin Management**: Create and manage admin accounts with specific permissions
- **Department Structure**: Manage the hierarchical structure of departments, batches, and sections
- **System Analytics**: Comprehensive insights into system usage and performance

### Technology Stack

#### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.2 for fast development and optimized builds
- **Styling**: Tailwind CSS 3.4.1 for utility-first styling
- **UI Components**: 
  - Radix UI for accessible component primitives
  - Lucide React for consistent iconography
  - Framer Motion for smooth animations
- **State Management**: React hooks with custom state management patterns
- **Routing**: React Router DOM 7.3.0 for client-side routing
- **Charts**: Chart.js with React Chart.js 2 for data visualization
- **PWA**: Vite PWA plugin for Progressive Web App capabilities

#### Backend & Database
- **Backend-as-a-Service**: Supabase
- **Database**: PostgreSQL (managed by Supabase)
- **Authentication**: Supabase Auth with JWT tokens
- **Real-time**: Supabase real-time subscriptions
- **Storage**: Supabase Storage for file management
- **Edge Functions**: Supabase Edge Functions for serverless operations

#### Development & Deployment
- **Package Manager**: npm
- **Linting**: ESLint with TypeScript support
- **Code Quality**: TypeScript for type safety
- **Deployment**: Vercel for frontend hosting
- **Version Control**: Git

### Architecture Overview

The application follows a modern, scalable architecture pattern:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   External      │
│   (React/Vite)  │◄──►│   Backend       │◄──►│   Services      │
│                 │    │                 │    │                 │
│ • Components    │    │ • PostgreSQL    │    │ • Vercel        │
│ • Hooks         │    │ • Auth          │    │ • Push Notif.   │
│ • Services      │    │ • Real-time     │    │ • Analytics     │
│ • PWA           │    │ • Storage       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

#### Key Architectural Principles
1. **Component-Based Architecture**: Modular React components for reusability
2. **Service Layer Pattern**: Dedicated service files for API interactions
3. **Custom Hooks**: Encapsulated business logic in reusable hooks
4. **Type Safety**: Comprehensive TypeScript integration
5. **Offline-First**: PWA capabilities with service worker caching
6. **Responsive Design**: Mobile-first approach with progressive enhancement

### System Requirements

#### Development Environment
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Modern Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

#### Production Environment
- **CDN**: Vercel Edge Network for global distribution
- **Database**: Supabase PostgreSQL (managed)
- **Storage**: Supabase Storage for file uploads
- **SSL**: HTTPS enforced for security

#### Browser Support
- **Desktop**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+, Samsung Internet 14+
- **PWA Features**: Service Worker support required for offline functionality

### Dependencies Overview

#### Core Dependencies
- **React Ecosystem**: React, React DOM, React Router
- **UI & Styling**: Tailwind CSS, Radix UI, Framer Motion
- **Data & Charts**: Chart.js, Recharts, React CSV
- **Utilities**: Date-fns, UUID, Lodash utilities
- **PWA**: Workbox for service worker management

#### Development Dependencies
- **Build Tools**: Vite, TypeScript, ESLint
- **Optimization**: Terser, Rollup plugins
- **Analysis**: Bundle analyzer for performance monitoring

---

## Documentation Structure

This documentation is organized into the following sections:

### 📋 [Project Overview](README.md) (This Document)
- Project description and purpose
- Technology stack overview
- Architecture principles
- System requirements

### 🎨 [Frontend Architecture](frontend-architecture.md)
- React component structure and patterns
- State management with custom hooks
- UI/UX design system and responsive design
- PWA implementation and performance optimization
- Routing and navigation patterns

### ⚙️ [Backend Architecture](backend-architecture.md)
- Supabase backend services
- API endpoints and service layer
- Authentication and authorization
- Business logic implementation
- Error handling and validation

### 🗄️ [Database Schema](database-schema.md)
- Complete PostgreSQL schema
- Table relationships and constraints
- Database functions and triggers
- Row Level Security (RLS) policies
- Sample data and migration scripts

### 🚀 [Core Features](core-features.md)
- User roles and permission matrix
- Task management workflows
- Course and study materials system
- Administrative features
- Department-specific functionality

### 🔧 [Technical Specifications](technical-specifications.md)
- File structure and organization
- Configuration files and environment variables
- Build and deployment processes
- Testing strategies and performance optimization
- Security considerations

## Quick Start Guide

### Prerequisites
- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Modern browser with ES2020 support

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd NestTask-V8.5-Department

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

### Environment Setup
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to `.env.local`
3. Run the database migrations from the `supabase/migrations` folder
4. Configure authentication settings in Supabase dashboard

### Development Workflow
1. **Frontend Development**: Use `npm run dev` for hot-reload development
2. **Database Changes**: Create new migrations in `supabase/migrations/`
3. **Testing**: Run `npm run test` for unit tests
4. **Building**: Use `npm run build` for production builds
5. **Deployment**: Deploy to Vercel using `npm run vercel-build`

## Key Features Summary

### 🎯 Task Management
- Personal and administrative task creation
- Category-based organization (assignments, quizzes, projects, etc.)
- Due date tracking and status management
- Google Drive integration for file attachments

### 👥 User Management
- Role-based access control (User, Section Admin, Admin, Super Admin)
- Department/Batch/Section hierarchical organization
- Profile management and activity tracking

### 📚 Academic Features
- Course management with teacher assignments
- Class routine/schedule management
- Study materials upload and organization
- Announcement system

### 📱 Modern Web App
- Progressive Web App (PWA) capabilities
- Offline-first functionality
- Real-time updates and notifications
- Responsive design for all devices

### 🔐 Security & Performance
- Row Level Security (RLS) for data protection
- JWT-based authentication
- Optimized bundle splitting and lazy loading
- Comprehensive error handling

## Architecture Highlights

### Frontend (React + TypeScript)
- **Component Architecture**: Modular, reusable components with clear separation of concerns
- **State Management**: Custom hooks pattern for business logic encapsulation
- **Performance**: Code splitting, lazy loading, and optimized bundle sizes
- **PWA**: Service worker caching, offline support, and installable app experience

### Backend (Supabase)
- **Database**: PostgreSQL with advanced features like RLS, triggers, and functions
- **Authentication**: Built-in auth with role-based permissions
- **Real-time**: WebSocket connections for live updates
- **Storage**: File upload and management capabilities

### Development Experience
- **TypeScript**: Full type safety across the application
- **Modern Tooling**: Vite for fast development and optimized builds
- **Code Quality**: ESLint, Prettier, and comprehensive testing setup
- **Documentation**: Extensive documentation with examples and best practices

## Contributing Guidelines

### Code Standards
- Follow TypeScript best practices
- Use functional components with hooks
- Implement proper error boundaries
- Write comprehensive tests for new features

### Database Changes
- Always create migrations for schema changes
- Test migrations on development environment first
- Document any breaking changes
- Follow naming conventions for tables and columns

### Documentation
- Update relevant documentation for new features
- Include code examples and usage patterns
- Maintain API documentation for service functions
- Document any configuration changes

---

*This comprehensive documentation provides everything needed to understand, develop, and maintain the NestTask application. Each section contains detailed information with practical examples and best practices.*
