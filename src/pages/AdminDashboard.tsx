import { useState, useEffect, useMemo, useCallback } from 'react';
import { UserList } from '../components/admin/UserList';
import { TaskManager } from '../components/admin/TaskManager';
import { SideNavigation } from '../components/admin/navigation/SideNavigation';
import { TaskList } from '../components/TaskList';
import { UserStats } from '../components/admin/UserStats';
import { UserActivity } from '../components/admin/UserActivity';
import { AnnouncementManager } from '../components/admin/announcement/AnnouncementManager';
import { CourseManager } from '../components/admin/course/CourseManager';
import { StudyMaterialManager } from '../components/admin/study-materials/StudyMaterialManager';
import { RoutineManager } from '../components/admin/routine/RoutineManager';
import { TeacherManager } from '../components/admin/teacher/TeacherManager';
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
  
  // Get current user from auth for debugging
  const { user } = useAuth();
  const { refreshTasks, loading: tasksLoading, error: tasksError } = useTasks(user?.id);
  
  // Force task form visible when task management tab is activated
  useEffect(() => {
    if (activeTab === 'tasks') {
      console.log('[Debug] Setting showTaskForm to true for tasks tab');
      setShowTaskForm(true);
    }
  }, [activeTab]);
  
  // Filter tasks for section admin
  const filteredTasks = useMemo(() => {
    if (!isSectionAdmin || !sectionId) {
      return tasks;
    }
    
    // For section admins, only show tasks relevant to their section
    return tasks.filter(task => task.sectionId === sectionId);
  }, [tasks, isSectionAdmin, sectionId]);
  
  const { 
    announcements,
    createAnnouncement,
    deleteAnnouncement,
    refreshAnnouncements,
    loading: announcementsLoading
  } = useAnnouncements();
  
  // Filter announcements for section admin
  const filteredAnnouncements = useMemo(() => {
    if (!isSectionAdmin || !sectionId) {
      return announcements;
    }
    
    // For section admins, only show announcements for their section
    return announcements.filter(announcement => {
      // Only include announcements that are specifically for this section
      // or global announcements (those without a specific sectionId)
      return !announcement.sectionId || announcement.sectionId === sectionId;
    });
  }, [announcements, isSectionAdmin, sectionId]);
  
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

  // Filter courses for section admin
  const filteredCourses = useMemo(() => {
    if (!isSectionAdmin || !sectionId) {
      return courses;
    }
    
    // For section admins, only show courses for their section
    return courses.filter(course => course.sectionId === sectionId);
  }, [courses, isSectionAdmin, sectionId]);

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

  // Filter routines for section admin
  const filteredRoutines = useMemo(() => {
    if (!isSectionAdmin || !sectionId) {
      return routines;
    }
    
    // For section admins, only show routines for their section
    return routines.filter(routine => routine.sectionId === sectionId);
  }, [routines, isSectionAdmin, sectionId]);

  const {
    teachers,
    createTeacher,
    updateTeacher,
    deleteTeacher: deleteTeacherService,
    bulkImportTeachers,
    refreshTeachers,
    loading: teachersLoading
  } = useTeachers();
  
  // Filter teachers for section admin
  const filteredTeachers = useMemo(() => {
    if (!isSectionAdmin || !sectionId) {
      return teachers;
    }
    
    // For section admins, only show teachers for their section
    return teachers.filter(teacher => {
      // Show teachers specifically assigned to this section
      if (teacher.sectionId === sectionId) return true;
      
      // Also show teachers who teach courses for this section
      return teacher.courses?.some(course => course.sectionId === sectionId);
    });
  }, [teachers, isSectionAdmin, sectionId]);
  
  const { 
    deleteUser, 
    promoteUser, 
    demoteUser, 
    refreshUsers,
    loading: usersLoading 
  } = useUsers();
  
  // Filter users for section admin
  const filteredUsers = useMemo(() => {
    if (!sectionId) {
      return users;
    }
    
    // For all users, only show users from their section
    return users.filter(u => u.sectionId === sectionId);
  }, [users, sectionId]);
  
  const dueTasks = filteredTasks.filter(task => isOverdue(task.dueDate) && task.status !== 'completed');

  // Setup realtime subscription for data changes
  useEffect(() => {
    if (!sectionId) return;
    
    // Subscribe to changes in tasks for this section
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
        () => {
          console.log('Tasks data changed, refreshing...');
          refreshTasks();
        }
      )
      .subscribe();
      
    // Subscribe to changes in routines for this section
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
        () => {
          console.log('Routines data changed, refreshing...');
          refreshRoutines();
        }
      )
      .subscribe();
      
    // Subscribe to users in this section
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
        () => {
          console.log('Users data changed, refreshing...');
          refreshUsers();
        }
      )
      .subscribe();

    return () => {
      tasksSubscription.unsubscribe();
      routinesSubscription.unsubscribe();
      usersSubscription.unsubscribe();
    };
  }, [sectionId, refreshTasks, refreshRoutines, refreshUsers]);

  // Check for mobile view on mount and resize
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 1024);
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId);
      showSuccessToast('User deleted successfully');
      await refreshUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      showErrorToast(`Failed to delete user: ${error.message}`);
    }
  };

  const handleToggleSidebar = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
  };

  // Handle tab changes with refresh option
  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    setError(null);
    
    // If navigating to tasks, show the task form and refresh tasks
    if (tab === 'tasks') {
      setShowTaskForm(true);
      refreshTasks();
    } else if (tab === 'users') {
      refreshUsers();
    } else if (tab === 'routine') {
      refreshRoutines();
    } else if (tab === 'courses') {
      refreshCourses();
    } else if (tab === 'announcements') {
      refreshAnnouncements();
    } else if (tab === 'teachers') {
      refreshTeachers();
    } else {
      setShowTaskForm(false);
    }
  };

  // Refresh all data
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      await Promise.all([
        refreshTasks(),
        refreshUsers(),
        refreshRoutines(),
        refreshCourses(), 
        refreshAnnouncements(),
        refreshTeachers()
      ]);
      showSuccessToast('Data refreshed successfully');
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh data. Please try again.');
      showErrorToast('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Create a wrapped onCreateTask function that refreshes after creation
  const handleCreateTask = async (taskData: NewTask) => {
    try {
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
      await refreshTasks();
      
      showSuccessToast('Task created successfully');
    } catch (error: any) {
      console.error('Error creating task:', error);
      showErrorToast(`Error creating task: ${error.message}`);
    }
  };

  // Handle user promotion (to section_admin) - only available if allowed
  const handlePromoteUser = async (userId: string) => {
    try {
      await promoteUser(userId, 'section-admin');
      showSuccessToast('User promoted to section admin');
      await refreshUsers();
    } catch (error: any) {
      console.error('Failed to promote user:', error);
      showErrorToast(`Failed to promote user: ${error.message}`);
    }
  };

  // Handle user demotion (to regular user)
  const handleDemoteUser = async (userId: string) => {
    try {
      await demoteUser(userId, 'user');
      showSuccessToast('User demoted to regular user');
      await refreshUsers();
    } catch (error: any) {
      console.error('Failed to demote user:', error);
      showErrorToast(`Failed to demote user: ${error.message}`);
    }
  };

  // Enhanced deleteTeacher with better error handling and UI consistency
  const deleteTeacher = async (teacherId: string) => {
    if (!teacherId) {
      console.error('Invalid teacher ID provided for deletion');
      showErrorToast('Invalid teacher ID');
      return Promise.resolve(); // Still resolve to keep UI consistent
    }
    
    try {
      console.log('Attempting to delete teacher:', teacherId);
      await deleteTeacherService(teacherId);
      console.log('Teacher deleted successfully:', teacherId);
      showSuccessToast('Teacher deleted successfully');
      await refreshTeachers();
      return Promise.resolve();
    } catch (error: any) {
      // Log the error but still resolve the promise
      console.error('Failed to delete teacher:', teacherId, error);
      showErrorToast(`Error deleting teacher: ${error.message || 'Unknown error'}.`);
      
      // Return resolved promise anyway so UI stays consistent
      return Promise.resolve();
    }
  };

  // Add a manual refresh function
  const handleManualRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      await refreshTasks(true);
      
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

  // Auto-recovery for stuck loading state
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
            {activeTab === 'dashboard' && (
              <Dashboard 
                users={filteredUsers} 
                tasks={filteredTasks} 
                isLoading={tasksLoading || usersLoading}
              />
            )}

            {activeTab === 'users' && (
              <div className="space-y-4 sm:space-y-6">
                <UserStats 
                  users={filteredUsers} 
                  tasks={filteredTasks} 
                  isLoading={usersLoading || tasksLoading}
                />
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="lg:col-span-2">
                    <UserActiveGraph users={filteredUsers} isLoading={usersLoading} />
                  </div>
                  <div>
                    <UserActivity users={filteredUsers} isLoading={usersLoading} />
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
                
                {tasksLoading && (
                  <div className="fixed bottom-6 right-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg px-4 py-3 flex items-center gap-3 z-50 border border-gray-200 dark:border-gray-700">
                    <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                    <span className="text-gray-700 dark:text-gray-300 text-sm">Loading tasks...</span>
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
          </div>
        </div>
      </main>
    </div>
  );
}