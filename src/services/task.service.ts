import { supabase } from '../lib/supabase';
import { sendTaskNotification } from './telegram.service';
import type { Task, NewTask } from '../types/task';
import { mapTaskFromDB } from '../utils/taskMapper';

/**
 * Fetches tasks for a user, considering role and section
 * @param userId - The user ID to fetch tasks for
 * @param sectionId - The user's section ID (if applicable)
 */
export const fetchTasks = async (userId: string, sectionId?: string | null): Promise<Task[]> => {
  try {
    // For development environment, return faster with reduced logging
    if (process.env.NODE_ENV === 'development') {
      let query = supabase.from('tasks').select('*');
      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      
      if (error) throw error;
      return data.map(mapTaskFromDB);
    }
    
    // Performance optimization: Use a timeout for the query
    const QUERY_TIMEOUT = 8000; // 8 seconds
    
    // Create abort controller for the timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT);
    
    // Get user metadata to determine role
    const { data: { user } } = await supabase.auth.getUser();
    
    const userRole = user?.user_metadata?.role;
    const userSectionId = sectionId || user?.user_metadata?.section_id;

    // Start query builder - no filters needed as RLS handles permissions
    let query = supabase.from('tasks').select('*');

    // We only need to order the results, the Row Level Security policy 
    // will handle filtering based on user_id, is_admin_task, and section_id
    query = query.order('created_at', { ascending: false });

    // Execute the query
    const { data, error } = await query;

    // Clear the timeout
    clearTimeout(timeoutId);

    if (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }

    // Map database response to Task type
    const tasks = data.map(mapTaskFromDB);
    
    // Minimal logging in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Debug] Fetched ${tasks.length} tasks for user ${userId}`);
      if (tasks.length > 0) {
        console.log('[Debug] Sample task data:', {
          id: tasks[0].id,
          name: tasks[0].name,
          sectionId: tasks[0].sectionId,
          isAdminTask: tasks[0].isAdminTask
        });
      }
    }

    // Additional debug for section tasks
    if (userSectionId) {
      const sectionTasks = tasks.filter(task => task.sectionId === userSectionId);
      console.log(`[Debug] Found ${sectionTasks.length} section tasks with sectionId: ${userSectionId}`);
      
      // Log the section task IDs for easier troubleshooting
      if (sectionTasks.length > 0) {
        console.log('[Debug] Section task IDs:', sectionTasks.map(task => task.id));
      }
    }

    return tasks;
  } catch (error: any) {
    // Check if this is an AbortError (timeout)
    if (error.name === 'AbortError') {
      console.error('Task fetch timed out');
      throw new Error('Task fetch timed out. Please try again.');
    }
    
    console.error('Error in fetchTasks:', error);
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }
};

async function uploadFileWithTimeout(file: File, timeoutMs = 60000): Promise<string> {
  return new Promise(async (resolve, reject) => {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Upload timed out for file ${file.name}`));
    }, timeoutMs);
    
    try {
      // Add retry logic with exponential backoff for mobile uploads
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;
      let backoffDelay = 2000; // Start with 2 seconds

      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`[Debug] Attempting file upload (attempt ${attempts}/${maxAttempts}):`, {
            fileName: file.name,
            fileSize: file.size,
            attempt: attempts,
            backoffDelay
          });

          const fileExt = file.name.split('.').pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const filePath = `task-files/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('task-attachments')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
              duplex: 'half'
            });

          if (uploadError) {
            console.error(`[Error] Upload attempt ${attempts} failed:`, {
              error: uploadError,
              fileName: file.name,
              fileSize: file.size,
              attempt: attempts
            });
            lastError = uploadError;
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
              backoffDelay *= 2; // Exponential backoff
              continue;
            }
            throw uploadError;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('task-attachments')
            .getPublicUrl(filePath);

          console.log('[Debug] File upload successful:', {
            fileName: file.name,
            fileSize: file.size,
            attempts,
            publicUrl
          });
          clearTimeout(timeoutId);
          resolve(publicUrl);
          return;
        } catch (error) {
          console.error(`[Error] Upload attempt ${attempts} failed with error:`, {
            error,
            fileName: file.name,
            fileSize: file.size,
            attempt: attempts
          });
          lastError = error;
          if (attempts < maxAttempts && !controller.signal.aborted) {
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            backoffDelay *= 2; // Exponential backoff
            continue;
          }
          throw error;
        }
      }

      throw lastError || new Error(`Failed to upload file after ${maxAttempts} attempts`);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('[Error] File upload failed:', {
        error,
        fileName: file.name,
        fileSize: file.size
      });
      reject(error);
    }
  });
}

async function uploadFile(file: File): Promise<string> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `task-files/${fileName}`;

    // Add retry logic for mobile uploads
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = null;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`[Debug] Attempting file upload (attempt ${attempts}/${maxAttempts}):`, file.name);

        const { error: uploadError } = await supabase.storage
          .from('task-attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error(`[Error] Upload attempt ${attempts} failed:`, uploadError);
          lastError = uploadError;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
            continue;
          }
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('task-attachments')
          .getPublicUrl(filePath);

        console.log('[Debug] File upload successful:', file.name);
        return publicUrl;
      } catch (error) {
        console.error(`[Error] Upload attempt ${attempts} failed with error:`, error);
        lastError = error;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
          continue;
        }
        throw error;
      }
    }

    throw lastError || new Error(`Failed to upload file after ${maxAttempts} attempts`);
  } catch (error) {
    console.error('[Error] File upload failed:', error);
    throw error;
  }
}

/**
 * Creates a new task in the database
 * @param userId - The user ID creating the task
 * @param task - The task data to create
 * @returns Promise resolving to the created task or error
 */
export const createTask = async (
  userId: string,
  task: NewTask,
  sectionId?: string
): Promise<Task> => {
  // Track uploaded files for cleanup in case of failure
  const uploadedFiles: { path: string; url: string }[] = [];
  
  try {
    console.log('[Debug] Creating task with data:', { 
      userId, 
      task,
      sectionId,
      hasMobileFiles: !!(task as any)._mobileFiles,
      isSectionAdminMobile: !!(task as any)._isSectionAdminMobile
    });

    // Get user data to determine role
    const { data: { user } } = await supabase.auth.getUser();
    const userRole = user?.user_metadata?.role;
    const userSectionId = user?.user_metadata?.section_id;
    
    console.log('[Debug] User role and section when creating task:', { 
      userRole, 
      userSectionId 
    });

    // Check for mobile file uploads
    const mobileFiles = (task as any)._mobileFiles as File[] | undefined;
    const isMobileUpload = !!mobileFiles && mobileFiles.length > 0;
    const isSectionAdminMobile = !!(task as any)._isSectionAdminMobile;
    const explicitSectionId = (task as any)._sectionId || sectionId;
    
    // Initialize description from task
    let description = task.description;
    
    if (isMobileUpload && mobileFiles) {
      console.log('[Debug] Processing mobile file upload with', mobileFiles.length, 'files');
      
      try {
        console.log('[Debug] Uploading mobile files', mobileFiles.map(f => ({name: f.name, size: f.size})));
        
        // Process files sequentially to avoid overwhelming the connection
        for (const file of mobileFiles) {
          if (!file.name || file.size === 0) {
            console.warn('[Warning] Skipping invalid file', file);
            continue;
          }
          
          try {
            console.log('[Debug] Uploading mobile file:', file.name);
            
            // Upload with extended timeout and retry
            const permanentUrl = await uploadFileWithTimeout(file, 60000);
            
            // Track uploaded file for potential cleanup
            const filePath = permanentUrl.split('/').pop();
            if (filePath) {
              uploadedFiles.push({ path: `task-files/${filePath}`, url: permanentUrl });
            }
            
            // Update description to replace attachment references
            const attachmentPattern = new RegExp(`\\[${file.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\(attachment:${file.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
            const permanentRef = `[${file.name}](${permanentUrl})`;
            
            description = description.replace(attachmentPattern, permanentRef);
            
            if (!description.includes(permanentRef)) {
              // If replacement failed, add the link at the end
              description += `\n[${file.name}](${permanentUrl})`;
            }
            
            console.log('[Debug] File uploaded and linked successfully:', file.name);
          } catch (fileError: unknown) {
            console.error('[Error] Failed to upload mobile file:', file.name, fileError);
            
            // Cleanup any files that were successfully uploaded before the error
            await cleanupUploadedFiles(uploadedFiles);
            
            throw new Error(`Failed to upload file ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
          }
        }
      } catch (mobileUploadError) {
        console.error('[Error] Mobile file upload process failed:', mobileUploadError);
        throw mobileUploadError;
      }
    }

    // Create the task with updated description
    const { data: taskData, error: insertError } = await supabase
      .from('tasks')
      .insert([
        {
          name: task.name,
          category: task.category,
          due_date: task.dueDate,
          description: description,
          status: task.status || 'in-progress',
          user_id: userId,
          is_admin_task: true,
          section_id: explicitSectionId
        }
      ])
      .select()
      .single();

    if (insertError) {
      // Cleanup uploaded files if task creation fails
      await cleanupUploadedFiles(uploadedFiles);
      throw insertError;
    }
    
    if (!taskData) {
      // Cleanup uploaded files if no data returned
      await cleanupUploadedFiles(uploadedFiles);
      throw new Error('No data returned from task insert');
    }

    return taskData;
  } catch (error) {
    console.error('[Error] Task creation failed:', error);
    // Ensure cleanup happens on any error
    await cleanupUploadedFiles(uploadedFiles);
    throw error;
  }
};

// Helper function to clean up uploaded files
async function cleanupUploadedFiles(files: { path: string; url: string }[]) {
  if (files.length === 0) return;
  
  console.log('[Debug] Cleaning up uploaded files:', files.map(f => f.path));
  
  try {
    const { error } = await supabase.storage
      .from('task-attachments')
      .remove(files.map(f => f.path));
      
    if (error) {
      console.error('[Error] Failed to cleanup uploaded files:', error);
    } else {
      console.log('[Debug] Successfully cleaned up uploaded files');
    }
  } catch (error) {
    console.error('[Error] Error during file cleanup:', error);
  }
}

async function sendPushNotifications(task: Task) {
  try {
    // Get all push subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('subscription');

    if (error) throw error;
    if (!subscriptions?.length) return;

    // Prepare notification payload
    const payload = {
      title: 'New Admin Task',
      body: `${task.name} - Due: ${new Date(task.dueDate).toLocaleDateString()}`,
      tag: `admin-task-${task.id}`,
      data: {
        url: '/',
        taskId: task.id,
        type: 'admin-task'
      },
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View Task'
        }
      ]
    };

    // Send push notification to each subscription
    const notifications = subscriptions.map(async ({ subscription }) => {
      try {
        const parsedSubscription = JSON.parse(subscription);
        
        // Send notification using the Supabase Edge Function
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            subscription: parsedSubscription,
            payload: JSON.stringify(payload)
          })
        });

        if (!response.ok) {
          throw new Error('Failed to send push notification');
        }
      } catch (error) {
        console.error('Error sending push notification:', error);
      }
    });

    await Promise.allSettled(notifications);
  } catch (error) {
    console.error('Error sending notifications:', error);
  }
}

export async function updateTask(taskId: string, updates: Partial<Task>) {
  try {
    // Convert camelCase to snake_case for database fields
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.sectionId !== undefined) dbUpdates.section_id = updates.sectionId;

    // Update task
    const { data, error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', taskId)
      .select('id, name, category, due_date, description, status, created_at, is_admin_task, section_id')
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to update task');
    }
    
    if (!data) {
      throw new Error('Task not found');
    }

    // Map the response to our Task type
    return {
      id: data.id,
      name: data.name,
      category: data.category,
      dueDate: data.due_date,
      description: data.description,
      status: data.status,
      createdAt: data.created_at,
      isAdminTask: data.is_admin_task,
      sectionId: data.section_id
    };
  } catch (error: any) {
    console.error('Error updating task:', error);
    throw error;
  }
}

export async function deleteTask(taskId: string) {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error deleting task:', error);
    throw new Error(error.message || 'Failed to delete task');
  }
}
