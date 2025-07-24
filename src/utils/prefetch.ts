import { supabase } from '../lib/supabase';
import { lazyLoad, preloadComponent } from './lazyLoad';
import { setCache, getCache, isCacheValid } from './cache';

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
 * Prefetch API data and store in memory cache
 * @param tableName Supabase table name
 * @param queryFn Function that returns the Supabase query
 * @param cacheKey Unique key for this query
 * @param options Prefetch options
 */
export const prefetchApiData = async (
  tableName: string,
  queryFn: (query: any) => any,
  cacheKey: string,
  options: PrefetchOptions = {}
) => {
  if (prefetchedQueries.has(cacheKey) || !navigator.onLine) return;
  prefetchedQueries.add(cacheKey);
  
  try {
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Set timeout if specified
    if (options.timeout) {
      setTimeout(() => controller.abort(), options.timeout);
    }
    
    const query = supabase.from(tableName);
    const queryWithOptions = queryFn(query);
    
    // Execute the query
    const { data, error } = await queryWithOptions;
    
    if (error) {
      prefetchedQueries.delete(cacheKey); // Allow retry on error
      return;
    }
    
    if (data) {
      // Store in cache with timestamp
      setCache(cacheKey, data);
    }
  } catch (err: unknown) {
    prefetchedQueries.delete(cacheKey); // Allow retry on error
  }
};

/**
 * Get cached data if available
 * @param cacheKey The key to look up in the cache
 * @returns The cached data or null if not found
 */
export const getCachedData = (cacheKey: string) => {
  return getCache(cacheKey);
};

/**
 * Prefetch multiple resources in parallel with priority
 * @param resources Array of resources to prefetch
 */
export const prefetchResources = async (resources: Array<{
  type: 'route' | 'api' | 'asset';
  key: string;
  loader: any;
  options?: PrefetchOptions;
}>) => {
  if (!navigator.onLine) return;
  
  // Process high priority resources immediately
  const highPriorityResources = resources.filter(r => r.options?.priority === 'high');
  
  highPriorityResources.forEach(resource => {
    if (resource.type === 'route') {
      prefetchRoute(resource.loader, resource.key);
    } else if (resource.type === 'api' && resource.loader) {
      const { tableName, queryFn } = resource.loader;
      prefetchApiData(tableName, queryFn, resource.key, resource.options);
    } else if (resource.type === 'asset' && typeof resource.loader === 'string') {
      prefetchAsset(resource.loader);
    }
  });
  
  // Process other resources during idle time
  if ('requestIdleCallback' in window) {
    const otherResources = resources.filter(r => r.options?.priority !== 'high');
    
    (window as any).requestIdleCallback(() => {
      otherResources.forEach(resource => {
        if (resource.type === 'route') {
          prefetchRoute(resource.loader, resource.key);
        } else if (resource.type === 'api' && resource.loader) {
          const { tableName, queryFn } = resource.loader;
          prefetchApiData(tableName, queryFn, resource.key, resource.options);
        } else if (resource.type === 'asset' && typeof resource.loader === 'string') {
          prefetchAsset(resource.loader);
        }
      });
    }, { timeout: 2000 });
  }
};

/**
 * Prefetch an asset (image, CSS, etc.)
 * @param url The URL of the asset to prefetch
 */
export const prefetchAsset = (url: string) => {
  if (!url || !navigator.onLine) return;
  
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  link.as = url.endsWith('.css') ? 'style' : 
            url.endsWith('.js') ? 'script' : 
            url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/) ? 'image' : 
            'fetch';
  
  document.head.appendChild(link);
};

/**
 * Clear prefetch cache to avoid outdated data
 */
export const clearPrefetchCache = () => {
  prefetchedRoutes.clear();
  prefetchedQueries.clear();
}; 