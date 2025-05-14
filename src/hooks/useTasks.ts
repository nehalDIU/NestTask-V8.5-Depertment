import { useState, useEffect, useCallback } from 'react';
import { supabase, testConnection } from '../lib/supabase';
import { fetchTasks, createTask, updateTask, deleteTask } from '../services/task.service';
import { useOfflineStatus } from './useOfflineStatus';
import type { Task, NewTask } from '../types/task';

export function useTasks(userId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isOffline = useOfflineStatus();

  const loadTasks = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // Get user data to check role and section
      const { data: { user } } = await supabase.auth.getUser();
      const userRole = user?.user_metadata?.role;
      const userSectionId = user?.user_metadata?.section_id;

      if (isOffline) {
        setTasks([]);
        setError('Cannot fetch tasks while offline');
        return;
      }

      // Test connection before fetching
      const isConnected = await testConnection();
      if (!isConnected) {
        throw new Error('Unable to connect to database');
      }

      // Check session
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        window.location.reload();
        return;
      }

      const data = await fetchTasks(userId, userSectionId);
      setTasks(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setError(err.message || 'Failed to load tasks');
      
      if (!isOffline && retryCount < 3) {
        const timeout = Math.min(1000 * Math.pow(2, retryCount), 10000);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, timeout);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, retryCount, isOffline]);

  useEffect(() => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    loadTasks();

    if (!isOffline) {
      const subscription = supabase
        .channel('tasks_channel')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`
        }, () => {
          loadTasks();
        })
        .subscribe();

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
              loadTasks();
            }
          });
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        subscription.unsubscribe();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [userId, loadTasks, isOffline]);

  const handleCreateTask = async (newTask: NewTask, sectionId?: string) => {
    if (isOffline) {
      throw new Error('Cannot create tasks while offline');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const createdTask = await createTask(userId, newTask, sectionId);
      setTasks(prev => [...prev, createdTask]);
      return createdTask;
    } catch (err: any) {
      console.error('Error creating task:', err);
      throw err;
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    if (isOffline) {
      throw new Error('Cannot update tasks while offline');
    }

    try {
      const updatedTask = await updateTask(taskId, updates);
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updatedTask } : task
      ));
      return updatedTask;
    } catch (err: any) {
      console.error('Error updating task:', err);
      throw err;
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (isOffline) {
      throw new Error('Cannot delete tasks while offline');
    }

    try {
      await deleteTask(taskId);
      setTasks(prev => prev.filter(task => task.id !== taskId));
      return true;
    } catch (err: any) {
      console.error('Error deleting task:', err);
      throw err;
    }
  };

  const refreshTasks = () => {
    if (isOffline) {
      return Promise.reject('Cannot refresh tasks while offline');
    }
    return loadTasks();
  };

  return {
    tasks,
    loading,
    error,
    createTask: handleCreateTask,
    updateTask: handleUpdateTask,
    deleteTask: handleDeleteTask,
    refreshTasks
  };
}