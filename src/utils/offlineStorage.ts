// Offline storage utilities - All functionality disabled
// This file provides stub implementations to prevent import errors

export const STORES = {
  TASKS: 'tasks',
  ROUTINES: 'routines',
  USER_DATA: 'userData',
  COURSES: 'courses',
  MATERIALS: 'materials',
  TEACHERS: 'teachers'
};

// Stub implementations that do nothing
export async function saveToIndexedDB(storeName: string, data: any): Promise<void> {
  console.warn('IndexedDB storage disabled - data not saved');
  return Promise.resolve();
}

export async function getAllFromIndexedDB(storeName: string): Promise<any[]> {
  console.warn('IndexedDB storage disabled - returning empty array');
  return Promise.resolve([]);
}

export async function deleteFromIndexedDB(storeName: string, id: string): Promise<void> {
  console.warn('IndexedDB storage disabled - delete operation ignored');
  return Promise.resolve();
}

export async function clearIndexedDB(): Promise<void> {
  console.warn('IndexedDB storage disabled - clear operation ignored');
  return Promise.resolve();
}
