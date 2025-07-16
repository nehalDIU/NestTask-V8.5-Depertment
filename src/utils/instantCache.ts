/**
 * Instant cache utility - All caching functionality disabled
 * This file provides stub implementations to prevent import errors
 */

console.warn('Instant cache functionality has been disabled');

/**
 * Cache a network response - DISABLED
 */
export async function cacheResponse(
  url: string,
  response: Response,
  cacheName?: string
): Promise<void> {
  // Cache functionality disabled
  return Promise.resolve();
}

/**
 * Retrieve a cached response - DISABLED
 */
export async function getCachedResponse(
  url: string,
  cacheName?: string
): Promise<Response | undefined> {
  // Cache functionality disabled
  return undefined;
}

/**
 * Fetch with instant cache - DISABLED (falls back to regular fetch)
 */
export async function fetchWithInstantCache(
  url: string,
  options: RequestInit = {},
  cacheName?: string
): Promise<Response> {
  // Cache functionality disabled - use regular fetch
  return fetch(url, options);
}

/**
 * Clear all instant caches - DISABLED
 */
export async function clearInstantCaches(): Promise<void> {
  // Cache functionality disabled
  return Promise.resolve();
}

/**
 * Warm up the cache with critical routes - DISABLED
 */
export async function warmRouteCache(routes: string[]): Promise<void> {
  // Cache functionality disabled
  return Promise.resolve();
}