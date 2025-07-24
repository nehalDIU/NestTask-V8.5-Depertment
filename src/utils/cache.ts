// Simple in-memory cache utility to replace offline storage

// Cache storage
const memoryCache: Record<string, any> = {};

/**
 * Save data to memory cache
 * @param key Cache key to store data under
 * @param data Data to cache
 */
export function setCache<T>(key: string, data: T): void {
  memoryCache[key] = {
    data,
    timestamp: Date.now()
  };
}

/**
 * Get data from memory cache
 * @param key Cache key to retrieve
 * @returns The cached data or null if not found
 */
export function getCache<T>(key: string): T | null {
  const cached = memoryCache[key];
  if (!cached) return null;
  return cached.data as T;
}

/**
 * Check if cache entry exists and is not expired
 * @param key Cache key to check
 * @param maxAge Maximum age in milliseconds (optional)
 * @returns True if cache exists and is not expired
 */
export function isCacheValid(key: string, maxAge?: number): boolean {
  const cached = memoryCache[key];
  if (!cached) return false;
  
  if (maxAge) {
    const age = Date.now() - cached.timestamp;
    return age < maxAge;
  }
  
  return true;
}

/**
 * Remove a specific cache entry
 * @param key Cache key to remove
 */
export function invalidateCache(key: string): void {
  delete memoryCache[key];
}

/**
 * Clear all cache entries that match a prefix
 * @param prefix Prefix to match
 */
export function clearCacheByPrefix(prefix: string): void {
  Object.keys(memoryCache).forEach(key => {
    if (key.startsWith(prefix)) {
      delete memoryCache[key];
    }
  });
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  Object.keys(memoryCache).forEach(key => {
    delete memoryCache[key];
  });
}

/**
 * Get all cached data for a specific prefix
 * @param prefix Prefix to match
 * @returns Object with all matching cache entries
 */
export function getCachedData<T>(prefix: string): Record<string, T> {
  const result: Record<string, T> = {};
  
  Object.keys(memoryCache).forEach(key => {
    if (key.startsWith(prefix)) {
      result[key] = memoryCache[key].data;
    }
  });
  
  return result;
}

/**
 * Update a specific field in a cached object
 * @param key Cache key 
 * @param field Field to update
 * @param value New value
 */
export function updateCachedField<T, K extends keyof T>(key: string, field: K, value: T[K]): void {
  const cached = getCache<T>(key);
  if (cached) {
    const updated = {
      ...cached,
      [field]: value
    };
    setCache<T>(key, updated);
  }
} 