import { supabase } from '../lib/supabase';
import { lazyLoad, preloadComponent } from './lazyLoad';

// Cache functionality disabled

// Type for prefetch options
export interface PrefetchOptions {
  priority?: 'high' | 'medium' | 'low';
  timeout?: number;
}

// Lightweight tracking sets
const prefetchedRoutes = new Set<string>();
const prefetchedQueries = new Set<string>();

// Maximum cache age (10 minutes)
const MAX_CACHE_AGE = 10 * 60 * 1000;

/**
 * Prefetch a specific route
 * @param importFn The import function for the component
 * @param routeKey A unique key to identify this route
 */
export const prefetchRoute = (importFn: () => Promise<any>, routeKey: string) => {
  if (prefetchedRoutes.has(routeKey) || !navigator.onLine) return;
  prefetchedRoutes.add(routeKey);
  preloadComponent(importFn)();
};

/**
 * Prefetch API data - DISABLED
 */
export const prefetchApiData = async (
  tableName: string,
  queryFn: (query: any) => any,
  cacheKey: string,
  options: PrefetchOptions = {}
) => {
  // Prefetch functionality disabled
  return Promise.resolve();
};

/**
 * Get cached data - DISABLED
 */
export const getCachedData = (cacheKey: string) => {
  // Cache functionality disabled
  return null;
};

/**
 * Prefetch multiple resources - DISABLED
 */
export const prefetchResources = async (resources: Array<{
  type: 'route' | 'api' | 'asset';
  key: string;
  loader: any;
  options?: PrefetchOptions;
}>) => {
  // Prefetch functionality disabled
  return Promise.resolve();
};

/**
 * Prefetch an asset - DISABLED
 */
export const prefetchAsset = (url: string) => {
  // Prefetch functionality disabled
};

/**
 * Clear prefetch cache - DISABLED
 */
export const clearPrefetchCache = () => {
  // Cache functionality disabled
};