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
// Offline functionality removed

// Cache functionality disabled

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Offline functionality removed

  const loadCourses = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Always fetch fresh data - caching disabled
      console.log('Fetching fresh course data');
      const data = await fetchCourses();
      setCourses(data);
    } catch (err: any) {
      console.error('Error loading courses:', err);
      setError(err.message);
      
      // Cache fallback disabled
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMaterials = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Always fetch fresh data - caching disabled
      console.log('Fetching fresh materials data');
      const data = await fetchStudyMaterials();
      setMaterials(data);
    } catch (err: any) {
      console.error('Error loading materials:', err);
      setError(err.message);
      
      // Cache fallback disabled
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
      // Create course
      const newCourse = await createCourse(course);

      // Update state
      setCourses(prev => [...prev, newCourse]);

      return newCourse;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleUpdateCourse = async (id: string, updates: Partial<Course>) => {
    try {
      // Update course
      await updateCourse(id, updates);

      // Update state
      const updatedCourses = courses.map(c => c.id === id ? { ...c, ...updates } : c);
      setCourses(updatedCourses);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      // Delete course
      await deleteCourse(id);

      // Update state
      const filteredCourses = courses.filter(c => c.id !== id);
      setCourses(filteredCourses);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleCreateMaterial = async (material: NewStudyMaterial) => {
    try {
      // Create study material
      await createStudyMaterial(material);

      // Refresh to get updated list
      await loadMaterials(true);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleUpdateMaterial = async (id: string, updates: Partial<StudyMaterial>) => {
    try {
      // Update study material
      await updateStudyMaterial(id, updates);

      // Refresh to get updated list
      await loadMaterials(true);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      // Delete study material
      await deleteStudyMaterial(id);

      // Update state
      const filteredMaterials = materials.filter(m => m.id !== id);
      setMaterials(filteredMaterials);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleBulkImportCourses = async (courses: NewCourse[]): Promise<{ success: number; errors: any[] }> => {
    try {
      // Import courses
      const result = await bulkImportCourses(courses);
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