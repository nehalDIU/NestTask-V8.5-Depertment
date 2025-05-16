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
    console.log('[Debug] Starting file upload for:', file.name, `(${file.size} bytes)`);
    
    // Check for empty file name but don't reject zero-size files from mobile
    // Some mobile browsers report size as 0 even for valid files
    if (!file.name) {
      throw new Error(`Invalid file: missing filename`);
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `task-files/${fileName}`;

    console.log('[Debug] Uploading file to path:', filePath);

    // More robust upload with retries and longer timeouts
    let attempts = 0;
    const maxAttempts = 5; // Increased from 3 to 5 attempts
    let lastError = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`[Debug] Upload attempt ${attempts}/${maxAttempts} for ${file.name}`);
        
        const { error: uploadError } = await supabase.storage
          .from('task-attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: attempts > 1, // Try upsert on retry attempts
            duplex: 'half' // Add duplex option for better mobile compatibility
          });

        if (uploadError) {
          console.error(`[Error] Upload attempt ${attempts}/${maxAttempts} failed:`, uploadError);
          lastError = uploadError;
          // Wait longer between retries
          if (attempts < maxAttempts) {
            const waitTime = attempts * 1000; // Progressive backoff
            console.log(`[Debug] Waiting ${waitTime}ms before retry`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          throw uploadError;
        }

        // Upload succeeded, get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('task-attachments')
          .getPublicUrl(filePath);

        console.log('[Debug] File uploaded successfully, public URL generated:', publicUrl.substring(0, 50) + '...');
        return publicUrl;
      } catch (error) {
        console.error(`[Error] Upload attempt ${attempts}/${maxAttempts} exception:`, error);
        lastError = error;
        if (attempts < maxAttempts) {
          const waitTime = attempts * 1000; // Progressive backoff
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // If we got here, all attempts failed
    throw lastError || new Error('Upload failed after multiple attempts');
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
      sectionId,
      hasMobileFiles: !!(task as any)._mobileFiles
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
    
    if (isMobileUpload) {
      console.log('[Debug] Processing mobile file upload with', mobileFiles.length, 'files');
    }
    
    let description = task.description;
    
    // Process mobile files first if they exist
    if (isMobileUpload) {
      try {
        console.log('[Debug] Uploading mobile files', mobileFiles.map(f => ({name: f.name, size: f.size})));
        
        // Wrap file upload in a promise with timeout - increase timeout for mobile
        const uploadFileWithTimeout = async (file: File, timeoutMs = 120000): Promise<string> => {
          return new Promise(async (resolve, reject) => {
            // Set a timeout to reject the promise if it takes too long
            const timeoutId = setTimeout(() => {
              reject(new Error(`Upload timed out for file ${file.name} after ${timeoutMs/1000} seconds`));
            }, timeoutMs);
            
            try {
              const url = await uploadFile(file);
              clearTimeout(timeoutId);
              resolve(url);
            } catch (error) {
              clearTimeout(timeoutId);
              reject(error);
            }
          });
        };
        
        // Upload each mobile file with retry logic
        let uploadedCount = 0;
        const fileCount = mobileFiles.length;
        
        for (const file of mobileFiles) {
          // Skip files without names, but allow zero-size files from mobile
          if (!file.name) {
            console.warn('[Warning] Skipping file with missing filename');
            continue;
          }
          
          try {
            console.log('[Debug] Uploading mobile file:', file.name, `(${file.size} bytes)`);
            
            // Try up to 3 times with longer timeout
            let permanentUrl = '';
            let attempts = 0;
            let lastError = null;
            
            while (attempts < 3 && !permanentUrl) {
              try {
                attempts++;
                // Increase timeout to 120 seconds (2 minutes) for better mobile performance
                permanentUrl = await uploadFileWithTimeout(file, 120000);
                console.log('[Debug] Mobile file upload succeeded:', file.name);
                uploadedCount++;
                break;
              } catch (uploadError) {
                console.error(`[Error] Failed to upload mobile file (attempt ${attempts}/3):`, file.name, uploadError);
                lastError = uploadError;
                // Wait 3 seconds before retrying on mobile
                if (attempts < 3) await new Promise(resolve => setTimeout(resolve, 3000));
              }
            }
            
            if (!permanentUrl) {
              throw lastError || new Error(`Failed to upload file after 3 attempts: ${file.name}`);
            }
            
            // Update description to replace attachment references with permanent URLs
            // Try all possible patterns in descending order of specificity
            
            // 1. Exact attachment reference pattern
            const attachmentPattern = new RegExp(`\\[${file.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\(attachment:${file.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
            const permanentRef = `[${file.name}](${permanentUrl})`;
            
            const oldDescription = description;
            description = description.replace(attachmentPattern, permanentRef);
            
            // 2. Try placeholder format (used on mobile)
            if (oldDescription === description) {
              description = description.replace(new RegExp(`\\[${file.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\(placeholder-${file.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g'), permanentRef);
            }
            
            // 3. Try just the filename without path
            if (oldDescription === description) {
              const baseFileName = file.name.split('/').pop()?.split('\\').pop();
              if (baseFileName && baseFileName !== file.name) {
                description = description.replace(new RegExp(`\\[${baseFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\((?:attachment:|placeholder-)${baseFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g'), permanentRef);
              }
            }
            
            // 4. General pattern match as a fallback
            if (oldDescription === description) {
              console.warn('[Warning] Failed to find exact attachment reference, trying general pattern');
              description = description.replace(/\[(.*?)\]\((attachment:|placeholder-)(.*?)\)/g, (match, fileName, prefix, ref) => {
                if (fileName === file.name || ref === file.name) {
                  return `[${fileName}](${permanentUrl})`;
                }
                return match;
              });
            }
            
            // 5. Last resort: If no matches were found, add the attachment at the end
            if (oldDescription === description) {
              console.warn('[Warning] No attachment references found in description, adding to the end');
              if (!description.includes('\n\n**Attachments:**\n')) {
                description += '\n\n**Attachments:**\n';
              }
              description += `- [${file.name}](${permanentUrl})\n`;
            }
            
            console.log('[Debug] Replaced attachment reference with permanent URL');
          } catch (fileError) {
            console.error('[Error] Failed to upload mobile file:', file.name, fileError);
            // Continue with other files instead of failing completely
          }
        }
        
        console.log(`[Debug] Completed mobile file uploads: ${uploadedCount}/${fileCount} files successful`);
        
        // Remove the mobile upload marker comment
        description = description.replace(/\n<!-- mobile-uploads -->\n/g, '');
      } catch (mobileUploadError) {
        console.error('[Error] Mobile file upload process failed:', mobileUploadError);
        // Continue with task creation even if mobile uploads fail
      }
    } else {
      // Standard desktop file processing
      // Extract file information from description
      // Extract file information from description with improved regex
      const fileMatches = description.match(/\[([^\]]+)\]\((blob:.*?|attachment:.*?)\)/g) || [];
      console.log('[Debug] Found file matches in description:', fileMatches);

      // Upload each file and update description with permanent URLs
      for (const match of fileMatches) {
        try {
          // Updated regex to handle both blob: URLs (desktop) and attachment: references (mobile)
          const matchResult = match.match(/\[(.*?)\]\((blob:(.*?)|attachment:(.*?))\)/);
          if (!matchResult) continue;
          
          const [, fileName, urlWithPrefix] = matchResult;
          const isBlob = urlWithPrefix?.startsWith('blob:');
          console.log('[Debug] Processing file match:', { match, fileName, isBlob });
          
          if (fileName) {
            try {
              // If it's already an attachment reference without a blob URL, preserve it
              if (!isBlob) {
                console.log('[Debug] Skipping non-blob URL:', urlWithPrefix);
                continue;
              }
              
              // For blob URLs, process normally with timeout
              if (isBlob) {
                const fetchPromise = new Promise<Blob>(async (resolve, reject) => {
                  try {
                    console.log('[Debug] Fetching blob URL:', urlWithPrefix);
                    const response = await fetch(urlWithPrefix);
                    if (!response.ok) {
                      reject(new Error(`Failed to fetch blob: ${response.status}`));
                      return;
                    }
                    const blob = await response.blob();
                    resolve(blob);
                  } catch (error) {
                    reject(error);
                  }
                });
                
                // Set up a timeout
                const timeoutPromise = new Promise<never>((_, reject) => {
                  setTimeout(() => reject(new Error('Blob fetch timed out')), 10000);
                });
                
                // Race the fetch against the timeout
                const blob = await Promise.race([fetchPromise, timeoutPromise]);
                
                const file = new File([blob], fileName, { type: blob.type });
                const permanentUrl = await uploadFile(file);
                description = description.replace(match, `[${fileName}](${permanentUrl})`);
                console.log('[Debug] Uploaded file and replaced URL with:', permanentUrl);
              }
            } catch (error) {
              console.error('[Error] Processing file failed:', { fileName, error });
            }
          }
        } catch (matchError) {
          console.error('[Error] Invalid file match format:', { match, error: matchError });
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