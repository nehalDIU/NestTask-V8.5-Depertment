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
import { setCache, getCache } from '../utils/cache';

// Define cache keys
const COURSES_CACHE_KEY = 'courses';
const MATERIALS_CACHE_KEY = 'materials';

export function useCourseData() {
  const [courses, setCourses] = useState<Course[]>(() => getCache<Course[]>(COURSES_CACHE_KEY) || []);
  const [materials, setMaterials] = useState<StudyMaterial[]>(() => getCache<StudyMaterial[]>(MATERIALS_CACHE_KEY) || []);
  const [loading, setLoading] = useState(!courses.length && !materials.length);
  const [error, setError] = useState<string | null>(null);

  const refreshCourses = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Always fetch fresh data for admin dashboard
      console.log('Fetching fresh course data');
      const data = await fetchCourses();
      setCourses(data);
      
      // Cache the data
      setCache(COURSES_CACHE_KEY, data);
    } catch (err: any) {
      console.error('Error loading courses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshMaterials = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Always fetch fresh data for admin dashboard
      console.log('Fetching fresh materials data');
      const data = await fetchStudyMaterials();
      setMaterials(data);
      
      // Cache the data
      setCache(MATERIALS_CACHE_KEY, data);
    } catch (err: any) {
      console.error('Error loading materials:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCourses();
    refreshMaterials();

    // Subscribe to changes
    const coursesSubscription = supabase
      .channel('courses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => {
        refreshCourses(true); // Force refresh
      })
      .subscribe();

    const materialsSubscription = supabase
      .channel('materials')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_materials' }, () => {
        refreshMaterials(true); // Force refresh
      })
      .subscribe();

    return () => {
      coursesSubscription.unsubscribe();
      materialsSubscription.unsubscribe();
    };
  }, [refreshCourses, refreshMaterials]);

  const handleCreateCourse = async (course: NewCourse) => {
    try {
      // Create course online
      const newCourse = await createCourse(course);
      
      // Update local state and cache
      setCourses(prev => [...prev, newCourse]);
      setCache(COURSES_CACHE_KEY, [...courses, newCourse]);
      
      return newCourse;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleUpdateCourse = async (id: string, updates: Partial<Course>) => {
    try {
      // Update course online
      const updatedCourse = await updateCourse(id, updates);
      
      // Update local state and cache
      setCourses(prev => prev.map(c => c.id === id ? updatedCourse : c));
      setCache(COURSES_CACHE_KEY, courses.map(c => c.id === id ? updatedCourse : c));
      
      return updatedCourse;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      // Delete course online
      await deleteCourse(id);
      
      // Update local state and cache
      const filteredCourses = courses.filter(c => c.id !== id);
      setCourses(filteredCourses);
      setCache(COURSES_CACHE_KEY, filteredCourses);
      
      return true;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleCreateMaterial = async (material: NewStudyMaterial) => {
    try {
      // Create material online
      await createStudyMaterial(material);
      
      // Refresh materials to get updated list
      await refreshMaterials(true);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleUpdateMaterial = async (id: string, updates: Partial<StudyMaterial>) => {
    try {
      // Update material online
      await updateStudyMaterial(id, updates);
      
      // Refresh materials to get updated list
      await refreshMaterials(true);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      // Delete material online
      await deleteStudyMaterial(id);
      
      // Update local state and cache
      const filteredMaterials = materials.filter(m => m.id !== id);
      setMaterials(filteredMaterials);
      setCache(MATERIALS_CACHE_KEY, filteredMaterials);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleBulkImportCourses = async (coursesToImport: NewCourse[]): Promise<{ success: number; errors: any[] }> => {
    try {
      // Use the bulk import service
      const result = await bulkImportCourses(coursesToImport);
      
      // Refresh courses to get the updated list
      await refreshCourses(true);
      
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
    createCourse: handleCreateCourse,
    updateCourse: handleUpdateCourse,
    deleteCourse: handleDeleteCourse,
    createMaterial: handleCreateMaterial,
    updateMaterial: handleUpdateMaterial,
    deleteMaterial: handleDeleteMaterial,
    bulkImportCourses: handleBulkImportCourses,
    refreshCourses
  };
} 