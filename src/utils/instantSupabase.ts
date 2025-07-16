import { supabase } from '../lib/supabase';

// All caching functionality disabled - this file now provides direct Supabase access
console.warn('InstantSupabase caching functionality has been disabled');

// Define supported filter types
type FilterType = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'ilike' | 'in' | 'is';

// Cache parameters type (kept for compatibility)
interface CacheOptions {
  cacheName?: string;
  ttl?: number;
  skipCache?: boolean;
  forceFresh?: boolean;
}

// Query parameters with proper typing
interface QueryParams {
  select?: string;
  eq?: Record<string, any>;
  order?: Record<string, { ascending?: boolean; nullsFirst?: boolean }>;
  limit?: number;
  filter?: Partial<Record<FilterType, Record<string, any>>>;
  [key: string]: any;
}

/**
 * Direct read from Supabase - caching disabled
 *
 * @param table Supabase table name
 * @param queryParams Query parameters
 * @param options Cache options (ignored)
 * @returns Promise with data, error, and isFromCache flag (always false)
 */
export async function instantRead(
  table: string,
  queryParams: QueryParams = {},
  options: CacheOptions = {}
) {
  // Caching disabled - perform direct Supabase query
  try {
    // Start building the query
    let query = supabase.from(table).select('*');
    
    // Apply query modifiers if provided
    if (queryParams.select) {
      query = supabase.from(table).select(queryParams.select);
    }
    
    if (queryParams.eq) {
      Object.entries(queryParams.eq).forEach(([column, value]) => {
        query = query.eq(column, value as string);
      });
    }
    
    if (queryParams.order) {
      Object.entries(queryParams.order).forEach(([column, config]) => {
        query = query.order(column, config);
      });
    }
    
    if (queryParams.limit) {
      query = query.limit(queryParams.limit);
    }
    
    if (queryParams.filter) {
      Object.entries(queryParams.filter).forEach(([filterType, config]) => {
        // Type-safe way to handle dynamic filter methods
        const validFilterTypes: FilterType[] = ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'like', 'ilike', 'in', 'is'];
        
        if (validFilterTypes.includes(filterType as FilterType) && config) {
          Object.entries(config).forEach(([column, value]) => {
            // Apply the filter method if it exists on the query
            switch (filterType as FilterType) {
              case 'eq':
                query = query.eq(column, value);
                break;
              case 'neq':
                query = query.neq(column, value);
                break;
              case 'gt':
                query = query.gt(column, value);
                break;
              case 'lt':
                query = query.lt(column, value);
                break;
              case 'gte':
                query = query.gte(column, value);
                break;
              case 'lte':
                query = query.lte(column, value);
                break;
              case 'like':
                query = query.like(column, value as string);
                break;
              case 'ilike':
                query = query.ilike(column, value as string);
                break;
              case 'in':
                query = query.in(column, value as any[]);
                break;
              case 'is':
                query = query.is(column, value as boolean | null);
                break;
            }
          });
        }
      });
    }
    
    // Execute the query
    const { data, error } = await query;

    // Return data without caching
    return { data, error, isFromCache: false };
  } catch (err) {
    console.error('Error fetching from Supabase:', err);
    return { data: null, error: err, isFromCache: false };
  }
}

/**
 * Clear the Supabase cache - DISABLED
 */
export async function clearCache(
  table?: string,
  cacheName?: string
) {
  // Cache functionality disabled
  return Promise.resolve();
}