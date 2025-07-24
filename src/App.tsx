import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTasks } from './hooks/useTasks';
import { useUsers } from './hooks/useUsers';
import { useNotifications } from './hooks/useNotifications';
import { AuthPage } from './pages/AuthPage';
import { LoadingScreen } from './components/LoadingScreen';
import { Navigation } from './components/Navigation';
import { BottomNavigation } from './components/BottomNavigation';
import { InstallPWA } from './components/InstallPWA';
import { isSameDay } from './utils/dateUtils';
import { InstantTransition } from './components/InstantTransition';
import type { NavPage } from './types/navigation';
import type { TaskCategory } from './types/task';
import type { Task } from './types/task';
import type { User } from './types/user';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { supabase, testConnection } from './lib/supabase';
import { HomePage } from './pages/HomePage';

// Page import functions
const importAdminDashboard = () => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard }));
const importSuperAdminDashboard = () => import('./components/admin/super/SuperAdminDashboard').then(module => ({ default: module.SuperAdminDashboard }));
const importUpcomingPage = () => import('./pages/UpcomingPage').then(module => ({ default: module.UpcomingPage }));
const importSearchPage = () => import('./pages/SearchPage').then(module => ({ default: module.SearchPage }));
const importCoursePage = () => import('./pages/CoursePage').then(module => ({ default: module.CoursePage }));
const importStudyMaterialsPage = () => import('./pages/StudyMaterialsPage').then(module => ({ default: module.StudyMaterialsPage }));
const importRoutinePage = () => import('./pages/RoutinePage').then(module => ({ default: module.RoutinePage }));
const importLectureSlidesPage = () => import('./pages/LectureSlidesPage').then(module => ({ default: module.LectureSlidesPage }));

// Lazy-loaded components
const AdminDashboard = lazy(importAdminDashboard);
const SuperAdminDashboard = lazy(importSuperAdminDashboard);
const UpcomingPage = lazy(importUpcomingPage);
const SearchPage = lazy(importSearchPage);
const CoursePage = lazy(importCoursePage);
const StudyMaterialsPage = lazy(importStudyMaterialsPage);
const RoutinePage = lazy(importRoutinePage);
const LectureSlidesPage = lazy(importLectureSlidesPage);

type StatFilter = 'all' | 'overdue' | 'in-progress' | 'completed';

export default function App() {
  // Always call all hooks first, regardless of any conditions
  const { user, loading: authLoading, error: authError, login, signup, logout, forgotPassword } = useAuth();
  
  // Debug user role
  useEffect(() => {
    if (user) {
      console.log('Current user role:', user.role);
      console.log('Complete user object:', user);
    }
  }, [user]);
  
  const { users, loading: usersLoading, deleteUser } = useUsers();
  const { 
    tasks, 
    loading: tasksLoading, 
    createTask, 
    updateTask, 
    deleteTask,
    refreshTasks,
  } = useTasks(user?.id);
  
  // Create handler functions for admin dashboard
  const handleDeleteUser = useCallback((userId: string) => {
    return deleteUser(userId);
  }, [deleteUser]);
  
  const handleCreateTask = useCallback((task: any, sectionId?: string) => {
    return createTask(task, sectionId);
  }, [createTask]);
  
  const handleDeleteTask = useCallback((taskId: string) => {
    return deleteTask(taskId);
  }, [deleteTask]);
  
  const handleUpdateTask = useCallback((taskId: string, updates: any) => {
    return updateTask(taskId, updates);
  }, [updateTask]);

  const { 
    notifications, 
    unreadCount,
    markAsRead, 
    markAllAsRead, 
    clearNotification 
  } = useNotifications(user?.id);
  
  const [activePage, setActivePage] = useState<NavPage>('home');
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null);
  const [statFilter, setStatFilter] = useState<StatFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isResetPasswordFlow, setIsResetPasswordFlow] = useState(false);

  // Calculate today's task count - always compute this value regardless of rendering path
  const todayTaskCount = useMemo(() => {
    if (!tasks || tasks.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to start of day
    
    return tasks.filter(task => {
      // Skip tasks with invalid dates
      if (!task.dueDate) return false;
      
      try {
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0); // Normalize task date to start of day
        
        // Only count non-completed tasks due today
        return isSameDay(taskDate, today) && task.status !== 'completed';
      } catch (e) {
        // Skip tasks with invalid date format
        return false;
      }
    }).length;
  }, [tasks]);

  // Compute task stats - for the Navigation component
  const taskStats = useMemo(() => {
    // Make sure we have a valid tasks array before calculating
    const validTasks = tasks && Array.isArray(tasks) ? tasks : [];
    const totalTasks = validTasks.length;
    
    // Count all tasks regardless of status or category
    return {
      total: totalTasks,
      inProgress: validTasks.filter(t => t.status === 'in-progress').length,
      completed: validTasks.filter(t => t.status === 'completed').length,
      overdue: 0 // Add the missing property
    };
  }, [tasks]);

  // Check for unread notifications - moved here from inside render
  const hasUnreadNotifications = useMemo(() => unreadCount > 0, [unreadCount]);

  // Check URL hash for recovery path
  const checkHashForRecovery = useCallback(() => {
    const hash = window.location.hash;
    
    // If the URL contains the recovery path, set the reset password flow
    if (hash.includes('#auth/recovery')) {
      setIsResetPasswordFlow(true);
    }
  }, []);
  
  // Check hash on initial load and when it changes
  useEffect(() => {
    // Reduce artificial loading delay to improve perceived performance
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800); // Reduced from 2000ms to 800ms

    // Check hash on initial load
    checkHashForRecovery();
    
    // Also listen for hash changes
    const handleHashChange = () => {
      checkHashForRecovery();
    };
    
    // Handle page visibility changes (for pull-to-refresh)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh data when page becomes visible after refresh
        if (user?.id) {
          console.log('Page visible - forcing task refresh');
          
          // Add timestamp tracking to detect long tab/window inactivity
          const lastActivity = localStorage.getItem('lastActiveTimestamp');
          const now = Date.now();
          const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
          
          // Store current timestamp for future reference
          localStorage.setItem('lastActiveTimestamp', now.toString());
          
          // Check if we've been inactive for a while
          const wasInactiveLong = lastActivity ? (now - parseInt(lastActivity)) > inactiveThreshold : false;
          
          // Use a try-catch to handle any errors during data refresh
          try {
            // Force a connection check using the imported testConnection
            testConnection(wasInactiveLong).then((isConnected: boolean) => {
              if (isConnected) {
                // Get current session
                supabase.auth.getSession().then(({ data }) => {
                  if (data.session) {
                    // Refresh all data sources with proper error handling
                    refreshTasks(wasInactiveLong);
                  } else {
                    // If no session, redirect to login page
                    window.location.href = '/auth';
                  }
                }).catch(error => {
                  console.error('Session check failed:', error);
                  // Try to recover by forcing tasks refresh
                  refreshTasks(true);
                });
              } else {
                // If connection failed, try to refresh data instead of reloading
                console.warn('Connection test failed on visibility change, attempting to refresh data');
                refreshTasks(true); // Force refresh with recovery mode
              }
            }).catch((error: any) => {
              console.error('Error testing connection:', error);
              // Try refreshing data directly as a fallback before reloading
              refreshTasks(true);
            });
          } catch (error) {
            console.error('Error refreshing data on visibility change:', error);
            // Try to recover by resetting the state
            setActivePage(prev => prev);
          }
        }
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for auth state changes, including password recovery
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetPasswordFlow(true);
      }
    });
    
    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
      window.removeEventListener('hashchange', handleHashChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkHashForRecovery, refreshTasks, user?.id]);

  const renderContent = () => {
    switch (activePage) {
      case 'upcoming':
        return (
          <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
            <UpcomingPage tasks={tasks || []} />
          </Suspense>
        );
      case 'search':
        return (
          <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
            <SearchPage tasks={tasks || []} />
          </Suspense>
        );
      case 'courses':
        return (
          <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
            <CoursePage />
          </Suspense>
        );
      case 'study-materials':
        return (
          <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
            <StudyMaterialsPage />
          </Suspense>
        );
      case 'routine':
        return (
          <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
            <RoutinePage />
          </Suspense>
        );
      case 'lecture-slides':
        return (
          <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
            <LectureSlidesPage />
          </Suspense>
        );
      default:
        return (
          <HomePage
            user={user as User}
            tasks={tasks || []}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            statFilter={statFilter}
            setStatFilter={setStatFilter}
          />
        );
    }
  };

  // Early returns based on loading state and authentication
  if (isLoading || authLoading || ((user?.role === 'admin' || user?.role === 'super-admin') && usersLoading)) {
    return <LoadingScreen minimumLoadTime={1000} showProgress={true} />;
  }

  // Handle password reset flow
  if (isResetPasswordFlow) {
    return <ResetPasswordPage />;
  }

  // Debug log to show the current user's section ID
  if (user) {
    console.log('[Debug] Current user in App.tsx:', {
      id: user.id,
      role: user.role,
      sectionId: user.sectionId,
      sectionName: user.sectionName
    });
  }

  if (!user) {
    return (
      <AuthPage
        onLogin={(credentials, rememberMe = false) => login(credentials, rememberMe)}
        onSignup={async (credentials) => {
          const user = await signup(credentials);
          return undefined; // Explicitly return undefined to match void type
        }}
        onForgotPassword={forgotPassword}
        error={authError || undefined}
      />
    );
  }

  // Check for super-admin role first
  if (user.role === 'super-admin') {
    return (
      <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
        <SuperAdminDashboard />
      </Suspense>
    );
  }

  // Then check for regular admin role
  if (user.role === 'admin') {
    return (
      <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
        <AdminDashboard
          users={users}
          tasks={tasks}
          onLogout={logout}
          onDeleteUser={handleDeleteUser}
          onCreateTask={handleCreateTask}
          onDeleteTask={handleDeleteTask}
          onUpdateTask={handleUpdateTask}
          isSectionAdmin={false}
          sectionId={undefined}
          sectionName={undefined}
        />
      </Suspense>
    );
  }

   // Add handling for section_admin role
   if (user.role === 'section_admin') {
    return (
      <Suspense fallback={<LoadingScreen minimumLoadTime={300} />}>
        <AdminDashboard
          users={users.filter(u => u.sectionId === user.sectionId)} // Only users from their section
          tasks={tasks}
          onLogout={logout}
          onDeleteUser={handleDeleteUser}
          onCreateTask={handleCreateTask}
          onDeleteTask={handleDeleteTask}
          onUpdateTask={handleUpdateTask}
          isSectionAdmin={true}
          sectionId={user.sectionId}
          sectionName={user.sectionName}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation 
        onLogout={logout}
        hasUnreadNotifications={hasUnreadNotifications}
        onNotificationsClick={() => setShowNotifications(true)}
        activePage={activePage}
        onPageChange={setActivePage}
        user={{
          name: user.name,
          email: user.email,
          avatar: user.avatar || '' // Provide a default value
        }}
        taskStats={taskStats}
        tasks={tasks}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-20 pb-24">
        {tasksLoading ? (
          <LoadingScreen minimumLoadTime={500} showProgress={false} />
        ) : (
          renderContent()
        )}
      </main>

      <BottomNavigation 
        activePage={activePage}
        onPageChange={setActivePage}
        hasUnreadNotifications={hasUnreadNotifications}
        todayTaskCount={todayTaskCount}
      />

      <InstallPWA />
    </div>
  );
}
