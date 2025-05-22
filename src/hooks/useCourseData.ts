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
import { getCachedData } from '../utils/prefetch';

// In-memory cache for courses and materials
const courseCache = new Map<string, { data: Course[]; timestamp: string }>();
const materialCache = new Map<string, { data: StudyMaterial[]; timestamp: string }>();

export function useCourseData() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      if (!forceRefresh) {
        // Try to get courses from memory cache
        const cachedCourses = getCachedData('courses');
        if (cachedCourses) {
          console.log('Using cached courses');
          setCourses(cachedCourses);
          setLoading(false);
          
          // Fetch fresh data in the background
          try {
            const freshData = await fetchCourses();
            setCourses(freshData);
            courseCache.set('courses', {
              data: freshData,
              timestamp: new Date().toISOString()
            });
          } catch (err) {
            console.error('Background fetch failed for courses:', err);
          }
          return;
        }
      }
      
      // No cache or force refresh, fetch fresh data
      console.log('Fetching fresh course data');
      const data = await fetchCourses();
      setCourses(data);
      
      // Update cache
      courseCache.set('courses', {
        data,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Error loading courses:', err);
      setError(err.message);
      
      // Try to use cached data as fallback
      const cachedCourses = getCachedData('courses');
      if (cachedCourses) {
        console.log('Using cached courses due to fetch error');
        setCourses(cachedCourses);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMaterials = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      if (!forceRefresh) {
        // Try to get materials from memory cache
        const cachedMaterials = getCachedData('materials');
        if (cachedMaterials) {
          console.log('Using cached materials');
          setMaterials(cachedMaterials);
          setLoading(false);
          
          // Fetch fresh data in the background
          try {
            const freshData = await fetchStudyMaterials();
            setMaterials(freshData);
            materialCache.set('materials', {
              data: freshData,
              timestamp: new Date().toISOString()
            });
          } catch (err) {
            console.error('Background fetch failed for materials:', err);
          }
          return;
        }
      }
      
      // No cache or force refresh, fetch fresh data
      console.log('Fetching fresh materials data');
      const data = await fetchStudyMaterials();
      setMaterials(data);
      
      // Update cache
      materialCache.set('materials', {
        data,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Error loading materials:', err);
      setError(err.message);
      
      // Try to use cached data as fallback
      const cachedMaterials = getCachedData('materials');
      if (cachedMaterials) {
        console.log('Using cached materials due to fetch error');
        setMaterials(cachedMaterials);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
    loadMaterials();

    // Subscribe to changes
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
  }, [loadCourses, loadMaterials]);

  const handleCreateCourse = async (course: NewCourse) => {
    try {
      const newCourse = await createCourse(course);
      
      // Update state and cache
      setCourses(prev => [...prev, newCourse]);
      const currentCache = courseCache.get('courses');
      if (currentCache) {
        courseCache.set('courses', {
          data: [...currentCache.data, newCourse],
          timestamp: new Date().toISOString()
        });
      }
      
      return newCourse;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleUpdateCourse = async (id: string, updates: Partial<Course>) => {
    try {
      const updatedCourse = await updateCourse(id, updates);
      
      // Update state and cache
      setCourses(prev => prev.map(c => c.id === id ? updatedCourse : c));
      const currentCache = courseCache.get('courses');
      if (currentCache) {
        courseCache.set('courses', {
          data: currentCache.data.map(c => c.id === id ? updatedCourse : c),
          timestamp: new Date().toISOString()
        });
      }
      
      return updatedCourse;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      await deleteCourse(id);
      
      // Update state and cache
      setCourses(prev => prev.filter(c => c.id !== id));
      const currentCache = courseCache.get('courses');
      if (currentCache) {
        courseCache.set('courses', {
          data: currentCache.data.filter(c => c.id !== id),
          timestamp: new Date().toISOString()
        });
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleCreateMaterial = async (material: NewStudyMaterial) => {
    try {
      const newMaterial = await createStudyMaterial(material);
      
      // Update state and cache
      setMaterials(prev => [...prev, newMaterial]);
      const currentCache = materialCache.get('materials');
      if (currentCache) {
        materialCache.set('materials', {
          data: [...currentCache.data, newMaterial],
          timestamp: new Date().toISOString()
        });
      }
      
      return newMaterial;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleUpdateMaterial = async (id: string, updates: Partial<StudyMaterial>) => {
    try {
      const updatedMaterial = await updateStudyMaterial(id, updates);
      
      // Update state and cache
      setMaterials(prev => prev.map(m => m.id === id ? updatedMaterial : m));
      const currentCache = materialCache.get('materials');
      if (currentCache) {
        materialCache.set('materials', {
          data: currentCache.data.map(m => m.id === id ? updatedMaterial : m),
          timestamp: new Date().toISOString()
        });
      }
      
      return updatedMaterial;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      await deleteStudyMaterial(id);
      
      // Update state and cache
      setMaterials(prev => prev.filter(m => m.id !== id));
      const currentCache = materialCache.get('materials');
      if (currentCache) {
        materialCache.set('materials', {
          data: currentCache.data.filter(m => m.id !== id),
          timestamp: new Date().toISOString()
        });
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleBulkImportCourses = async (courses: NewCourse[]): Promise<{ success: number; errors: any[] }> => {
    try {
      const result = await bulkImportCourses(courses);
      
      // Refresh courses after bulk import
      await loadCourses(true);
      
      return result;
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
    refreshCourses: () => loadCourses(true),
    refreshMaterials: () => loadMaterials(true),
    createCourse: handleCreateCourse,
    updateCourse: handleUpdateCourse,
    deleteCourse: handleDeleteCourse,
    createMaterial: handleCreateMaterial,
    updateMaterial: handleUpdateMaterial,
    deleteMaterial: handleDeleteMaterial,
    bulkImportCourses: handleBulkImportCourses
  };
} 