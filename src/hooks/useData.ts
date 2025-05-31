import { useState, useEffect, useCallback } from 'react';
import { getCachedData } from '../utils/prefetch';

// In-memory cache for data
const memoryCache = new Map<string, { data: any; timestamp: string }>();

/**
 * Custom hook for managing data access with in-memory caching
 * @param cacheKey The cache key to use for storing data
 * @param fetcher Function to fetch data
 */
export function useData<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
) {
  const [data, setData] = useState<T | null>(() => {
    // Check if we have cached data on initialization
    const cachedData = getCachedData(cacheKey);
    return cachedData as T | null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Function to refresh data
  const refreshData = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Fetching ${cacheKey} data`);
      const freshData = await fetcher();
      setData(freshData);
    } catch (err) {
      console.error(`Error fetching ${cacheKey} data:`, err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetcher]);

  // Fetch data on initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return { data, loading, error, refreshData };
}

/**
 * Hook for accessing tasks
 * @param fetcher Function to fetch tasks
 */
export function useTasks<T>(fetcher: () => Promise<T>) {
  return useData('tasks', fetcher);
}

/**
 * Hook for accessing routines
 * @param fetcher Function to fetch routines
 */
export function useRoutines<T>(fetcher: () => Promise<T>) {
  return useData('routines', fetcher);
}

/**
 * Hook for accessing user data
 * @param fetcher Function to fetch user data
 */
export function useUserData<T>(fetcher: () => Promise<T>) {
  return useData('user_data', fetcher);
}

/**
 * Clear all cached data
 */
export function clearCache() {
  memoryCache.clear();
} 