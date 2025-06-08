import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  fetchTeachers, 
  createTeacher, 
  updateTeacher, 
  deleteTeacher,
  bulkImportTeachers as bulkImportTeachersService,
  TeacherBulkImportItem
} from '../services/teacher.service';
import type { Teacher, NewTeacher } from '../types/teacher';
import type { Course } from '../types/course';
import { useOfflineStatus } from './useOfflineStatus';
import { setCache, getCache, clearCacheByPrefix } from '../utils/cache';

// Define cache keys
const TEACHERS_CACHE_KEY = 'teachers';

export function useTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>(() => getCache<Teacher[]>(TEACHERS_CACHE_KEY) || []);
  const [loading, setLoading] = useState(teachers.length === 0);
  const [error, setError] = useState<string | null>(null);
  const isOffline = useOfflineStatus();

  const loadTeachers = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      if (isOffline) {
        // When offline, get teachers from memory cache
        console.log('Offline mode: Using cached teacher data');
        const cachedTeachers = getCache<Teacher[]>(TEACHERS_CACHE_KEY);
        if (cachedTeachers && cachedTeachers.length > 0) {
          console.log('Found cached teachers:', cachedTeachers.length);
          setTeachers(cachedTeachers);
        } else {
          console.log('No cached teachers found');
          setTeachers([]);
        }
      } else {
        // Always fetch fresh data, no caching for admin dashboard
        console.log('Admin dashboard: Always fetching fresh teacher data');
        const data = await fetchTeachers();
        setTeachers(data);
        
        // Save teachers to memory cache
        console.log('Saving teachers to cache');
        setCache(TEACHERS_CACHE_KEY, data);
      }
    } catch (err: any) {
      console.error('Error loading teachers:', err);
      setError(err.message);
      
      // If online fetch failed, try to use cache as fallback
      if (!isOffline) {
        try {
          const cachedTeachers = getCache<Teacher[]>(TEACHERS_CACHE_KEY);
          if (cachedTeachers && cachedTeachers.length > 0) {
            console.log('Using cached teachers due to fetch error');
            setTeachers(cachedTeachers);
          }
        } catch (cacheErr) {
          console.error('Error loading fallback teachers:', cacheErr);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [isOffline]);

  useEffect(() => {
    loadTeachers();

    // Subscribe to changes when online
    if (!isOffline) {
      const subscription = supabase
        .channel('teachers')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'teachers'
          },
          () => {
            loadTeachers(true);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [loadTeachers, isOffline]);

  const handleCreateTeacher = async (teacher: NewTeacher, courseIds: string[]) => {
    try {
      setError(null);
      
      if (isOffline) {
        throw new Error('Cannot create teachers while offline');
      } else {
        // Online mode
        await createTeacher(teacher, courseIds);
        await loadTeachers(true);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleUpdateTeacher = async (id: string, updates: Partial<Teacher>, courseIds: string[]) => {
    try {
      setError(null);
      
      if (isOffline) {
        throw new Error('Cannot update teachers while offline');
      } else {
        // Online mode
        await updateTeacher(id, updates, courseIds);
        await loadTeachers(true);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    try {
      setError(null);
      
      // Immediately remove teacher from state for better UI responsiveness
      setTeachers(prev => {
        const filteredTeachers = prev.filter(t => t.id !== id);
        setCache(TEACHERS_CACHE_KEY, filteredTeachers);
        return filteredTeachers;
      });
      
      if (isOffline) {
        throw new Error('Cannot delete teachers while offline');
      } else {
        // Online mode - attempt database deletion
        try {
          console.log(`Initiating deletion of teacher with ID: ${id} from database`);
          
          // Call the service function to delete the teacher
          await deleteTeacher(id);
          
          console.log(`Teacher ${id} successfully deleted from database`);
          
        } catch (deleteError: any) {
          console.error('Error in teacher deletion operation:', deleteError);
          setError(`Failed to delete teacher: ${deleteError.message || 'Unknown error'}`);
          // Restore the teacher in the state if deletion fails
          await loadTeachers(true);
        }
      }
      
      // Force a refresh from the database after a small delay to ensure consistency
      setTimeout(() => {
        loadTeachers(true);
      }, 500);
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete teacher');
      throw err;
    }
  };

  const handleBulkImportTeachers = async (teachersData: TeacherBulkImportItem[]): Promise<{ success: number; errors: any[] }> => {
    try {
      // Bulk import is only available online
      if (isOffline) {
        throw new Error('Cannot bulk import teachers while offline');
      }
      
      const result = await bulkImportTeachersService(teachersData);
      
      // Reload teachers to get updated data
      await loadTeachers(true);
      
      return result;
    } catch (error: any) {
      console.error('Error in bulk import teachers:', error);
      setError(error.message);
      throw error;
    }
  };

  return {
    teachers,
    loading,
    error,
    createTeacher: handleCreateTeacher,
    updateTeacher: handleUpdateTeacher,
    deleteTeacher: handleDeleteTeacher,
    bulkImportTeachers: handleBulkImportTeachers,
    refreshTeachers: () => loadTeachers(true)
  };
}