import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // Track if a request is in progress to prevent duplicate requests
  const loadingRef = useRef(false);
  // Track the last successful load time to prevent too frequent refreshes
  const lastLoadTimeRef = useRef(0);
  // Track if component is mounted
  const isMountedRef = useRef(true);
  // Track abort controller for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadTasks = useCallback(async (options: { force?: boolean } = {}) => {
    if (!userId) return;
    
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    // Don't reload if a request is already in progress, unless forced
    if (loadingRef.current && !options.force) {
      console.log('Task loading already in progress, skipping');
      return;
    }
    
    // Implement throttling - don't reload if last load was less than 5 seconds ago
    const now = Date.now();
    if (!options.force && now - lastLoadTimeRef.current < 5000) {
      console.log('Task loading throttled - too soon since last load');
      return;
    }

    try {
      setLoading(true);
      loadingRef.current = true;
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

      // Check if the request was aborted
      if (signal.aborted) {
        console.log('Task loading aborted');
        return;
      }

      const data = await fetchTasks(userId, userSectionId);
      
      // Only update state if component is mounted and request not aborted
      if (isMountedRef.current && !signal.aborted) {
        setTasks(data);
        setError(null);
        lastLoadTimeRef.current = Date.now();
        setRetryCount(0); // Reset retry count on success
      }
    } catch (err: any) {
      // Only update error state if component is mounted and not aborted
      if (isMountedRef.current && (!abortControllerRef.current || !abortControllerRef.current.signal.aborted)) {
        console.error('Error fetching tasks:', err);
        setError(err.message || 'Failed to load tasks');
        
        if (!isOffline && retryCount < 3) {
          const timeout = Math.min(1000 * Math.pow(2, retryCount), 10000);
          setTimeout(() => {
            if (isMountedRef.current) {
              setRetryCount(prev => prev + 1);
            }
          }, timeout);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      loadingRef.current = false;
    }
  }, [userId, retryCount, isOffline]);

  useEffect(() => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    // Set mounted ref
    isMountedRef.current = true;
    
    // Initial load
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
          if (isMountedRef.current) {
            loadTasks();
          }
        })
        .subscribe();

      // Enhanced visibility change handler with fallback mechanism
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          // Check if we're in a loading state for too long (possible abandoned request)
          const isStuck = loadingRef.current && (Date.now() - lastLoadTimeRef.current > 10000);
          
          if (isStuck) {
            console.warn('Task loading appears stuck, forcing refresh');
            // Force refresh with the force option
            loadTasks({ force: true });
          } else {
            // Normal refresh when page becomes visible
            supabase.auth.getSession().then(({ data }) => {
              if (data.session && isMountedRef.current) {
                loadTasks();
              }
            });
          }
        }
      };

      // Set up regular polling to check for stuck state
      const pollInterval = setInterval(() => {
        if (loadingRef.current && Date.now() - lastLoadTimeRef.current > 15000) {
          console.warn('Task loading stuck in polling check, resetting state');
          loadingRef.current = false;
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      }, 5000);

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        // Mark component as unmounted
        isMountedRef.current = false;
        // Clean up
        subscription.unsubscribe();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        clearInterval(pollInterval);
        // Abort any in-progress request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }
  }, [userId, loadTasks, isOffline]);

  // Add cache reset when visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reset any stuck loading state
        if (loadingRef.current && Date.now() - lastLoadTimeRef.current > 5000) {
          console.log('Resetting stuck loading state on visibility change');
          loadingRef.current = false;
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleCreateTask = async (newTask: NewTask, sectionId?: string) => {
    if (isOffline) {
      throw new Error('Cannot create tasks while offline');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const createdTask = await createTask(userId, newTask, sectionId);
      if (isMountedRef.current) {
        setTasks(prev => [...prev, createdTask]);
      }
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
      if (isMountedRef.current) {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, ...updatedTask } : task
        ));
      }
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
      if (isMountedRef.current) {
        setTasks(prev => prev.filter(task => task.id !== taskId));
      }
      return true;
    } catch (err: any) {
      console.error('Error deleting task:', err);
      throw err;
    }
  };

  const refreshTasks = (force = false) => {
    if (isOffline) {
      return Promise.reject('Cannot refresh tasks while offline');
    }
    return loadTasks({ force });
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