import { useCourseData } from './useCourseData';
import type { Course, NewCourse, StudyMaterial, NewStudyMaterial } from '../types/course';

/**
 * Hook that wraps useCourseData to maintain backward compatibility with components
 * that expect the useCourses interface, particularly for AdminDashboard
 */
export function useAdminCourses() {
  const {
    courses,
    materials,
    loading,
    error,
    createCourse,
    updateCourse,
    deleteCourse,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    bulkImportCourses,
    refreshCourses
  } = useCourseData();

  return {
    // Return the same interface as the original useCourses hook
    courses,
    materials,
    loading,
    error,
    createCourse,
    updateCourse,
    deleteCourse,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    bulkImportCourses,
    refreshCourses
  };
} 