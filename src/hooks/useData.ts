import { useState, useEffect } from 'react';
import { getCachedData } from '../utils/prefetch';

// In-memory cache for data
const memoryCache = new Map<string, { data: any; timestamp: string }>();

/**
 * Custom hook for managing data access with memory caching
 * @param cacheKey The key to use for caching
 * @param onlineData The data from the online source
 * @param fetcher Function to fetch data
 */
export function useData<T>(
  cacheKey: string,
  onlineData: T | null | undefined,
  fetcher: () => Promise<T>,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch data with caching
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try to get data from memory cache first
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          console.log(`Using cached data for ${cacheKey}`);
          setData(cachedData as T);
          setLoading(false);
          
          // Fetch fresh data in the background
          try {
            const freshData = await fetcher();
            setData(freshData);
            
            // Update memory cache
            memoryCache.set(cacheKey, {
              data: freshData,
              timestamp: new Date().toISOString()
            });
          } catch (err) {
            // If background fetch fails, we already have cached data so just log the error
            console.error(`Background fetch failed for ${cacheKey}:`, err);
          }
        } else {
          // No cached data, fetch fresh data
          console.log(`Fetching fresh data for ${cacheKey}`);
          const freshData = await fetcher();
          setData(freshData);
          
          // Update memory cache
          memoryCache.set(cacheKey, {
            data: freshData,
            timestamp: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error(`Error fetching data for ${cacheKey}:`, err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cacheKey, fetcher]);

  // Update memory cache when online data changes
  useEffect(() => {
    if (onlineData) {
      memoryCache.set(cacheKey, {
        data: onlineData,
        timestamp: new Date().toISOString()
      });
    }
  }, [cacheKey, onlineData]);

  return { data, loading, error };
}

/**
 * Hook for accessing tasks with memory caching
 * @param onlineData The tasks from the online source
 * @param fetcher Function to fetch tasks
 */
export function useTasks<T>(
  onlineData: T | null | undefined,
  fetcher: () => Promise<T>,
) {
  return useData('tasks', onlineData, fetcher);
}

/**
 * Hook for accessing routines with memory caching
 * @param onlineData The routines from the online source
 * @param fetcher Function to fetch routines
 */
export function useRoutines<T>(
  onlineData: T | null | undefined,
  fetcher: () => Promise<T>,
) {
  return useData('routines', onlineData, fetcher);
}

/**
 * Hook for accessing user data with memory caching
 * @param onlineData The user data from the online source
 * @param fetcher Function to fetch user data
 */
export function useUserData<T>(
  onlineData: T | null | undefined,
  fetcher: () => Promise<T>,
) {
  return useData('user_data', onlineData, fetcher);
}

/**
 * Clear all cached data
 */
export function clearCache() {
  memoryCache.clear();
} 