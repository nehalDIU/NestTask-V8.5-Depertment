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
    // Get user metadata to determine role
    const { data: { user } } = await supabase.auth.getUser();
    const userRole = user?.user_metadata?.role;
    const userSectionId = sectionId || user?.user_metadata?.section_id;
    
    console.log('[Debug] Fetching tasks with:', { 
      userId, 
      userRole, 
      sectionId,
      userMetadataSectionId: user?.user_metadata?.section_id,
      finalSectionId: userSectionId 
    });

    // Start query builder - no filters needed as RLS handles permissions
    let query = supabase.from('tasks').select('*');

    // We only need to order the results, the Row Level Security policy 
    // will handle filtering based on user_id, is_admin_task, and section_id
    query = query.order('created_at', { ascending: false });

    // Execute the query
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }

    // Map database response to Task type
    const tasks = data.map(mapTaskFromDB);
    
    console.log(`[Debug] Fetched ${tasks.length} tasks for user ${userId}`);
    if (tasks.length > 0) {
      console.log('[Debug] Sample task data:', {
        id: tasks[0].id,
        name: tasks[0].name,
        sectionId: tasks[0].sectionId,
        isAdminTask: tasks[0].isAdminTask
      });
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
): Promise<Task> => {
  try {
    console.log('[Debug] Creating task with data:', { 
      userId, 
      task,
      sectionId
    });

    // Get user data to determine role
    const { data: { user } } = await supabase.auth.getUser();
    const userRole = user?.user_metadata?.role;
    const userSectionId = user?.user_metadata?.section_id;
    
    console.log('[Debug] User role and section when creating task:', { 
      userRole, 
      userSectionId 
    });

    // Extract file information from description
    const fileMatches = task.description.match(/\[.*?\]\(blob:.*?\)/g) || [];
    let description = task.description;

    // Upload each file and update description with permanent URLs
    for (const match of fileMatches) {
      const [, fileName, blobUrl] = match.match(/\[(.*?)\]\((blob:.*?)\)/) || [];
      if (fileName && blobUrl) {
        try {
          const response = await fetch(blobUrl);
          const blob = await response.blob();
          const file = new File([blob], fileName, { type: blob.type });
          const permanentUrl = await uploadFile(file);
          description = description.replace(match, `[${fileName}](${permanentUrl})`);
        } catch (error) {
          console.error('Error processing file:', error);
        }
      }
    }

    // Prepare the task data
    const taskInsertData: any = {
      name: task.name,
      category: task.category,
      due_date: task.dueDate,
      description: description,
      status: task.status,
      user_id: userId,
      is_admin_task: userRole === 'admin' || userRole === 'section_admin' || false,
    };

    // Determine correct section_id based on role and available data
    // Section admin: Always set section_id to their section
    if (userRole === 'section_admin' && userSectionId) {
      taskInsertData.section_id = userSectionId;
      console.log('[Debug] Section admin creating task for section:', userSectionId);
      
      // Ensure this appears in the description for clarity
      if (!description.includes(`For section:`) && !description.includes(`Section ID:`)) {
        taskInsertData.description += `\n\nFor section: ${userSectionId}`;
      }
    } 
    // Explicitly provided section_id takes precedence for admins
    else if (sectionId) {
      taskInsertData.section_id = sectionId;
      console.log('[Debug] Using provided section_id:', sectionId);
    } 
    // Regular user with section_id - use their section for personal tasks
    else if (userSectionId && userRole === 'user') {
      taskInsertData.section_id = userSectionId;
      console.log('[Debug] Regular user creating task for their section:', userSectionId);
    }

    console.log('[Debug] Final task insert data:', taskInsertData);

    const { data, error } = await supabase
      .from('tasks')
      .insert(taskInsertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      throw new Error(`Failed to create task: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from task creation');
    }

    console.log('[Debug] Successfully created task with ID:', data.id);

    // Map database response to Task type
    const newTask = mapTaskFromDB(data);
    
    // Send notifications if it's an admin task
    if (newTask.isAdminTask) {
      await sendPushNotifications(newTask);
      await sendTaskNotification(newTask);
    }
    
    return newTask;
  } catch (error: any) {
    console.error('Error in createTask:', error);
    throw new Error(`Task creation failed: ${error.message}`);
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