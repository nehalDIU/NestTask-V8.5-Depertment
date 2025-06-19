import { supabase } from '../lib/supabase';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

export interface BulkNotificationRequest {
  userIds: string[];
  payload: NotificationPayload;
  notificationType?: 'fcm' | 'webpush' | 'both';
}

export interface NotificationResult {
  success: boolean;
  type: string;
  results?: Array<{
    userId: string;
    type: string;
    status: 'success' | 'error';
    error?: string;
  }>;
  error?: string;
}

/**
 * Send FCM notification to a specific token
 */
export const sendFCMNotification = async (
  fcmToken: string,
  payload: NotificationPayload
): Promise<NotificationResult> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        fcmToken,
        payload
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending FCM notification:', error);
    return {
      success: false,
      type: 'fcm',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Send notifications to multiple users
 */
export const sendBulkNotifications = async (
  request: BulkNotificationRequest
): Promise<NotificationResult> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    return {
      success: false,
      type: 'bulk',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Send notification to all users in a section
 */
export const sendNotificationToSection = async (
  sectionId: string,
  payload: NotificationPayload,
  notificationType: 'fcm' | 'webpush' | 'both' = 'both'
): Promise<NotificationResult> => {
  try {
    // Get all users in the section
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .eq('section_id', sectionId);

    if (error) {
      throw new Error(`Failed to get section users: ${error.message}`);
    }

    if (!users || users.length === 0) {
      return {
        success: true,
        type: 'section',
        results: []
      };
    }

    const userIds = users.map(user => user.id);
    return await sendBulkNotifications({
      userIds,
      payload,
      notificationType
    });
  } catch (error) {
    console.error('Error sending section notifications:', error);
    return {
      success: false,
      type: 'section',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Send notification to all users in a batch
 */
export const sendNotificationToBatch = async (
  batchId: string,
  payload: NotificationPayload,
  notificationType: 'fcm' | 'webpush' | 'both' = 'both'
): Promise<NotificationResult> => {
  try {
    // Get all users in the batch
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .eq('batch_id', batchId);

    if (error) {
      throw new Error(`Failed to get batch users: ${error.message}`);
    }

    if (!users || users.length === 0) {
      return {
        success: true,
        type: 'batch',
        results: []
      };
    }

    const userIds = users.map(user => user.id);
    return await sendBulkNotifications({
      userIds,
      payload,
      notificationType
    });
  } catch (error) {
    console.error('Error sending batch notifications:', error);
    return {
      success: false,
      type: 'batch',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Send notification to all users in a department
 */
export const sendNotificationToDepartment = async (
  departmentId: string,
  payload: NotificationPayload,
  notificationType: 'fcm' | 'webpush' | 'both' = 'both'
): Promise<NotificationResult> => {
  try {
    // Get all users in the department
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .eq('department_id', departmentId);

    if (error) {
      throw new Error(`Failed to get department users: ${error.message}`);
    }

    if (!users || users.length === 0) {
      return {
        success: true,
        type: 'department',
        results: []
      };
    }

    const userIds = users.map(user => user.id);
    return await sendBulkNotifications({
      userIds,
      payload,
      notificationType
    });
  } catch (error) {
    console.error('Error sending department notifications:', error);
    return {
      success: false,
      type: 'department',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Send notification to all users (admin function)
 */
export const sendNotificationToAllUsers = async (
  payload: NotificationPayload,
  notificationType: 'fcm' | 'webpush' | 'both' = 'both'
): Promise<NotificationResult> => {
  try {
    // Get all users
    const { data: users, error } = await supabase
      .from('users')
      .select('id');

    if (error) {
      throw new Error(`Failed to get all users: ${error.message}`);
    }

    if (!users || users.length === 0) {
      return {
        success: true,
        type: 'all',
        results: []
      };
    }

    const userIds = users.map(user => user.id);
    return await sendBulkNotifications({
      userIds,
      payload,
      notificationType
    });
  } catch (error) {
    console.error('Error sending notifications to all users:', error);
    return {
      success: false,
      type: 'all',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Send task notification (when admin creates a task)
 */
export const sendTaskNotification = async (
  task: any,
  targetUsers?: string[]
): Promise<NotificationResult> => {
  const payload: NotificationPayload = {
    title: task.is_admin_task ? 'New Admin Task' : 'New Task',
    body: `${task.name} - Due: ${new Date(task.due_date).toLocaleDateString()}`,
    tag: `task-${task.id}`,
    data: {
      url: '/',
      taskId: task.id,
      type: 'task',
      isAdminTask: task.is_admin_task
    },
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Task'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  if (targetUsers && targetUsers.length > 0) {
    return await sendBulkNotifications({
      userIds: targetUsers,
      payload,
      notificationType: 'both'
    });
  } else if (task.section_id) {
    return await sendNotificationToSection(task.section_id, payload);
  } else {
    return await sendNotificationToAllUsers(payload);
  }
};
