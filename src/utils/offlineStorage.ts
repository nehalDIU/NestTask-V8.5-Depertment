/**
 * Utility functions for handling offline data storage using IndexedDB
 * 
 * NOTE: Caching is currently disabled for troubleshooting purposes.
 * These functions will return empty data or no-ops to isolate performance issues.
 */

// IndexedDB database name and version (not used while caching is disabled)
export const DB_NAME = 'nesttask_offline_db';
export const DB_VERSION = 4;

// Store names for different types of data
export const STORES = {
  TASKS: 'tasks',
  ROUTINES: 'routines',
  USER_DATA: 'userData',
  COURSES: 'courses',
  MATERIALS: 'materials',
  TEACHERS: 'teachers',
  // Add pending operations stores
  PENDING_TASK_OPS: 'pendingTaskOperations',
  PENDING_ROUTINE_OPS: 'pendingRoutineOperations',
  PENDING_COURSE_OPS: 'pendingCourseOperations',
  PENDING_TEACHER_OPS: 'pendingTeacherOperations'
};

/**
 * Initialize the IndexedDB database - disabled
 */
export const openDatabase = (): Promise<IDBDatabase> => {
  console.log('Caching is disabled: openDatabase called but disabled');
  
  // Return a promise that rejects since we're not using IndexedDB
  return Promise.reject('IndexedDB is disabled for troubleshooting');
};

/**
 * Save data to IndexedDB - disabled
 * @param storeName The name of the store to save data to
 * @param data The data to save
 */
export async function saveToIndexedDB(storeName: string, data: any): Promise<void> {
  console.log(`Caching is disabled: saveToIndexedDB(${storeName}) called but disabled`);
  
  // No-op function
  return Promise.resolve();
}

/**
 * Get all data from a store in IndexedDB - disabled
 * @param storeName The name of the store to get data from
 */
export async function getAllFromIndexedDB(storeName: string): Promise<any[]> {
  console.log(`Caching is disabled: getAllFromIndexedDB(${storeName}) called but disabled`);
  
  // Return empty array
  return Promise.resolve([]);
}

/**
 * Get a specific item by ID from IndexedDB - disabled
 * @param storeName The name of the store to get data from
 * @param id The ID of the item to get
 */
export async function getByIdFromIndexedDB(storeName: string, id: string): Promise<any> {
  console.log(`Caching is disabled: getByIdFromIndexedDB(${storeName}, ${id}) called but disabled`);
  
  // Return null
  return Promise.resolve(null);
}

/**
 * Delete data from IndexedDB - disabled
 * @param storeName The name of the store to delete data from
 * @param id The ID of the item to delete
 */
export async function deleteFromIndexedDB(storeName: string, id: string): Promise<void> {
  console.log(`Caching is disabled: deleteFromIndexedDB(${storeName}, ${id}) called but disabled`);
  
  // No-op function
  return Promise.resolve();
}

/**
 * Clear all data from a store in IndexedDB - disabled
 * @param storeName The name of the store to clear
 */
export async function clearIndexedDBStore(storeName: string): Promise<void> {
  console.log(`Caching is disabled: clearIndexedDBStore(${storeName}) called but disabled`);
  
  // No-op function
  return Promise.resolve();
}

/**
 * Clean up stale cache data - disabled
 */
export async function cleanupStaleCacheData(): Promise<void> {
  console.log('Caching is disabled: cleanupStaleCacheData called but disabled');
  
  // No-op function
  return Promise.resolve();
}

/**
 * Add operation to pending operations queue - disabled
 * @param storePrefix The prefix of the pending operations store (e.g. 'pendingTaskOperations')
 * @param operation The operation to add (create, update, delete)
 * @param data The data for the operation
 */
export async function addToPendingOperations(
  storePrefix: string,
  operation: 'create' | 'update' | 'delete',
  data: any
): Promise<void> {
  console.log(`Caching is disabled: addToPendingOperations(${storePrefix}, ${operation}) called but disabled`);
  
  // No-op function
  return Promise.resolve();
}

/**
 * Get all pending operations - disabled
 * @param storePrefix The prefix of the pending operations store
 */
export async function getPendingOperations(storePrefix: string): Promise<any[]> {
  console.log(`Caching is disabled: getPendingOperations(${storePrefix}) called but disabled`);
  
  // Return empty array
  return Promise.resolve([]);
}

/**
 * Remove operation from pending operations - disabled
 * @param storePrefix The prefix of the pending operations store
 * @param id The ID of the operation to remove
 */
export async function removePendingOperation(storePrefix: string, id: string): Promise<void> {
  console.log(`Caching is disabled: removePendingOperation(${storePrefix}, ${id}) called but disabled`);
  
  // No-op function
  return Promise.resolve();
}

/**
 * Clear user data from a specific store - disabled
 * @param storeName The name of the store to clear
 * @param userId The ID of the user whose data to clear
 */
export async function clearUserDataFromStore(storeName: string, userId: string): Promise<void> {
  console.log(`Caching is disabled: clearUserDataFromStore(${storeName}, ${userId}) called but disabled`);
  
  // No-op function
  return Promise.resolve();
}

/**
 * Refresh the user's cache by invalidating timestamps - disabled
 * @param userId The ID of the user whose cache to refresh
 */
export async function refreshUserCache(userId: string): Promise<void> {
  console.log(`Caching is disabled: refreshUserCache(${userId}) called but disabled`);
  
  // No-op function
  return Promise.resolve();
}

/**
 * Clear all pending operations - disabled
 * @param storePrefix The prefix of the pending operations store
 */
export async function clearPendingOperations(storePrefix: string): Promise<void> {
  console.log(`Caching is disabled: clearPendingOperations(${storePrefix}) called but disabled`);
  
  // No-op function
  return Promise.resolve();
} 