# Frontend Architecture Documentation

## Overview

The NestTask frontend is built using React 18 with TypeScript, following modern development practices and patterns. The architecture emphasizes component reusability, type safety, performance optimization, and progressive web app capabilities.

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── admin/           # Admin-specific components
│   ├── auth/            # Authentication components
│   ├── calendar/        # Calendar-related components
│   ├── navigation/      # Navigation components
│   ├── profile/         # User profile components
│   ├── routine/         # Class routine components
│   ├── search/          # Search functionality
│   ├── settings/        # Settings components
│   ├── study-materials/ # Study materials components
│   ├── task/            # Task management components
│   └── ui/              # Base UI components
├── hooks/               # Custom React hooks
├── pages/               # Page-level components
├── services/            # API service layer
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── constants/           # Application constants
└── lib/                 # Third-party library configurations
```

## Component Architecture

### Component Hierarchy

The application follows a hierarchical component structure:

```
App.tsx (Root)
├── Navigation.tsx
├── BottomNavigation.tsx
├── Pages/
│   ├── HomePage.tsx
│   ├── AdminDashboard.tsx
│   ├── CoursePage.tsx
│   ├── StudyMaterialsPage.tsx
│   ├── RoutinePage.tsx
│   ├── SearchPage.tsx
│   └── UpcomingPage.tsx
└── InstallPWA.tsx
```

### Key Components

#### Core Components

**App.tsx**
- Root component managing global state and routing
- Handles authentication flow and user role-based rendering
- Implements lazy loading for performance optimization
- Manages offline/online state transitions

**Navigation.tsx**
- Top navigation bar with user profile and notifications
- Responsive design with mobile-optimized layout
- Real-time notification badges
- Task statistics display

**BottomNavigation.tsx**
- Mobile-first bottom navigation
- Page switching with smooth transitions
- Today's task count indicator
- Notification badges

#### Page Components

**HomePage.tsx**
- Dashboard with task overview and statistics
- Category-based task filtering
- Quick task creation interface
- Responsive grid layout for different screen sizes

**AdminDashboard.tsx**
- Role-based admin interface (admin, section_admin, super-admin)
- User management with section-specific filtering
- Task assignment and management
- Analytics and reporting features

**CoursePage.tsx**
- Course listing with search and filter capabilities
- Course creation and editing (admin only)
- Integration with teacher and study materials
- Responsive card-based layout

#### Specialized Components

**TaskList.tsx**
- Virtualized list for performance with large datasets
- Real-time updates and optimistic UI
- Drag-and-drop functionality (future enhancement)
- Category-based filtering and sorting

**VirtualizedList.tsx**
- High-performance list rendering using react-window
- Handles thousands of items efficiently
- Dynamic item height calculation
- Scroll position persistence

### Component Design Patterns

#### 1. Container/Presentational Pattern
```typescript
// Container Component (Logic)
const TaskContainer: React.FC = () => {
  const { tasks, loading, createTask } = useTasks();
  return <TaskList tasks={tasks} loading={loading} onCreateTask={createTask} />;
};

// Presentational Component (UI)
const TaskList: React.FC<TaskListProps> = ({ tasks, loading, onCreateTask }) => {
  return (
    <div className="task-list">
      {tasks.map(task => <TaskItem key={task.id} task={task} />)}
    </div>
  );
};
```

#### 2. Compound Component Pattern
```typescript
const TaskCategories = {
  Root: TaskCategoriesRoot,
  Item: TaskCategoryItem,
  Badge: TaskCategoryBadge
};

// Usage
<TaskCategories.Root>
  <TaskCategories.Item category="assignment">
    <TaskCategories.Badge count={5} />
    Assignments
  </TaskCategories.Item>
</TaskCategories.Root>
```

#### 3. Render Props Pattern
```typescript
const DataFetcher: React.FC<DataFetcherProps> = ({ children, endpoint }) => {
  const { data, loading, error } = useApi(endpoint);
  return children({ data, loading, error });
};

// Usage
<DataFetcher endpoint="/api/tasks">
  {({ data, loading, error }) => (
    loading ? <LoadingSpinner /> : <TaskList tasks={data} />
  )}
</DataFetcher>
```

## State Management

### Custom Hooks Architecture

The application uses a custom hooks-based state management approach:

#### Core Hooks

**useAuth.ts**
```typescript
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Authentication methods
  const login = async (credentials: LoginCredentials) => { /* ... */ };
  const logout = async () => { /* ... */ };
  const signup = async (credentials: SignupCredentials) => { /* ... */ };

  return { user, loading, error, login, logout, signup };
}
```

**useTasks.ts**
```typescript
export function useTasks(userId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  // CRUD operations
  const createTask = async (task: NewTask) => { /* ... */ };
  const updateTask = async (id: string, updates: Partial<Task>) => { /* ... */ };
  const deleteTask = async (id: string) => { /* ... */ };

  return { tasks, loading, createTask, updateTask, deleteTask };
}
```

#### State Management Patterns

1. **Local State**: Component-specific state using `useState`
2. **Shared State**: Custom hooks for cross-component state
3. **Server State**: API data management with caching
4. **Global State**: User authentication and app-wide settings

### Data Flow

```
User Action → Component → Custom Hook → Service Layer → Supabase → Database
     ↓
UI Update ← State Update ← Response Processing ← API Response ← Query Result
```

## Routing and Navigation

### React Router Configuration

```typescript
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/courses", element: <CoursePage /> },
      { path: "/study-materials", element: <StudyMaterialsPage /> },
      { path: "/routine", element: <RoutinePage /> },
      { path: "/search", element: <SearchPage /> },
      { path: "/upcoming", element: <UpcomingPage /> }
    ]
  },
  { path: "/auth", element: <AuthPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> }
]);
```

### Navigation Types

```typescript
export type NavPage = 
  | 'home' 
  | 'upcoming' 
  | 'search' 
  | 'courses' 
  | 'study-materials' 
  | 'routine';
```

### Route Protection

```typescript
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" />;
  
  return <>{children}</>;
};
```

## UI/UX Design Patterns

### Design System

#### Color Palette
- **Primary**: Blue (#0284c7) - Actions, links, primary buttons
- **Secondary**: Gray (#6b7280) - Secondary text, borders
- **Success**: Green (#10b981) - Success states, completed tasks
- **Warning**: Yellow (#f59e0b) - Warnings, pending states
- **Error**: Red (#ef4444) - Error states, destructive actions

#### Typography Scale
```css
/* Tailwind CSS classes used */
.text-xs    /* 12px - Small labels */
.text-sm    /* 14px - Body text */
.text-base  /* 16px - Default text */
.text-lg    /* 18px - Subheadings */
.text-xl    /* 20px - Headings */
.text-2xl   /* 24px - Page titles */
```

#### Spacing System
- **Base unit**: 4px (0.25rem)
- **Common spacings**: 8px, 12px, 16px, 24px, 32px, 48px
- **Container max-width**: 1280px (max-w-7xl)

### Responsive Design

#### Breakpoint Strategy
```css
/* Mobile First Approach */
/* Default: 0px - 639px (Mobile) */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Small desktops */
xl: 1280px  /* Large desktops */
2xl: 1536px /* Extra large screens */
```

#### Mobile Optimizations
- Touch-friendly button sizes (minimum 44px)
- Optimized scroll behavior
- Pull-to-refresh functionality
- Bottom navigation for easy thumb access
- Responsive typography scaling

### Animation and Transitions

#### Framer Motion Integration
```typescript
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.3
};
```

#### CSS Animations
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}
```

## Progressive Web App (PWA) Features

### Service Worker Implementation

The application includes comprehensive PWA capabilities:

#### Caching Strategy
```typescript
// Cache-first for static assets
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })]
  })
);

// Network-first for API calls
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3
  })
);
```

#### Offline Functionality
- **Offline Page**: Custom offline page when network is unavailable
- **Background Sync**: Queue failed requests for retry when online
- **Cache Management**: Intelligent caching of critical resources
- **Update Notifications**: Prompt users when new version is available

#### Installation Features
```typescript
const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User ${outcome} the install prompt`);
    }
  };

  return showInstallButton ? (
    <button onClick={handleInstall}>Install App</button>
  ) : null;
};
```

### Manifest Configuration
```json
{
  "name": "NestTask",
  "short_name": "NestTask",
  "description": "A modern task management application",
  "theme_color": "#0284c7",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## Performance Optimization

### Code Splitting and Lazy Loading

```typescript
// Lazy loading of page components
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CoursePage = lazy(() => import('./pages/CoursePage'));

// Usage with Suspense
<Suspense fallback={<LoadingScreen />}>
  <AdminDashboard />
</Suspense>
```

### Bundle Optimization

```typescript
// Vite configuration for chunk splitting
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-components': ['@radix-ui/react-dialog', 'framer-motion'],
          'supabase': ['@supabase/supabase-js'],
          'charts': ['chart.js', 'react-chartjs-2']
        }
      }
    }
  }
});
```

### Performance Monitoring

- **Bundle Analysis**: Rollup plugin visualizer for bundle size analysis
- **Core Web Vitals**: Monitoring LCP, FID, and CLS metrics
- **Error Tracking**: Comprehensive error boundary implementation
- **Performance Profiling**: React DevTools integration for development

---

*This frontend architecture documentation provides a comprehensive overview of the React-based frontend implementation. For specific component APIs and implementation details, refer to the individual component documentation files.*
