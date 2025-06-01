import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  fetchCourses, 
  createCourse, 
  updateCourse, 
  deleteCourse,
  fetchStudyMaterials,
  createStudyMaterial,
  updateStudyMaterial,
  deleteStudyMaterial,
  bulkImportCourses
} from '../services/course.service';
import type { Course, NewCourse, StudyMaterial, NewStudyMaterial } from '../types/course';
import { useOfflineStatus } from './useOfflineStatus';
import { setCache, getCache } from '../utils/cache';

// Define cache keys
const COURSES_CACHE_KEY = 'courses';
const MATERIALS_CACHE_KEY = 'materials';

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>(() => getCache<Course[]>(COURSES_CACHE_KEY) || []);
  const [materials, setMaterials] = useState<StudyMaterial[]>(() => getCache<StudyMaterial[]>(MATERIALS_CACHE_KEY) || []);
  const [loading, setLoading] = useState(courses.length === 0 && materials.length === 0);
  const [error, setError] = useState<string | null>(null);
  const isOffline = useOfflineStatus();

  const loadCourses = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      if (isOffline) {
        // When offline, use cached data
        console.log('Offline mode: Loading courses from cache');
        const cachedCourses = getCache<Course[]>(COURSES_CACHE_KEY);
        if (cachedCourses && cachedCourses.length > 0) {
          console.log('Found cached courses:', cachedCourses.length);
          setCourses(cachedCourses);
        } else {
          console.log('No cached courses found');
          setCourses([]);
        }
      } else {
        // Always fetch fresh data, no caching for admin dashboard
        console.log('Admin dashboard: Always fetching fresh course data');
        const data = await fetchCourses();
        setCourses(data);
        
        // Save courses to cache for offline use
        console.log('Saving courses to cache for offline access');
        setCache(COURSES_CACHE_KEY, data);
      }
    } catch (err: any) {
      console.error('Error loading courses:', err);
      setError(err.message);
      
      // If online fetch failed, try to load from cache as fallback
      if (!isOffline) {
        try {
          const cachedCourses = getCache<Course[]>(COURSES_CACHE_KEY);
          if (cachedCourses && cachedCourses.length > 0) {
            console.log('Using cached courses due to fetch error');
            setCourses(cachedCourses);
          }
        } catch (cacheErr) {
          console.error('Error loading fallback courses:', cacheErr);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [isOffline]);

  const loadMaterials = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      if (isOffline) {
        // When offline, use cached data
        console.log('Offline mode: Loading materials from cache');
        const cachedMaterials = getCache<StudyMaterial[]>(MATERIALS_CACHE_KEY);
        if (cachedMaterials && cachedMaterials.length > 0) {
          console.log('Found cached materials:', cachedMaterials.length);
          setMaterials(cachedMaterials);
        } else {
          console.log('No cached materials found');
          setMaterials([]);
        }
      } else {
        // Always fetch fresh data, no caching for admin dashboard
        console.log('Admin dashboard: Always fetching fresh materials data');
        const data = await fetchStudyMaterials();
        setMaterials(data);
        
        // Save materials to cache for offline use
        console.log('Saving materials to cache for offline access');
        setCache(MATERIALS_CACHE_KEY, data);
      }
    } catch (err: any) {
      console.error('Error loading materials:', err);
      setError(err.message);
      
      // If online fetch failed, try to load from cache as fallback
      if (!isOffline) {
        try {
          const cachedMaterials = getCache<StudyMaterial[]>(MATERIALS_CACHE_KEY);
          if (cachedMaterials && cachedMaterials.length > 0) {
            console.log('Using cached materials due to fetch error');
            setMaterials(cachedMaterials);
          }
        } catch (cacheErr) {
          console.error('Error loading fallback materials:', cacheErr);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [isOffline]);

  useEffect(() => {
    loadCourses();
    loadMaterials();

    // Subscribe to changes when online
    if (!isOffline) {
      const coursesSubscription = supabase
        .channel('courses')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => {
          loadCourses(true); // Force refresh
        })
        .subscribe();

      const materialsSubscription = supabase
        .channel('materials')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'study_materials' }, () => {
          loadMaterials(true); // Force refresh
        })
        .subscribe();

      return () => {
        coursesSubscription.unsubscribe();
        materialsSubscription.unsubscribe();
      };
    }
  }, [loadCourses, loadMaterials, isOffline]);

  const handleCreateCourse = async (course: NewCourse) => {
    try {
      if (isOffline) {
        throw new Error('Cannot create courses while offline');
      } else {
        // Online mode
        const newCourse = await createCourse(course);
        
        // Update state and cache
        setCourses(prev => [...prev, newCourse]);
        setCache(COURSES_CACHE_KEY, [...courses, newCourse]);
        
        return newCourse;
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleUpdateCourse = async (id: string, updates: Partial<Course>) => {
    try {
      if (isOffline) {
        throw new Error('Cannot update courses while offline');
      } else {
        // Online mode
        await updateCourse(id, updates);
        
        // Get the updated course for state and cache
        const updatedCourses = courses.map(c => c.id === id ? { ...c, ...updates } : c);
        setCourses(updatedCourses);
        setCache(COURSES_CACHE_KEY, updatedCourses);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      if (isOffline) {
        throw new Error('Cannot delete courses while offline');
      } else {
        // Online mode
        await deleteCourse(id);
        
        // Update state and cache
        const filteredCourses = courses.filter(c => c.id !== id);
        setCourses(filteredCourses);
        setCache(COURSES_CACHE_KEY, filteredCourses);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleCreateMaterial = async (material: NewStudyMaterial) => {
    try {
      if (isOffline) {
        throw new Error('Cannot create study materials while offline');
      } else {
        // Online mode
        await createStudyMaterial(material);
        
        // Refresh to get updated list
        await loadMaterials(true);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleUpdateMaterial = async (id: string, updates: Partial<StudyMaterial>) => {
    try {
      if (isOffline) {
        throw new Error('Cannot update study materials while offline');
      } else {
        // Online mode
        await updateStudyMaterial(id, updates);
        
        // Refresh to get updated list
        await loadMaterials(true);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      if (isOffline) {
        throw new Error('Cannot delete study materials while offline');
      } else {
        // Online mode
        await deleteStudyMaterial(id);
        
        // Update state and cache
        const filteredMaterials = materials.filter(m => m.id !== id);
        setMaterials(filteredMaterials);
        setCache(MATERIALS_CACHE_KEY, filteredMaterials);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleBulkImportCourses = async (courses: NewCourse[]): Promise<{ success: number; errors: any[] }> => {
    try {
      if (isOffline) {
        throw new Error('Cannot import courses while offline');
      } else {
        // Online mode
        const result = await bulkImportCourses(courses);
        await loadCourses(true);
        return result;
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    courses,
    materials,
    loading,
    error,
    createCourse: handleCreateCourse,
    updateCourse: handleUpdateCourse,
    deleteCourse: handleDeleteCourse,
    createMaterial: handleCreateMaterial,
    updateMaterial: handleUpdateMaterial,
    deleteMaterial: handleDeleteMaterial,
    bulkImportCourses: handleBulkImportCourses,
    refreshCourses: () => loadCourses(true)
  };
}