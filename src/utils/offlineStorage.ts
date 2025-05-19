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

// Cache expiration time in milliseconds (4 hours)
const CACHE_EXPIRATION = 4 * 60 * 60 * 1000;

/**
 * Initialize the IndexedDB database
 */
export const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.TASKS)) {
          db.createObjectStore(STORES.TASKS, { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains(STORES.ROUTINES)) {
          db.createObjectStore(STORES.ROUTINES, { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
          db.createObjectStore(STORES.USER_DATA, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.COURSES)) {
          db.createObjectStore(STORES.COURSES, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.MATERIALS)) {
          db.createObjectStore(STORES.MATERIALS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.TEACHERS)) {
          db.createObjectStore(STORES.TEACHERS, { keyPath: 'id' });
        }

        // Create pending operations stores
        if (!db.objectStoreNames.contains(STORES.PENDING_TASK_OPS)) {
          db.createObjectStore(STORES.PENDING_TASK_OPS, { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains(STORES.PENDING_ROUTINE_OPS)) {
          db.createObjectStore(STORES.PENDING_ROUTINE_OPS, { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains(STORES.PENDING_COURSE_OPS)) {
          db.createObjectStore(STORES.PENDING_COURSE_OPS, { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains(STORES.PENDING_TEACHER_OPS)) {
          db.createObjectStore(STORES.PENDING_TEACHER_OPS, { keyPath: 'id', autoIncrement: true });
        }
        
        console.log(`IndexedDB database ${DB_NAME} upgraded to version ${DB_VERSION}`);
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log(`IndexedDB database ${DB_NAME} opened successfully`);
        resolve(db);
      };
      
      request.onerror = (event) => {
        console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    } catch (error) {
      console.error('Error opening IndexedDB:', error);
      reject(error);
    }
  });
};

/**
 * Save data to IndexedDB
 * @param storeName The name of the store to save data to
 * @param data The data to save
 */
export async function saveToIndexedDB(storeName: string, data: any): Promise<void> {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Handle array of items or single item
      if (Array.isArray(data)) {
        // Create a counter to track completion
        let completed = 0;
        const total = data.length;
        
        data.forEach(item => {
          // Add timestamp if not present
          if (!item.cached_at) {
            item.cached_at = new Date().toISOString();
          }
          
          const request = store.put(item);
          
          request.onsuccess = () => {
            completed++;
            if (completed === total) {
              resolve();
            }
          };
          
          request.onerror = (event) => {
            console.error('Error saving item to IndexedDB:', (event.target as IDBRequest).error);
            reject((event.target as IDBRequest).error);
          };
        });
      } else {
        // Single item
        // Add timestamp if not present
        if (!data.cached_at) {
          data.cached_at = new Date().toISOString();
        }
        
        const request = store.put(data);
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = (event) => {
          console.error('Error saving item to IndexedDB:', (event.target as IDBRequest).error);
          reject((event.target as IDBRequest).error);
        };
      }
      
      transaction.oncomplete = () => {
        db.close();
      };
      
      transaction.onerror = (event) => {
        console.error('Transaction error:', (event.target as IDBTransaction).error);
        reject((event.target as IDBTransaction).error);
      };
    });
  } catch (error) {
    console.error('Error in saveToIndexedDB:', error);
    throw error;
  }
}

/**
 * Get all data from a store in IndexedDB
 * @param storeName The name of the store to get data from
 */
export async function getAllFromIndexedDB(storeName: string): Promise<any[]> {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      
      request.onerror = (event) => {
        console.error('Error getting all from IndexedDB:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error in getAllFromIndexedDB:', error);
    return [];
  }
}

/**
 * Get a specific item by ID from IndexedDB
 * @param storeName The name of the store to get data from
 * @param id The ID of the item to get
 */
export async function getByIdFromIndexedDB(storeName: string, id: string): Promise<any> {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = (event) => {
        console.error('Error getting item by ID from IndexedDB:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error in getByIdFromIndexedDB:', error);
    return null;
  }
}

/**
 * Delete data from IndexedDB
 * @param storeName The name of the store to delete data from
 * @param id The ID of the item to delete
 */
export async function deleteFromIndexedDB(storeName: string, id: string): Promise<void> {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Error deleting from IndexedDB:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error in deleteFromIndexedDB:', error);
    throw error;
  }
}

/**
 * Clear all data from a store in IndexedDB
 * @param storeName The name of the store to clear
 */
export async function clearIndexedDBStore(storeName: string): Promise<void> {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Error clearing IndexedDB store:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error in clearIndexedDBStore:', error);
    throw error;
  }
}

/**
 * Clean up stale cache data
 */
export async function cleanupStaleCacheData(): Promise<void> {
  try {
    const db = await openDatabase();
    const now = new Date();
    
    // Get all stores
    const storeNames = Array.from(db.objectStoreNames);
    
    // Process each store
    for (const storeName of storeNames) {
      // Skip pending operations stores
      if (storeName.startsWith('pending')) {
        continue;
      }
      
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const items = request.result || [];
        const deletePromises = [];
        
        for (const item of items) {
          // Skip items without a cached_at timestamp
          if (!item.cached_at) {
            continue;
          }
          
          const cachedAt = new Date(item.cached_at);
          const age = now.getTime() - cachedAt.getTime();
          
          // Delete if older than cache expiration
          if (age > CACHE_EXPIRATION) {
            deletePromises.push(deleteFromIndexedDB(storeName, item.id));
          }
        }
        
        Promise.all(deletePromises).catch(error => {
          console.error('Error deleting stale cache data:', error);
        });
      };
      
      request.onerror = (event) => {
        console.error('Error getting items for cleanup:', (event.target as IDBRequest).error);
      };
    }
    
    db.close();
  } catch (error) {
    console.error('Error in cleanupStaleCacheData:', error);
  }
}

/**
 * Add operation to pending operations queue
 * @param storePrefix The prefix of the pending operations store (e.g. 'pendingTaskOperations')
 * @param operation The operation to add (create, update, delete)
 * @param data The data for the operation
 */
export async function addToPendingOperations(
  storePrefix: string,
  operation: 'create' | 'update' | 'delete',
  data: any
): Promise<void> {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storePrefix, 'readwrite');
      const store = transaction.objectStore(storePrefix);
      
      const pendingOp = {
        operation,
        data,
        timestamp: new Date().toISOString()
      };
      
      const request = store.add(pendingOp);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Error adding to pending operations:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error in addToPendingOperations:', error);
    throw error;
  }
}

/**
 * Get all pending operations
 * @param storePrefix The prefix of the pending operations store
 */
export async function getPendingOperations(storePrefix: string): Promise<any[]> {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storePrefix, 'readonly');
      const store = transaction.objectStore(storePrefix);
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      
      request.onerror = (event) => {
        console.error('Error getting pending operations:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error in getPendingOperations:', error);
    return [];
  }
}

/**
 * Remove operation from pending operations
 * @param storePrefix The prefix of the pending operations store
 * @param id The ID of the operation to remove
 */
export async function removePendingOperation(storePrefix: string, id: number | string): Promise<void> {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storePrefix, 'readwrite');
      const store = transaction.objectStore(storePrefix);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Error removing pending operation:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error in removePendingOperation:', error);
    throw error;
  }
}

/**
 * Clear user data from a specific store
 * @param storeName The name of the store to clear
 * @param userId The ID of the user whose data to clear
 */
export async function clearUserDataFromStore(storeName: string, userId: string): Promise<void> {
  try {
    const items = await getAllFromIndexedDB(storeName);
    
    // Find items belonging to the user
    const itemsToDelete = items.filter(item => item.userId === userId || item.user_id === userId);
    
    // Delete each item
    for (const item of itemsToDelete) {
      await deleteFromIndexedDB(storeName, item.id);
    }
  } catch (error) {
    console.error('Error in clearUserDataFromStore:', error);
    throw error;
  }
}

/**
 * Refresh the user's cache by invalidating timestamps
 * @param userId The ID of the user whose cache to refresh
 */
export async function refreshUserCache(userId: string): Promise<void> {
  try {
    // Update last_fetched timestamps in user data store
    const userData = await getByIdFromIndexedDB(STORES.USER_DATA, `${userId}_timestamp`);
    
    if (userData) {
      userData.value = new Date().toISOString();
      await saveToIndexedDB(STORES.USER_DATA, userData);
    }
  } catch (error) {
    console.error('Error in refreshUserCache:', error);
    throw error;
  }
}

/**
 * Clear all pending operations
 * @param storePrefix The prefix of the pending operations store
 */
export async function clearPendingOperations(storePrefix: string): Promise<void> {
  try {
    await clearIndexedDBStore(storePrefix);
  } catch (error) {
    console.error('Error in clearPendingOperations:', error);
    throw error;
  }
} 