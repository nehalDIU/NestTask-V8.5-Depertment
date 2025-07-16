// Cache utility - All caching functionality disabled
// This file provides stub implementations to prevent import errors

console.warn('Cache functionality has been disabled');

/**
 * Save data to cache - DISABLED
 */
export function setCache<T>(key: string, data: T): void {
  // Cache functionality disabled
}

/**
 * Get data from cache - DISABLED
 */
export function getCache<T>(key: string): T | null {
  // Cache functionality disabled
  return null;
}

/**
 * Check if cache entry exists and is not expired - DISABLED
 */
export function isCacheValid(key: string, maxAge?: number): boolean {
  // Cache functionality disabled
  return false;
}

/**
 * Remove a specific cache entry - DISABLED
 */
export function invalidateCache(key: string): void {
  // Cache functionality disabled
}

/**
 * Clear all cache entries - DISABLED
 */
export function clearCache(): void {
  // Cache functionality disabled
}

/**
 * Clear cache entries by prefix - DISABLED
 */
export function clearCacheByPrefix(prefix: string): void {
  // Cache functionality disabled
}

/**
 * Get cache size - DISABLED
 */
export function getCacheSize(): number {
  // Cache functionality disabled
  return 0;
}

/**
 * Get all cached data for a specific prefix - DISABLED
 */
export function getCachedData<T>(prefix: string): Record<string, T> {
  // Cache functionality disabled
  return {};
}

/**
 * Update a specific field in a cached object - DISABLED
 */
export function updateCachedField<T, K extends keyof T>(key: string, field: K, value: T[K]): void {
  // Cache functionality disabled
}
