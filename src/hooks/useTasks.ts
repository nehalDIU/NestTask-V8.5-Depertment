import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, testConnection } from '../lib/supabase';
import { fetchTasks, createTask, updateTask, deleteTask } from '../services/task.service';
import { useOfflineStatus } from './useOfflineStatus';
import type { Task, NewTask } from '../types/task';

// Cache for tasks by user ID
const tasksCache = new Map<string, {
  tasks: Task[],
  timestamp: number
}>();

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Task fetch timeout in milliseconds (increased from 20 seconds to 45 seconds)
const TASK_FETCH_TIMEOUT = 45000;

// Maximum number of retries for task fetching
const MAX_RETRIES_TIMEOUT = 5;
const MAX_RETRIES_OTHER = 3;

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
  // Track user id for cache key generation
  const userIdRef = useRef<string | undefined>(userId);
  // Track if we're in tab switch recovery mode
  const tabSwitchRecoveryRef = useRef(false);

  // Update ref when userId changes
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const loadTasks = useCallback(async (options: { force?: boolean } = {}) => {
    if (!userId) return;
    
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    // If force is true, reset recovery mode and retry count
    if (options.force) {
      tabSwitchRecoveryRef.current = true;
      if (isMountedRef.current) {
        setRetryCount(0);
      }
    }
    
    // Don't reload if a request is already in progress, unless forced
    if (loadingRef.current && !options.force) {
      console.log('Task loading already in progress, skipping');
      return;
    }
    
    // Implement throttling - don't reload if last load was less than 3 seconds ago
    // but reduce to 1 second if we're in tab switch recovery mode
    const now = Date.now();
    const throttleTime = tabSwitchRecoveryRef.current ? 1000 : 3000;
    if (!options.force && now - lastLoadTimeRef.current < throttleTime) {
      console.log('Task loading throttled - too soon since last load');
      return;
    }

    // Check cache first for non-forced loads
    if (!options.force && tasksCache.has(userId)) {
      const cachedData = tasksCache.get(userId)!;
      // If cache is still valid
      if (now - cachedData.timestamp < CACHE_TTL) {
        console.log('Using cached tasks data');
        if (isMountedRef.current) {
          setTasks(cachedData.tasks);
          setLoading(false);
          setError(null);
        }
        return;
      } else {
        // Cache expired but still usable while refreshing in background
        if (isMountedRef.current) {
          setTasks(cachedData.tasks);
        }
      }
    }

    try {
      // Only set loading state if there's no cached data or force refresh
      if ((!tasksCache.has(userId) || options.force) && isMountedRef.current) {
        setLoading(true);
      }
      loadingRef.current = true;
      if (isMountedRef.current) {
        setError(null);
      }

      // Skip database connection test in development mode
      let isConnected = true;
      if (process.env.NODE_ENV !== 'development') {
        // Get user data to check role and section
        const { data: { user } } = await supabase.auth.getUser();
        
        if (isOffline) {
          // Use cached data if available when offline
          if (tasksCache.has(userId)) {
            const cachedData = tasksCache.get(userId)!;
            if (isMountedRef.current) {
              setTasks(cachedData.tasks);
              setLoading(false);
              setError('Using cached tasks while offline');
            }
            return;
          }
          
          if (isMountedRef.current) {
            setTasks([]);
            setError('Cannot fetch tasks while offline');
          }
          return;
        }

        // Test connection before fetching
        isConnected = await testConnection();
        if (!isConnected) {
          throw new Error('Unable to connect to database');
        }

        // Check session
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          window.location.reload();
          return;
        }
      }

      // Check if the request was aborted
      if (signal.aborted) {
        console.log('Task loading aborted');
        return;
      }

      // Batch process tasks in chunks for better performance
      const processTasks = async () => {
        // Add signal to fetch request for timeout control
        const data = await fetchTasks(userId, signal);
        return data;
      };
      
      // Use Promise.race to implement timeout with increased timeout value
      const timeoutPromise = new Promise<Task[]>((_, reject) => {
        setTimeout(() => reject(new Error('Task fetch timeout')), TASK_FETCH_TIMEOUT);
      });
      
      const data = await Promise.race([processTasks(), timeoutPromise]);
      
      // Only update state if component is mounted and request not aborted
      if (isMountedRef.current && !signal.aborted) {
        setTasks(data);
        // Update cache
        tasksCache.set(userId, {
          tasks: data,
          timestamp: Date.now()
        });
        
        setError(null);
        lastLoadTimeRef.current = Date.now();
        setRetryCount(0); // Reset retry count on success
        tabSwitchRecoveryRef.current = false; // We've recovered if we were in recovery mode
      }
    } catch (err: any) {
      // Only update error state if component is mounted and not aborted
      if (isMountedRef.current && (!abortControllerRef.current || !abortControllerRef.current.signal.aborted)) {
        console.error('Error fetching tasks:', err);
        
        // Use cached data if available when fetch fails
        if (tasksCache.has(userId)) {
          const cachedData = tasksCache.get(userId)!;
          setTasks(cachedData.tasks);
          
          // Provide a more informative error message for timeouts
          if (err.message === 'Task fetch timeout') {
            setError(`Using cached data. Failed to refresh: Task fetch timeout after ${TASK_FETCH_TIMEOUT/1000}s. Network may be slow or server overloaded.`);
          } else {
            setError(`Using cached data. Failed to refresh: ${err.message || 'Unknown error'}`);
          }
        } else {
          setError(err.message || 'Failed to load tasks');
          
          // Increase retry limit for timeouts
          const maxRetries = err.message === 'Task fetch timeout' ? MAX_RETRIES_TIMEOUT : MAX_RETRIES_OTHER;
          
          if (!isOffline && retryCount < maxRetries) {
            // Use exponential backoff with some randomness
            const randomOffset = Math.floor(Math.random() * 1000);
            const timeout = Math.min(1000 * Math.pow(2, retryCount) + randomOffset, 15000);
            
            console.log(`Retrying task fetch in ${timeout}ms (attempt ${retryCount + 1}/${maxRetries})`);
            
            setTimeout(() => {
              if (isMountedRef.current) {
                setRetryCount(prev => prev + 1);
              }
            }, timeout);
          } else if (retryCount >= maxRetries) {
            // After max retries, we should try to reset and make a forced refresh
            // next time the user interacts or becomes active
            tabSwitchRecoveryRef.current = true;
            console.warn(`Maximum retries (${maxRetries}) reached for task fetching. Will force refresh next time.`);
          }
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      // Small delay before clearing loadingRef to prevent immediate re-requests
      setTimeout(() => {
        loadingRef.current = false;
      }, 100);
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
    
    // Initial load - use cache first then refresh
    if (tasksCache.has(userId)) {
      const cachedData = tasksCache.get(userId)!;
      setTasks(cachedData.tasks);
      setLoading(false);
      
      // Refresh in background after short delay
      setTimeout(() => {
        if (isMountedRef.current) {
          loadTasks();
        }
      }, 100);
    } else {
      loadTasks();
    }

    if (!isOffline) {
      // Debounced realtime subscription to prevent excessive refreshes
      let realtimeTimeout: number | null = null;

      const subscription = supabase
        .channel('tasks_channel')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`
        }, () => {
          if (isMountedRef.current) {
            // Debounce realtime updates to prevent rapid-fire refreshes
            if (realtimeTimeout) {
              clearTimeout(realtimeTimeout);
            }

            realtimeTimeout = window.setTimeout(() => {
              if (isMountedRef.current && !loadingRef.current) {
                loadTasks();
              }
            }, 1000); // 1 second debounce
          }
        })
        .subscribe();

      // Optimized visibility change handler to prevent excessive refreshes
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          const now = Date.now();
          const timeSinceLastLoad = now - lastLoadTimeRef.current;

          // Always reset stuck state on tab focus
          if (loadingRef.current) {
            console.log('Resetting loading state on visibility change');
            loadingRef.current = false;
          }

          // Only refresh if we've been away for more than 5 minutes to prevent excessive refreshes
          if (timeSinceLastLoad > 300000) { // 5 minutes
            console.log('Page visible after long absence, refreshing tasks');
            loadTasks({ force: true });
          } else if (tabSwitchRecoveryRef.current) {
            // Only force refresh if we're in recovery mode
            console.warn('Task loading needs recovery, forcing refresh');
            loadTasks({ force: true });
          } else {
            // Check cache staleness only if we haven't refreshed recently
            if (tasksCache.has(userId)) {
              const cachedData = tasksCache.get(userId)!;
              if (now - cachedData.timestamp > CACHE_TTL && timeSinceLastLoad > 60000) { // 1 minute minimum
                loadTasks();
              }
            }
          }
        }
      };

      // Set up regular polling to check for stuck state with increased timeout value
      const pollInterval = setInterval(() => {
        if (loadingRef.current && Date.now() - lastLoadTimeRef.current > TASK_FETCH_TIMEOUT + 5000) {
          console.warn('Task loading stuck in polling check, resetting state');
          loadingRef.current = false;
          if (isMountedRef.current) {
            setLoading(false);
            tabSwitchRecoveryRef.current = true;
          }
        }
      }, 5000);

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        // Mark component as unmounted
        isMountedRef.current = false;

        // Cleanup realtime timeout
        if (realtimeTimeout) {
          clearTimeout(realtimeTimeout);
        }

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
        
        // Update cache
        if (tasksCache.has(userId)) {
          const cachedData = tasksCache.get(userId)!;
          tasksCache.set(userId, {
            tasks: [...cachedData.tasks, createdTask],
            timestamp: Date.now()
          });
        }
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
        // Update local state
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, ...updatedTask } : task
        ));
        
        // Update cache
        if (userId && tasksCache.has(userId)) {
          const cachedData = tasksCache.get(userId)!;
          tasksCache.set(userId, {
            tasks: cachedData.tasks.map(task => 
              task.id === taskId ? { ...task, ...updatedTask } : task
            ),
            timestamp: Date.now()
          });
        }
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
        // Update local state
        setTasks(prev => prev.filter(task => task.id !== taskId));
        
        // Update cache
        if (userId && tasksCache.has(userId)) {
          const cachedData = tasksCache.get(userId)!;
          tasksCache.set(userId, {
            tasks: cachedData.tasks.filter(task => task.id !== taskId),
            timestamp: Date.now()
          });
        }
      }
      return true;
    } catch (err: any) {
      console.error('Error deleting task:', err);
      throw err;
    }
  };

  const refreshTasks = useCallback((force = false) => {
    loadTasks({ force });
  }, [loadTasks]);

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