/**
 * Supabase helper utilities
 * These utilities help with common Supabase operations with better error handling
 */

import { supabase } from '../lib/supabase';

// Maximum retries for database operations
const MAX_RETRIES = 3;
// Base delay for exponential backoff (in ms)
const BASE_RETRY_DELAY = 500;

/**
 * Fetch data from Supabase with retry mechanism
 * @param tableName - The name of the table to query
 * @param query - Optional query function to customize the query
 * @param options - Additional options for the fetch operation
 * @returns The fetched data or null if there was an error
 */
export async function fetchWithRetry<T = any>(
  tableName: string,
  query?: (q: any) => any,
  options: {
    retries?: number;
    debugInfo?: string;
    errorHandler?: (error: any) => void;
  } = {}
): Promise<T[] | null> {
  const { retries = MAX_RETRIES, debugInfo = '', errorHandler } = options;
  
  // For debugging
  const startTime = Date.now();
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Add exponential backoff for retries
      if (attempt > 0) {
        const delay = BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`[Retry ${attempt}/${retries}] Retrying fetch for ${tableName}...`);
      }
      
      // Start with the base query
      let queryBuilder = supabase.from(tableName).select();
      
      // Apply custom query if provided
      if (query) {
        queryBuilder = query(queryBuilder);
      }
      
      // Execute the query
      const { data, error } = await queryBuilder;
      
      if (error) {
        console.error(`Error fetching from ${tableName} (attempt ${attempt + 1}/${retries}):`, error);
        
        // Check if this is a token/auth error
        if (error.code === 'PGRST301' || error.message.includes('JWT')) {
          console.warn('JWT token invalid, signing out and stopping retries');
          await supabase.auth.signOut();
          return null;
        }
        
        // Last retry attempt failed
        if (attempt === retries - 1) {
          if (errorHandler) {
            errorHandler(error);
          }
          return null;
        }
        
        // Continue to next retry
        continue;
      }
      
      // If successful, log timing for debug
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.log(`[Slow Query] ${tableName} took ${duration}ms ${debugInfo}`);
      }
      
      return data as T[];
    } catch (error) {
      console.error(`Unexpected error fetching from ${tableName}:`, error);
      
      // Last retry attempt failed
      if (attempt === retries - 1) {
        if (errorHandler) {
          errorHandler(error);
        }
        return null;
      }
    }
  }
  
  return null;
}

/**
 * Insert data into Supabase with retry mechanism
 * @param tableName - The name of the table to insert into
 * @param data - The data to insert
 * @param options - Additional options for the operation
 * @returns The inserted data or null if there was an error
 */
export async function insertWithRetry<T = any>(
  tableName: string,
  data: any,
  options: {
    retries?: number;
    errorHandler?: (error: any) => void;
  } = {}
): Promise<T | null> {
  const { retries = MAX_RETRIES, errorHandler } = options;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Add exponential backoff for retries
      if (attempt > 0) {
        const delay = BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`[Retry ${attempt}/${retries}] Retrying insert for ${tableName}...`);
      }
      
      // Execute the insert
      const { data: insertedData, error } = await supabase
        .from(tableName)
        .insert(data)
        .select()
        .single();
      
      if (error) {
        console.error(`Error inserting into ${tableName} (attempt ${attempt + 1}/${retries}):`, error);
        
        // Check if this is a token/auth error
        if (error.code === 'PGRST301' || error.message.includes('JWT')) {
          console.warn('JWT token invalid, signing out and stopping retries');
          await supabase.auth.signOut();
          return null;
        }
        
        // Last retry attempt failed
        if (attempt === retries - 1) {
          if (errorHandler) {
            errorHandler(error);
          }
          return null;
        }
        
        // Continue to next retry
        continue;
      }
      
      return insertedData as T;
    } catch (error) {
      console.error(`Unexpected error inserting into ${tableName}:`, error);
      
      // Last retry attempt failed
      if (attempt === retries - 1) {
        if (errorHandler) {
          errorHandler(error);
        }
        return null;
      }
    }
  }
  
  return null;
}

/**
 * Update data in Supabase with retry mechanism
 * @param tableName - The name of the table to update
 * @param match - The match criteria (e.g., { id: 123 })
 * @param data - The data to update
 * @param options - Additional options for the operation
 * @returns The updated data or null if there was an error
 */
export async function updateWithRetry<T = any>(
  tableName: string,
  match: Record<string, any>,
  data: any,
  options: {
    retries?: number;
    errorHandler?: (error: any) => void;
  } = {}
): Promise<T | null> {
  const { retries = MAX_RETRIES, errorHandler } = options;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Add exponential backoff for retries
      if (attempt > 0) {
        const delay = BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`[Retry ${attempt}/${retries}] Retrying update for ${tableName}...`);
      }
      
      // Build query with match criteria
      let query = supabase.from(tableName).update(data);
      
      // Apply match criteria
      Object.entries(match).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      // Execute with returning data
      const { data: updatedData, error } = await query.select().single();
      
      if (error) {
        console.error(`Error updating ${tableName} (attempt ${attempt + 1}/${retries}):`, error);
        
        // Check if this is a token/auth error
        if (error.code === 'PGRST301' || error.message.includes('JWT')) {
          console.warn('JWT token invalid, signing out and stopping retries');
          await supabase.auth.signOut();
          return null;
        }
        
        // Last retry attempt failed
        if (attempt === retries - 1) {
          if (errorHandler) {
            errorHandler(error);
          }
          return null;
        }
        
        // Continue to next retry
        continue;
      }
      
      return updatedData as T;
    } catch (error) {
      console.error(`Unexpected error updating ${tableName}:`, error);
      
      // Last retry attempt failed
      if (attempt === retries - 1) {
        if (errorHandler) {
          errorHandler(error);
        }
        return null;
      }
    }
  }
  
  return null;
}

/**
 * Check if the database connection is working
 * @returns True if connection is working, false otherwise
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // If we're in development mode, bypass the check
    if (import.meta.env.DEV) {
      return true;
    }
    
    // Test with a simple query
    const { data, error } = await supabase
      .from('tasks')
      .select('count', { count: 'exact', head: true })
      .limit(1);
    
    if (error) {
      console.error('Database connection check failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error checking database connection:', error);
    return false;
  }
} 