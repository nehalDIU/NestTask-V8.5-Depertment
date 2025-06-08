import { supabase } from '../lib/supabase';
import type { Teacher, NewTeacher } from '../types/teacher';
import type { Course } from '../types/course';

// Interface for bulk import data format
export interface TeacherBulkImportItem {
  teacher_name: string;
  course_title?: string;
  course_code?: string;
  email?: string;
  phone?: string;
  department?: string;
  office_room?: string;
}

// Helper function to map database course fields to Course type
function mapCourseFromDB(data: any): Course {
  // Parse class times from the string format back to array
  const classTimes = data.class_time 
    ? data.class_time.split(', ').map((timeStr: string) => {
        // Check if the time string includes classroom information
        const hasClassroom = timeStr.includes(' in ');
        if (hasClassroom) {
          const [timeInfo, classroom] = timeStr.split(' in ');
          const [day, time] = timeInfo.split(' at ');
          return { day, time, classroom };
        } else {
          const [day, time] = timeStr.split(' at ');
          return { day, time };
        }
      })
    : [];

  return {
    id: data.id,
    name: data.name,
    code: data.code,
    teacher: data.teacher,
    classTimes,
    telegramGroup: data.telegram_group,
    blcLink: data.blc_link,
    blcEnrollKey: data.blc_enroll_key,
    credit: data.credit,
    section: data.section,
    createdAt: data.created_at,
    createdBy: data.created_by
  };
}

// Get courses for a specific teacher
export async function getCoursesForTeacher(teacherId: string): Promise<Course[]> {
  try {
    const { data, error } = await supabase
      .from('teacher_courses')
      .select(`
        course_id,
        courses (*)
      `)
      .eq('teacher_id', teacherId);

    if (error) {
      console.error('Error fetching courses for teacher:', error);
      throw error;
    }

    if (!data || data.length === 0) return [];

    // Map data to Course objects
    return data.map((item: { courses: any }) => mapCourseFromDB(item.courses));
  } catch (error) {
    console.error('Error in getCoursesForTeacher:', error);
    throw error;
  }
}

export async function fetchTeachers(): Promise<Teacher[]> {
  try {
    const { data: teachers, error: teachersError } = await supabase
      .from('teachers')
      .select(`
        *,
        courses:teacher_courses(
          course:courses(
            id,
            name,
            code
          )
        )
      `)
      .order('name');

    if (teachersError) throw teachersError;

    return teachers.map(teacher => {
      // Process courses properly
      const processedCourses = teacher.courses
        ? teacher.courses
            .filter((c: { course: any }) => c.course) // Filter out any null courses
            .map((c: { course: any }) => c.course)
        : [];
      
      return {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        department: teacher.department,
        officeRoom: teacher.office_room,
        createdAt: teacher.created_at,
        createdBy: teacher.created_by,
        courses: processedCourses
      };
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    throw error;
  }
}

// Function to check if a teacher name already exists
export async function checkTeacherNameExists(name: string): Promise<boolean> {
  try {
    // Case-insensitive search for existing teacher with same name
    const { data, error } = await supabase
      .from('teachers')
      .select('id, name')
      .ilike('name', name)
      .maybeSingle();

    if (error) throw error;
    
    return !!data; // Return true if a matching teacher was found
  } catch (error) {
    console.error('Error checking teacher name:', error);
    throw error;
  }
}

export async function createTeacher(teacher: NewTeacher, courseIds: string[]): Promise<Teacher> {
  try {
    // First, check if the current user has permission
    const { data: { user } } = await supabase.auth.getUser();
    const userRole = user?.user_metadata?.role;
    
    // Allow if user is admin or section_admin
    if (!userRole || (userRole !== 'admin' && userRole !== 'section_admin')) {
      console.error('Permission denied: User is not admin or section_admin');
      throw new Error('Permission denied: Only admins and section admins can create teachers');
    }
    
    // If user is section_admin, ensure they are setting a department
    if (userRole === 'section_admin' && !teacher.department) {
      // Get the user's section ID and use it as the department
      const userSectionId = user?.user_metadata?.sectionId;
      if (userSectionId) {
        console.log('Setting department for section admin teacher to:', userSectionId);
        teacher.department = userSectionId;
      } else {
        console.error('Section admin must specify a department/section');
        throw new Error('Section admin must specify a department/section for the teacher');
      }
    }
  
    // First check if teacher with same name already exists
    const nameExists = await checkTeacherNameExists(teacher.name);
    
    if (nameExists) {
      throw new Error(`A teacher with the name "${teacher.name}" already exists.`);
    }
    
    console.log(`Creating teacher as ${userRole}:`, {
      teacherName: teacher.name,
      department: teacher.department,
      userSection: user?.user_metadata?.sectionId
    });
    
    // Continue with creating the teacher
    const { data: newTeacher, error: teacherError } = await supabase
      .from('teachers')
      .insert({
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        department: teacher.department,
        office_room: teacher.officeRoom
      })
      .select()
      .single();

    if (teacherError) {
      console.error('Error creating teacher:', teacherError);
      throw new Error(`Failed to create teacher: ${teacherError.message}`);
    }

    // Then create the course associations
    if (courseIds.length > 0) {
      const { error: coursesError } = await supabase
        .from('teacher_courses')
        .insert(
          courseIds.map(courseId => ({
            teacher_id: newTeacher.id,
            course_id: courseId
          }))
        );

      if (coursesError) {
        console.error('Error associating courses:', coursesError);
        throw new Error(`Failed to associate courses: ${coursesError.message}`);
      }
    }
    
    console.log('Teacher created successfully:', newTeacher);

    return {
      id: newTeacher.id,
      name: newTeacher.name,
      email: newTeacher.email,
      phone: newTeacher.phone,
      department: newTeacher.department,
      officeRoom: newTeacher.office_room,
      createdAt: newTeacher.created_at,
      createdBy: newTeacher.created_by,
      courses: []
    };
  } catch (error) {
    console.error('Error creating teacher:', error);
    throw error;
  }
}

export async function updateTeacher(
  id: string, 
  updates: Partial<Teacher>, 
  courseIds: string[]
): Promise<void> {
  try {
    // Check if we're updating the name and it would create a duplicate
    if (updates.name) {
      // Get the current teacher to compare
      const { data: currentTeacher, error: fetchError } = await supabase
        .from('teachers')
        .select('name')
        .eq('id', id)
        .single();
        
      if (fetchError) throw fetchError;
      
      // Only check for duplicates if the name is actually changing
      if (currentTeacher.name !== updates.name) {
        const nameExists = await checkTeacherNameExists(updates.name);
        if (nameExists) {
          throw new Error(`A teacher with the name "${updates.name}" already exists.`);
        }
      }
    }
    
    // Update teacher details
    const { error: teacherError } = await supabase
      .from('teachers')
      .update({
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        department: updates.department,
        office_room: updates.officeRoom
      })
      .eq('id', id);

    if (teacherError) throw teacherError;

    // Delete existing course associations
    const { error: deleteError } = await supabase
      .from('teacher_courses')
      .delete()
      .eq('teacher_id', id);

    if (deleteError) throw deleteError;

    // Create new course associations
    if (courseIds.length > 0) {
      const { error: coursesError } = await supabase
        .from('teacher_courses')
        .insert(
          courseIds.map(courseId => ({
            teacher_id: id,
            course_id: courseId
          }))
        );

      if (coursesError) throw coursesError;
    }
  } catch (error) {
    console.error('Error updating teacher:', error);
    throw error;
  }
}

export async function deleteTeacher(id: string): Promise<void> {
  try {
    console.log(`Starting deletion process for teacher: ${id}`);
    
    // Begin a transaction
    // First, check if teacher exists to provide early feedback
    const { data: teacherExists, error: teacherExistsError } = await supabase
      .from('teachers')
      .select('id, name')
      .eq('id', id)
      .maybeSingle();
      
    if (teacherExistsError) {
      console.error('Error checking if teacher exists:', teacherExistsError);
      throw teacherExistsError;
    }
    
    if (!teacherExists) {
      console.log(`Teacher with ID ${id} not found, nothing to delete`);
      return; // Nothing to delete, so exit early
    }
    
    console.log(`Found teacher with ID ${id} (${teacherExists.name}), proceeding with deletion`);
    
    // CHECK FOR FOREIGN KEY ISSUE: Check if the teacher is referenced in courses
    const { data: coursesWithTeacher, error: coursesCheckError } = await supabase
      .from('courses')
      .select('id, name, code')
      .eq('teacher_id', id);
    
    if (coursesCheckError) {
      console.error('Error checking for courses with teacher reference:', coursesCheckError);
    } else if (coursesWithTeacher && coursesWithTeacher.length > 0) {
      console.log(`Found ${coursesWithTeacher.length} courses referencing teacher ${id}. Removing references...`);
      
      // 1. First, ensure all courses have proper associations in teacher_courses
      for (const course of coursesWithTeacher) {
        console.log(`Checking teacher_courses association for course: ${course.id} (${course.code})`);
        
        // Check if association already exists
        const { data: existingAssoc, error: assocCheckError } = await supabase
          .from('teacher_courses')
          .select('*')
          .eq('teacher_id', id)
          .eq('course_id', course.id)
          .maybeSingle();
          
        if (assocCheckError) {
          console.error(`Error checking teacher_courses for course ${course.id}:`, assocCheckError);
        } else if (!existingAssoc) {
          // Create the association properly in teacher_courses
          console.log(`Creating proper teacher_courses association for course: ${course.id}`);
          const { error: createAssocError } = await supabase
            .from('teacher_courses')
            .insert({
              teacher_id: id,
              course_id: course.id
            });
            
          if (createAssocError) {
            console.error(`Error creating teacher_courses association for course ${course.id}:`, createAssocError);
          }
        } else {
          console.log(`Teacher-course association already exists for course ${course.id}`);
        }
      }
      
      // 2. Remove the direct references in courses table
      console.log(`Removing teacher_id references from ${coursesWithTeacher.length} courses`);
      const { error: updateCoursesError } = await supabase
        .from('courses')
        .update({ teacher_id: null })
        .eq('teacher_id', id);
        
      if (updateCoursesError) {
        console.error('Error removing teacher_id references from courses:', updateCoursesError);
        throw new Error(`Failed to remove teacher references from courses: ${updateCoursesError.message}`);
      }
      
      // Verify the update worked
      const { data: verifyCoursesUpdate, error: verifyError } = await supabase
        .from('courses')
        .select('id')
        .eq('teacher_id', id);
        
      if (verifyError) {
        console.error('Error verifying courses update:', verifyError);
      } else if (verifyCoursesUpdate && verifyCoursesUpdate.length > 0) {
        console.error(`Failed to remove all teacher references from courses. ${verifyCoursesUpdate.length} courses still have references.`);
        throw new Error(`Failed to remove all teacher references from courses. Database constraint might prevent deletion.`);
      } else {
        console.log('Successfully removed teacher references from all courses');
      }
    } else {
      console.log(`No courses directly reference this teacher's ID. Proceeding with deletion.`);
    }
    
    // Now proceed with the normal deletion process
    
    // 1. Delete all course associations
    console.log(`Attempting to delete course associations for teacher: ${id}`);
    const { data: deletedAssociations, error: deleteCoursesError } = await supabase
      .from('teacher_courses')
      .delete()
      .eq('teacher_id', id)
      .select();

    if (deleteCoursesError) {
      console.error('Error deleting teacher courses:', deleteCoursesError);
      throw deleteCoursesError;
    }
    
    console.log(`Successfully deleted ${deletedAssociations?.length || 0} course associations for teacher ${id}`);

    // 2. Then delete the teacher
    console.log(`Attempting to delete teacher with ID: ${id}`);
    const { error: deleteTeacherError } = await supabase
      .from('teachers')
      .delete()
      .eq('id', id);
      
    if (deleteTeacherError) {
      console.error('Error deleting teacher:', deleteTeacherError);
      throw deleteTeacherError;
    }
    
    // Verify deletion was successful by checking if teacher still exists
    const { data: verifyTeacher, error: verifyError } = await supabase
      .from('teachers')
      .select('id')
      .eq('id', id)
      .maybeSingle();
      
    if (verifyError) {
      console.error('Error verifying teacher deletion:', verifyError);
    } else if (verifyTeacher) {
      console.error(`Teacher with ID ${id} still exists after deletion attempt`);
      throw new Error('Failed to delete teacher: Record still exists after deletion');
    } else {
      console.log(`Teacher with ID ${id} successfully deleted and verified`);
    }
    
    return;
  } catch (error) {
    console.error('Error in teacher deletion process:', error);
    throw error;
  }
}

export async function bulkImportTeachers(teachersData: TeacherBulkImportItem[]): Promise<{ success: number; errors: { index: number; error: string }[] }> {
  const errors: { index: number; error: string }[] = [];
  let successCount = 0;

  try {
    // First, check if the current user has permission
    const { data: { user } } = await supabase.auth.getUser();
    const userRole = user?.user_metadata?.role;
    
    // Allow if user is admin or section_admin
    if (!userRole || (userRole !== 'admin' && userRole !== 'section_admin')) {
      console.error('Permission denied: User is not admin or section_admin');
      throw new Error('Permission denied: Only admins and section admins can import teachers');
    }

    console.log(`Bulk importing teachers as ${userRole}, teachers count:`, teachersData.length);
    
    for (let i = 0; i < teachersData.length; i++) {
      try {
        const teacherItem = teachersData[i];
        const teacherExists = await checkTeacherNameExists(teacherItem.teacher_name);
        
        if (teacherExists) {
          errors.push({ 
            index: i, 
            error: `A teacher with the name "${teacherItem.teacher_name}" already exists` 
          });
          continue;
        }
        
        // If user is section_admin, ensure they are setting a department
        if (userRole === 'section_admin' && !teacherItem.department) {
          const userSectionId = user?.user_metadata?.sectionId;
          if (userSectionId) {
            console.log(`Setting department for section admin teacher to ${userSectionId} for teacher #${i+1} (${teacherItem.teacher_name})`);
            teacherItem.department = userSectionId;
          } else {
            errors.push({ 
              index: i, 
              error: 'Section admin must specify a department/section for the teacher' 
            });
            continue;
          }
        }
        
        // Create the teacher record
        const { data: newTeacher, error: createError } = await supabase
          .from('teachers')
          .insert({
            name: teacherItem.teacher_name,
            email: teacherItem.email || null,
            phone: teacherItem.phone || 'N/A',
            department: teacherItem.department || user?.user_metadata?.sectionId,
            office_room: teacherItem.office_room
          })
          .select()
          .single();
          
        if (createError) {
          errors.push({ 
            index: i, 
            error: `Error creating teacher: ${createError.message}` 
          });
          continue;
        }
        
        // Associate courses if provided
        if (teacherItem.course_code) {
          // Retrieve course ID by code
          const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select('id, code')
            .eq('code', teacherItem.course_code)
            .maybeSingle();
            
          if (courseError) {
            console.error(`Error fetching course for teacher #${i+1}:`, courseError);
            // Continue anyway, just log the issue
          }
          
          // Only proceed if course was found
          if (courseData) {
            const { error: associationError } = await supabase
              .from('teacher_courses')
              .insert({
                teacher_id: newTeacher.id,
                course_id: courseData.id
              });
                
            if (associationError) {
              console.warn(`Warning: Failed to associate course for teacher #${i+1}: ${associationError.message}`);
            } else {
              console.log(`Associated course ${courseData.code} with teacher #${i+1}`);
            }
          } else if (teacherItem.course_title) {
            // Try finding by title if code didn't work
            const { data: courseByTitle, error: titleError } = await supabase
              .from('courses')
              .select('id, name')
              .ilike('name', teacherItem.course_title)
              .maybeSingle();
              
            if (!titleError && courseByTitle) {
              const { error: associationError } = await supabase
                .from('teacher_courses')
                .insert({
                  teacher_id: newTeacher.id,
                  course_id: courseByTitle.id
                });
                  
              if (associationError) {
                console.warn(`Warning: Failed to associate course for teacher #${i+1}: ${associationError.message}`);
              } else {
                console.log(`Associated course ${courseByTitle.name} with teacher #${i+1}`);
              }
            } else {
              console.warn(`Warning: No matching course found for teacher #${i+1}`);
            }
          }
        }
        
        successCount++;
        console.log(`Successfully created teacher #${i+1} (${teacherItem.teacher_name})`);
      } catch (error: any) {
        console.error(`Error processing teacher #${i+1}:`, error);
        errors.push({ 
          index: i, 
          error: error.message || 'Unknown error' 
        });
      }
    }
  } catch (error: any) {
    // Handle overall permission errors
    console.error("Error during bulk import:", error);
    errors.push({
      index: -1,
      error: `Bulk import failed: ${error.message}`
    });
  }

  return { success: successCount, errors };
}