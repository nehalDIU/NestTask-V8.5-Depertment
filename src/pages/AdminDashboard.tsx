import { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from 'react';
import { SideNavigation } from '../components/admin/navigation/SideNavigation';
import { UserStats } from '../components/admin/UserStats';
import { UserActivity } from '../components/admin/UserActivity';
import { Dashboard } from '../components/admin/dashboard/Dashboard';
import { UserActiveGraph } from '../components/admin/dashboard/UserActiveGraph';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { useCourses } from '../hooks/useCourses';
import { useRoutines } from '../hooks/useRoutines';
import { useTeachers } from '../hooks/useTeachers';
import { useUsers } from '../hooks/useUsers';
import { showErrorToast, showSuccessToast } from '../utils/notifications';
import { isOverdue } from '../utils/dateUtils';
import type { User } from '../types/auth';
import type { Task } from '../types/index';
import type { NewTask } from '../types/task';
import type { Teacher, NewTeacher } from '../types/teacher';
import type { AdminTab } from '../types/admin';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { supabase } from '../lib/supabase';
import { RefreshCcw, AlertTriangle, Loader2 } from 'lucide-react';

// Lazy load heavy components
const UserList = lazy(() => import('../components/admin/UserList').then(module => ({ default: module.UserList })));
const TaskManager = lazy(() => import('../components/admin/TaskManager').then(module => ({ default: module.TaskManager })));
const AnnouncementManager = lazy(() => import('../components/admin/announcement/AnnouncementManager').then(module => ({ default: module.AnnouncementManager })));
const CourseManager = lazy(() => import('../components/admin/course/CourseManager').then(module => ({ default: module.CourseManager })));
const StudyMaterialManager = lazy(() => import('../components/admin/study-materials/StudyMaterialManager').then(module => ({ default: module.StudyMaterialManager })));
const RoutineManager = lazy(() => import('../components/admin/routine/RoutineManager').then(module => ({ default: module.RoutineManager })));
const TeacherManager = lazy(() => import('../components/admin/teacher/TeacherManager').then(module => ({ default: module.TeacherManager })));

interface AdminDashboardProps {
  users: User[];
  tasks: Task[];
  onLogout: () => void;
  onDeleteUser: (userId: string) => void;
  onCreateTask: (task: NewTask, sectionId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  isSectionAdmin?: boolean;
  sectionId?: string;
  sectionName?: string;
}

export function AdminDashboard({
  users = [],
  tasks,
  onLogout,
  onDeleteUser,
  onCreateTask,
  onDeleteTask,
  onUpdateTask,
  isSectionAdmin = false,
  sectionId,
  sectionName
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const previousTabRef = useRef<AdminTab | null>(null);
  
  // Get current user from auth for debugging
  const { user } = useAuth();
  const { 
    refreshTasks, 
    loading: tasksLoading, 
    error: tasksError 
  } = useTasks(user?.id);
  
  // Reset task form state when navigating away from tasks tab
  useEffect(() => {
    if (previousTabRef.current === 'tasks' && activeTab !== 'tasks') {
      // Clean up task form state when leaving tasks tab
      setIsCreatingTask(false);
      setShowTaskForm(false);
      setError(null);
    }
    
    previousTabRef.current = activeTab;
  }, [activeTab]);
  
  // Force task form visible when task management tab is activated
  useEffect(() => {
    if (activeTab === 'tasks') {
      setShowTaskForm(true);
      // Reset task creation states when entering the tab
      setIsCreatingTask(false);
    }
  }, [activeTab]);
  
  // Filter tasks for section admin - memoized for performance
   const filteredTasks = useMemo(() => {
    if (!isSectionAdmin || !sectionId) {
      return tasks;
    }
    return tasks.filter(task => task.sectionId === sectionId);
  }, [tasks, isSectionAdmin, sectionId]);
  
  // Conditionally load data based on active tab
  const { 
    announcements,
    createAnnouncement,
    deleteAnnouncement,
    refreshAnnouncements,
    loading: announcementsLoading
  } = useAnnouncements();
  
  // Filter announcements for section admin - memoized for performance
  const filteredAnnouncements = useMemo(() => {
    if (!isSectionAdmin || !sectionId || activeTab !== 'announcements') {
      return []; // Only compute when needed
    }
    return announcements.filter(announcement => {
      return !announcement.sectionId || announcement.sectionId === sectionId;
    });
  }, [announcements, isSectionAdmin, sectionId, activeTab]);
  
  // Load course data only when needed
  const {
    courses,
    materials,
    createCourse,
    updateCourse,
    deleteCourse,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    bulkImportCourses,
    refreshCourses,
    loading: coursesLoading
  } = useCourses();

  // Filter courses for section admin - memoized and conditional
  const filteredCourses = useMemo(() => {
    // Only compute when courses tab is active or when needed by other components
    if ((!isSectionAdmin || !sectionId) || 
        (activeTab !== 'courses' && activeTab !== 'study-materials' && 
         activeTab !== 'teachers' && activeTab !== 'routine')) {
      return [];
    }
    return courses.filter(course => course.sectionId === sectionId);
  }, [courses, isSectionAdmin, sectionId, activeTab]);

  // Load routine data only when needed
  const {
    routines,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    addRoutineSlot,
    updateRoutineSlot,
    deleteRoutineSlot,
    activateRoutine,
    deactivateRoutine,
    bulkImportSlots,
    refreshRoutines,
    loading: routinesLoading
  } = useRoutines();

  // Filter routines for section admin - conditional loading
  const filteredRoutines = useMemo(() => {
    if ((!isSectionAdmin || !sectionId) || activeTab !== 'routine') {
      return [];
    }
    return routines.filter(routine => routine.sectionId === sectionId);
  }, [routines, isSectionAdmin, sectionId, activeTab]);

  // Load teacher data only when needed
  const {
    teachers,
    createTeacher,
    updateTeacher,
    deleteTeacher: deleteTeacherService,
    bulkImportTeachers,
    refreshTeachers,
    loading: teachersLoading
  } = useTeachers();
  
  // Filter teachers for section admin - memoized and conditional
  const filteredTeachers = useMemo(() => {
    if ((!isSectionAdmin || !sectionId) || 
        (activeTab !== 'teachers' && activeTab !== 'routine' && 
         activeTab !== 'courses')) {
      return [];
    }
    return teachers.filter(teacher => {
      if (teacher.sectionId === sectionId) return true;
      return teacher.courses?.some(course => course.sectionId === sectionId);
    });
  }, [teachers, isSectionAdmin, sectionId, activeTab]);
  
  // Load user data only when needed
  const { 
    deleteUser, 
    promoteUser, 
    demoteUser, 
    refreshUsers,
    loading: usersLoading 
  } = useUsers();
  
  // Filter users for section admin - memoized for performance
  const filteredUsers = useMemo(() => {
    if (!sectionId || (activeTab !== 'users' && activeTab !== 'dashboard')) {
      return []; // Only compute when needed
    }
    return users.filter(u => u.sectionId === sectionId);
  }, [users, sectionId, activeTab]);
  
  // Memoized calculation of due tasks
  const dueTasks = useMemo(() => 
    filteredTasks.filter(task => isOverdue(task.dueDate) && task.status !== 'completed'),
    [filteredTasks]
  );

  // Setup optimized realtime subscription for data changes
  useEffect(() => {
    if (!sectionId) return;
    
    const channels: Array<ReturnType<typeof supabase.channel>> = [];
    
    // Only subscribe to data changes needed for current tab
    if (activeTab === 'tasks' || activeTab === 'dashboard') {
    const tasksSubscription = supabase
      .channel('section-tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `sectionId=eq.${sectionId}`
        },
          () => refreshTasks()
      )
      .subscribe();
      channels.push(tasksSubscription);
    }
      
    if (activeTab === 'routine') {
    const routinesSubscription = supabase
      .channel('section-routines')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'routines',
          filter: `sectionId=eq.${sectionId}`
        },
          () => refreshRoutines()
      )
      .subscribe();
      channels.push(routinesSubscription);
    }
      
    if (activeTab === 'users' || activeTab === 'dashboard') {
    const usersSubscription = supabase
      .channel('section-users')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `sectionId=eq.${sectionId}`
        },
          () => refreshUsers()
      )
      .subscribe();
      channels.push(usersSubscription);
    }

    return () => {
      channels.forEach(channel => channel.unsubscribe());
    };
  }, [sectionId, activeTab, refreshTasks, refreshRoutines, refreshUsers]);

  // Check for mobile view on mount and resize with debounce
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 1024);
    };
    
    // Initial check
    checkMobileView();
    
    // Debounced resize handler
    let resizeTimer: number;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(checkMobileView, 250);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleDeleteUser = useCallback(async (userId: string) => {
    try {
      await deleteUser(userId);
      showSuccessToast('User deleted successfully');
      await refreshUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      showErrorToast(`Failed to delete user: ${error.message}`);
    }
  }, [deleteUser, refreshUsers]);

  const handleToggleSidebar = useCallback((collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
  }, []);

  // Handle tab changes with selective data loading
  const handleTabChange = useCallback((tab: AdminTab) => {
    // Skip reload if already on this tab
    if (tab === activeTab) return;
    
    // Store previous tab
    previousTabRef.current = activeTab;
    
    // Reset states when changing tabs
    setError(null);
    setIsCreatingTask(false);
    
    setActiveTab(tab);
    
    // Only load data for the active tab
    switch (tab) {
      case 'tasks':
      setShowTaskForm(true);
        // Force a fresh load of tasks when switching to the tasks tab
        refreshTasks(true);
        break;
      case 'users':
      refreshUsers();
        break;
      case 'routine':
      refreshRoutines();
        break;
      case 'courses':
      refreshCourses();
        break;
      case 'announcements':
      refreshAnnouncements();
        break;
      case 'teachers':
      refreshTeachers();
        break;
      case 'dashboard':
        // For dashboard, load key data
        Promise.all([refreshTasks(), refreshUsers()]);
        break;
      default:
      setShowTaskForm(false);
    }
  }, [
    activeTab, 
    refreshAnnouncements, 
    refreshCourses, 
    refreshRoutines, 
    refreshTasks, 
    refreshTeachers, 
    refreshUsers
  ]);

  // Refresh only data relevant to current tab
  const handleRefreshData = useCallback(async () => {
    if (isRefreshing) return; // Prevent multiple refreshes
    
    setIsRefreshing(true);
    setError(null);
    
    try {
      // Only refresh data for the active tab
      switch (activeTab) {
        case 'tasks':
          await refreshTasks();
          break;
        case 'users':
          await refreshUsers();
          break;
        case 'routine':
          await refreshRoutines();
          break;
        case 'courses':
          await refreshCourses();
          break;
        case 'announcements':
          await refreshAnnouncements();
          break;
        case 'teachers':
          await refreshTeachers();
          break;
        case 'dashboard':
          // For dashboard, refresh all critical data
      await Promise.all([
        refreshTasks(),
            refreshUsers()
          ]);
          break;
        default:
          break;
      }
      showSuccessToast('Data refreshed successfully');
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh data. Please try again.');
      showErrorToast('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [
    activeTab, 
    isRefreshing,
    refreshAnnouncements, 
    refreshCourses, 
    refreshRoutines, 
    refreshTasks, 
    refreshTeachers, 
    refreshUsers
  ]);

  // Create task with section ID assignment and better state management
  const handleCreateTask = useCallback(async (taskData: NewTask) => {
    // Prevent multiple simultaneous task creation attempts
    if (isCreatingTask) {
      console.log('Task creation already in progress');
      return;
    }
    
    try {
      setIsCreatingTask(true);
      setError(null);
      
      // If section admin, automatically associate with section
      if (isSectionAdmin && sectionId) {
        // Create the task with section ID attached
        const enhancedTask = {
          ...taskData,
          sectionId
        };
        // Create task with section ID
        await onCreateTask(enhancedTask, sectionId);
      } else {
        await onCreateTask(taskData);
      }
      
      // After creating a task, refresh the task list to show the new task
      await refreshTasks(true); // Force refresh to ensure latest data
      
      showSuccessToast('Task created successfully');
    } catch (error: any) {
      console.error('Error creating task:', error);
      showErrorToast(`Error creating task: ${error.message}`);
      setError(`Failed to create task: ${error.message}`);
    } finally {
      setIsCreatingTask(false);
    }
  }, [isSectionAdmin, onCreateTask, refreshTasks, sectionId, isCreatingTask]);

  // Handle user promotion with memoization
  const handlePromoteUser = useCallback(async (userId: string) => {
    try {
      await promoteUser(userId, 'section-admin');
      showSuccessToast('User promoted to section admin');
      await refreshUsers();
    } catch (error: any) {
      console.error('Failed to promote user:', error);
      showErrorToast(`Failed to promote user: ${error.message}`);
    }
  }, [promoteUser, refreshUsers]);

  // Handle user demotion with memoization
  const handleDemoteUser = useCallback(async (userId: string) => {
    try {
      await demoteUser(userId, 'user');
      showSuccessToast('User demoted to regular user');
      await refreshUsers();
    } catch (error: any) {
      console.error('Failed to demote user:', error);
      showErrorToast(`Failed to demote user: ${error.message}`);
    }
  }, [demoteUser, refreshUsers]);

  // Optimized teacher deletion with error handling
  const deleteTeacher = useCallback(async (teacherId: string) => {
    if (!teacherId) {
      console.error('Invalid teacher ID provided for deletion');
      showErrorToast('Invalid teacher ID');
      return Promise.resolve();
    }
    
    try {
      await deleteTeacherService(teacherId);
      showSuccessToast('Teacher deleted successfully');
      await refreshTeachers();
      return Promise.resolve();
    } catch (error: any) {
      console.error('Failed to delete teacher:', teacherId, error);
      showErrorToast(`Error deleting teacher: ${error.message || 'Unknown error'}.`);
      return Promise.resolve();
    }
  }, [deleteTeacherService, refreshTeachers]);

  // Manual refresh with improved error handling and state reset
  const handleManualRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      setIsCreatingTask(false); // Reset task creation state
      
      await refreshTasks(true); // Force refresh
      
      // Reset activeTab to force re-render components
      if (activeTab === 'tasks') {
        const currentTab = activeTab;
        setActiveTab('dashboard');
        setTimeout(() => {
          setActiveTab(currentTab);
        }, 50);
      }
    } catch (err: any) {
      console.error('Error refreshing tasks:', err);
      setError(err.message || 'Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [activeTab, refreshTasks]);

  // Auto-recovery for stuck loading state with memoization
  useEffect(() => {
    let timeoutId: number;
    
    // If we're on tasks tab and loading is stuck for too long, try to recover
    if (activeTab === 'tasks' && tasksLoading) {
      timeoutId = window.setTimeout(() => {
        console.warn('Task loading appears stuck, attempting recovery');
        handleManualRefresh();
      }, 15000); // 15 seconds timeout
    }
    
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [activeTab, tasksLoading, handleManualRefresh]);

  // Pre-render loading states for better perceived performance
  const loadingFallback = useMemo(() => (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
  ), []);

  // Render function for tab content with Suspense fallback
  const renderTabContent = () => {
    return (
      <Suspense fallback={loadingFallback}>
            {activeTab === 'dashboard' && (
              <Dashboard 
                users={filteredUsers} 
                tasks={filteredTasks} 
              />
            )}

            {activeTab === 'users' && (
              <div className="space-y-4 sm:space-y-6">
                <UserStats 
                  users={filteredUsers} 
                  tasks={filteredTasks} 
                />
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="lg:col-span-2">
                <UserActiveGraph users={filteredUsers} />
                  </div>
                  <div>
                <UserActivity users={filteredUsers} />
                  </div>
                </div>
                
                <UserList 
                  users={filteredUsers} 
                  onDeleteUser={handleDeleteUser}
                  onPromoteUser={handlePromoteUser}
                  onDemoteUser={handleDemoteUser}
                  isSectionAdmin={isSectionAdmin}
                  isLoading={usersLoading}
                />
              </div>
            )}
            
            {activeTab === 'tasks' && (
              <>
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-red-800 dark:text-red-300 font-medium text-sm">Error loading tasks</h3>
                      <p className="text-red-600 dark:text-red-400 text-xs mt-1">{error}</p>
                      <button 
                        className="mt-2 px-3 py-1.5 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 text-xs rounded-lg hover:bg-red-200 dark:hover:bg-red-700 flex items-center gap-1.5"
                        onClick={handleManualRefresh}
                      >
                        <RefreshCcw className="w-3 h-3" />
                        Retry
                      </button>
                    </div>
                  </div>
                )}
                
            {(tasksLoading || isCreatingTask) && (
                  <div className="fixed bottom-6 right-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg px-4 py-3 flex items-center gap-3 z-50 border border-gray-200 dark:border-gray-700">
                    <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                <span className="text-gray-700 dark:text-gray-300 text-sm">
                  {isCreatingTask ? 'Creating task...' : 'Loading tasks...'}
                </span>
                  </div>
                )}
                
              <TaskManager
                tasks={filteredTasks}
                onCreateTask={handleCreateTask}
                onDeleteTask={onDeleteTask}
                onUpdateTask={onUpdateTask}
                  showTaskForm={showTaskForm}
                sectionId={sectionId}
                isSectionAdmin={isSectionAdmin}
                  isLoading={tasksLoading || isRefreshing}
              isCreatingTask={isCreatingTask}
              onTaskCreateStart={() => setIsCreatingTask(true)}
              onTaskCreateEnd={() => setIsCreatingTask(false)}
              />
              </>
            )}

            {activeTab === 'announcements' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-5 overflow-hidden">
                <AnnouncementManager
                  announcements={filteredAnnouncements}
                  onCreateAnnouncement={createAnnouncement}
                  onDeleteAnnouncement={deleteAnnouncement}
                  sectionId={sectionId}
                  isSectionAdmin={isSectionAdmin}
                  isLoading={announcementsLoading}
                />
              </div>
            )}

            {activeTab === 'teachers' && (
              <TeacherManager
                teachers={filteredTeachers}
                courses={filteredCourses}
                onCreateTeacher={createTeacher as (teacher: NewTeacher, courseIds: string[]) => Promise<Teacher | undefined>}
                onUpdateTeacher={updateTeacher as (id: string, updates: Partial<Teacher>, courseIds: string[]) => Promise<Teacher | undefined>}
                onDeleteTeacher={deleteTeacher}
                onBulkImportTeachers={bulkImportTeachers}
                sectionId={sectionId}
                isSectionAdmin={isSectionAdmin}
                isLoading={teachersLoading}
              />
            )}

            {activeTab === 'courses' && (
              <CourseManager
                courses={filteredCourses}
                teachers={filteredTeachers}
                onCreateCourse={createCourse}
                onUpdateCourse={updateCourse}
                onDeleteCourse={deleteCourse}
                onBulkImportCourses={bulkImportCourses}
                sectionId={sectionId}
                isSectionAdmin={isSectionAdmin}
                isLoading={coursesLoading}
              />
            )}

            {activeTab === 'study-materials' && (
              <StudyMaterialManager
                courses={filteredCourses}
                materials={materials}
                onCreateMaterial={createMaterial}
                onDeleteMaterial={deleteMaterial}
                sectionId={sectionId}
                isSectionAdmin={isSectionAdmin}
              />
            )}

            {activeTab === 'routine' && (
              <RoutineManager
                routines={filteredRoutines}
                courses={filteredCourses}
                teachers={filteredTeachers}
                onCreateRoutine={createRoutine}
                onUpdateRoutine={updateRoutine}
                onDeleteRoutine={deleteRoutine}
                onAddSlot={addRoutineSlot}
                onUpdateSlot={updateRoutineSlot}
                onDeleteSlot={deleteRoutineSlot}
                onActivateRoutine={activateRoutine}
                onDeactivateRoutine={deactivateRoutine}
                onBulkImportSlots={bulkImportSlots}
                sectionId={sectionId}
                isSectionAdmin={isSectionAdmin}
                isLoading={routinesLoading}
              />
            )}
      </Suspense>
    );
  };

  // Memoized main layout structure to prevent unnecessary re-renders
  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <SideNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={onLogout}
        onCollapse={handleToggleSidebar}
        isSectionAdmin={isSectionAdmin}
      />
      
      <main className={`
        flex-1 overflow-y-auto w-full transition-all duration-300
        ${isMobileView ? 'pt-16' : isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
      `}>
        <div className="max-w-full mx-auto p-3 sm:p-5 lg:p-6">
          <header className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {activeTab === 'dashboard' && 'Dashboard'}
                  {activeTab === 'users' && 'User Management'}
                  {activeTab === 'tasks' && 'Task Management'}
                  {activeTab === 'announcements' && 'Announcements'}
                  {activeTab === 'teachers' && 'Teacher Management'}
                  {activeTab === 'courses' && 'Course Management'}
                  {activeTab === 'study-materials' && 'Study Materials'}
                  {activeTab === 'routine' && 'Routine Management'}
                </h1>
                {isSectionAdmin && sectionName && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                    Section Admin: {sectionName}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleRefreshData}
                  disabled={isRefreshing}
                  className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                  aria-label="Refresh data"
                  title="Refresh data"
                >
                  <RefreshCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            </div>
          </header>

          {error && (
            <div className="mb-4 p-3 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4 sm:space-y-6">
            {renderTabContent()}
          </div>
        </div>
      </main>
    </div>
  );
}