import { supabase } from '../lib/supabase';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  userId?: string;
}

// Get the Supabase URL from environment or config
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';

/**
 * Send a notification to one or more users
 * @param payload The notification data
 * @returns Response from the notification service
 */
export const sendNotification = async (payload: NotificationPayload) => {
  try {
    // Validate required fields
    if (!payload.title || !payload.body) {
      throw new Error('Title and body are required for notifications');
    }

    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Authentication required to send notifications');
    }

    // Send the notification using the Supabase Edge Function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send notification: ${errorData.error || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

/**
 * Send a notification to a specific user
 * @param userId The user ID to send the notification to
 * @param title The notification title
 * @param body The notification body
 * @param data Additional data to include with the notification
 * @returns Response from the notification service
 */
export const sendNotificationToUser = async (
  userId: string, 
  title: string, 
  body: string, 
  data?: Record<string, string>
) => {
  return sendNotification({ userId, title, body, data });
};

/**
 * Send a notification to all users (admin only)
 * @param title The notification title
 * @param body The notification body
 * @param data Additional data to include with the notification
 * @returns Response from the notification service
 */
export const sendNotificationToAll = async (
  title: string, 
  body: string, 
  data?: Record<string, string>
) => {
  return sendNotification({ title, body, data });
}; 