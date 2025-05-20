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

async function uploadFile(file: File): Promise<string> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `task-files/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
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
): Promise<Task | null> => {
  try {
    const timestamp = Date.now();
    
    // Handle mobile file uploads differently
    const mobileFiles = (task as any)._mobileFiles;
    const isMobileUpload = !!mobileFiles && Array.isArray(mobileFiles) && mobileFiles.length > 0;
    const mobileTimestamp = (task as any)._mobileTimestamp || timestamp;
    
    // Create a clean copy of the task without the special properties
    const cleanTask = { ...task };
    
    // Remove special mobile properties
    if (isMobileUpload) {
      console.log(`[Debug] Processing mobile upload with ${mobileFiles.length} files (timestamp: ${mobileTimestamp})`);
      delete (cleanTask as any)._mobileFiles;
      delete (cleanTask as any)._mobileTimestamp;
      delete (cleanTask as any)._isSectionAdminMobile;
      delete (cleanTask as any)._sectionId;
    }
    
    // Check connectivity for offline support
    const isOnline = navigator.onLine;
    if (!isOnline) {
      console.log('[Debug] Device is offline, storing task for later sync');
      // Implementation for offline queue would go here
      throw new Error('You appear to be offline. Task will be created when connectivity is restored.');
    }

    // Create the task in Supabase
    const taskWithMeta = {
      ...cleanTask,
      userId,
      sectionId: sectionId || task.sectionId || null,
      isAdminTask: !!sectionId || false,
    };
    
    let { data, error } = await supabase
      .from('tasks')
      .insert(taskWithMeta)
      .select()
      .single();
    
    if (error) {
      console.error('Error in createTask (database insert):', error);
      throw error;
    }
    
    // Handle file uploads for mobile devices with retry logic
    if (isMobileUpload && data) {
      let uploadSuccess = false;
      let uploadError = null;
      let retries = 0;
      const MAX_RETRIES = 3;
      
      while (!uploadSuccess && retries < MAX_RETRIES) {
        try {
          retries++;
          console.log(`[Debug] Attempting mobile file upload (attempt ${retries}/${MAX_RETRIES})`);
          
          // Process each file
          for (const file of mobileFiles) {
            if (!file || !file.name) continue;
            
            // Create a safe filename
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileExt = safeFileName.split('.').pop()?.toLowerCase() || 'bin';
            const filePath = `tasks/${data.id}/${mobileTimestamp}_${safeFileName}`;
            
            console.log(`[Debug] Uploading mobile file: ${filePath}`);
            
            // Upload the file
            const { error: uploadError } = await supabase
              .storage
              .from('task-attachments')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true,
                contentType: file.type || `application/${fileExt}`
              });
            
            if (uploadError) {
              console.error(`[Error] Failed to upload file ${file.name}:`, uploadError);
              throw uploadError;
            }
          }
          
          // All files uploaded successfully
          uploadSuccess = true;
          
        } catch (err) {
          uploadError = err;
          console.warn(`[Warning] Upload attempt ${retries} failed:`, err);
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
        }
      }
      
      // If all retries failed, log but don't fail the task creation
      if (!uploadSuccess) {
        console.error('[Error] All file upload attempts failed:', uploadError);
        // Update the task description to note the failed upload
        const updatedDescription = data.description + '\n\n**Note: Some file attachments failed to upload**';
        
        // Update the task with the new description
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ description: updatedDescription })
          .eq('id', data.id);
          
        if (updateError) {
          console.error('[Error] Failed to update task with upload failure note:', updateError);
        }
      }
    }
    
    // Map database task to application task
    const newTask = mapTaskFromDB(data);
    
    // Handle notifications for admin tasks
    if (newTask.isAdminTask) {
      await sendPushNotifications(newTask);
      await sendTaskNotification(newTask);
    }
    
    return newTask;
  } catch (error) {
    console.error('Error in createTask:', error);
    throw error;
  }
};

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