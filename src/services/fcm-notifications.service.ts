import { supabase } from '../lib/supabase';
import { getFCMTokensForUsers, getAllActiveFCMTokens, deactivateFCMToken } from './fcm.service';
import type { Task } from '../types';
import type { Announcement } from '../types/announcement';

export interface FCMNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface FCMSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  tokenInvalid?: boolean;
}

// Send FCM notification to specific tokens using Firebase Admin SDK
export const sendFCMNotification = async (
  tokens: string[],
  payload: FCMNotificationPayload
): Promise<Record<string, FCMSendResult>> => {
  const results: Record<string, FCMSendResult> = {};

  if (!tokens.length) {
    console.warn('No FCM tokens provided for notification');
    return results;
  }

  console.log('🚀 Sending FCM notifications to', tokens.length, 'tokens');
  console.log('📧 Notification payload:', payload);

  try {
    // For now, let's use a direct approach with Firebase REST API
    // This is a temporary solution until we set up the proper Edge Function

    for (const token of tokens) {
      try {
        console.log('📤 Sending notification to token:', token.substring(0, 20) + '...');

        // Use Firebase REST API directly
        const firebaseResponse = await fetch(`https://fcm.googleapis.com/fcm/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${import.meta.env.VITE_FIREBASE_SERVER_KEY || 'YOUR_SERVER_KEY_HERE'}`
          },
          body: JSON.stringify({
            to: token,
            notification: {
              title: payload.title,
              body: payload.body,
              icon: payload.icon || '/icons/icon-192x192.png',
              badge: payload.badge || '/icons/icon-192x192.png',
              tag: payload.tag || 'nesttask-notification',
              requireInteraction: payload.requireInteraction || false
            },
            data: {
              ...payload.data,
              click_action: payload.data?.url || '/'
            },
            webpush: {
              notification: {
                title: payload.title,
                body: payload.body,
                icon: payload.icon || '/icons/icon-192x192.png',
                badge: payload.badge || '/icons/icon-192x192.png',
                tag: payload.tag || 'nesttask-notification',
                requireInteraction: payload.requireInteraction || false,
                actions: payload.actions || []
              }
            }
          })
        });

        if (firebaseResponse.ok) {
          const result = await firebaseResponse.json();
          console.log('✅ FCM notification sent successfully:', result);
          results[token] = {
            success: true,
            messageId: result.message_id
          };
        } else {
          const errorResult = await firebaseResponse.json();
          console.error('❌ FCM notification failed:', errorResult);

          // Check if token is invalid
          const isTokenInvalid = errorResult.error === 'InvalidRegistration' ||
                                errorResult.error === 'NotRegistered';

          results[token] = {
            success: false,
            error: errorResult.error || 'Unknown error',
            tokenInvalid: isTokenInvalid
          };

          // If token is invalid, mark it as inactive
          if (isTokenInvalid) {
            console.warn('🗑️ Invalid FCM token detected, deactivating:', token.substring(0, 20) + '...');
            try {
              const { data: tokenData } = await supabase
                .from('fcm_tokens')
                .select('user_id')
                .eq('fcm_token', token)
                .single();

              if (tokenData) {
                await deactivateFCMToken(tokenData.user_id, token);
              }
            } catch (error) {
              console.error('Error deactivating invalid token:', error);
            }
          }
        }
      } catch (tokenError) {
        console.error('❌ Error sending to individual token:', tokenError);
        results[token] = {
          success: false,
          error: tokenError instanceof Error ? tokenError.message : 'Unknown error'
        };
      }
    }

    return results;
  } catch (error) {
    console.error('❌ Error in sendFCMNotification:', error);

    // Return error results for all tokens
    tokens.forEach(token => {
      results[token] = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    });

    return results;
  }
};

// Send notification for new admin task
export const sendAdminTaskNotification = async (task: Task): Promise<void> => {
  try {
    console.log('Sending admin task notification for task:', task.id);

    // Get all active FCM tokens (admin tasks go to all users)
    const tokens = await getAllActiveFCMTokens();
    
    if (!tokens.length) {
      console.warn('No active FCM tokens found for admin task notification');
      return;
    }

    const payload: FCMNotificationPayload = {
      title: 'New Admin Task',
      body: `${task.name} - Due: ${new Date(task.dueDate).toLocaleDateString()}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: `admin-task-${task.id}`,
      data: {
        url: '/',
        taskId: task.id,
        type: 'admin-task',
        timestamp: Date.now().toString()
      },
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View Task',
          icon: '/icons/icon-192x192.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/icon-192x192.png'
        }
      ]
    };

    const tokenStrings = tokens.map(t => t.fcm_token);
    const results = await sendFCMNotification(tokenStrings, payload);

    // Log results
    const successCount = Object.values(results).filter(r => r.success).length;
    const failureCount = Object.values(results).filter(r => !r.success).length;
    
    console.log(`Admin task notification sent: ${successCount} success, ${failureCount} failures`);
  } catch (error) {
    console.error('Error sending admin task notification:', error);
  }
};

// Send notification for new announcement
export const sendAnnouncementNotification = async (announcement: Announcement): Promise<void> => {
  try {
    console.log('Sending announcement notification for:', announcement.id);

    // Get all active FCM tokens (announcements go to all users)
    const tokens = await getAllActiveFCMTokens();
    
    if (!tokens.length) {
      console.warn('No active FCM tokens found for announcement notification');
      return;
    }

    const payload: FCMNotificationPayload = {
      title: 'New Announcement',
      body: announcement.title,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: `announcement-${announcement.id}`,
      data: {
        url: '/announcements',
        announcementId: announcement.id,
        type: 'announcement',
        timestamp: Date.now().toString()
      },
      requireInteraction: false,
      actions: [
        {
          action: 'view',
          title: 'View Announcement',
          icon: '/icons/icon-192x192.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/icon-192x192.png'
        }
      ]
    };

    const tokenStrings = tokens.map(t => t.fcm_token);
    const results = await sendFCMNotification(tokenStrings, payload);

    // Log results
    const successCount = Object.values(results).filter(r => r.success).length;
    const failureCount = Object.values(results).filter(r => !r.success).length;
    
    console.log(`Announcement notification sent: ${successCount} success, ${failureCount} failures`);
  } catch (error) {
    console.error('Error sending announcement notification:', error);
  }
};

// Send notification to specific users
export const sendNotificationToUsers = async (
  userIds: string[],
  payload: FCMNotificationPayload
): Promise<void> => {
  try {
    if (!userIds.length) {
      console.warn('No user IDs provided for notification');
      return;
    }

    // Get FCM tokens for specific users
    const tokens = await getFCMTokensForUsers(userIds);
    
    if (!tokens.length) {
      console.warn('No active FCM tokens found for specified users');
      return;
    }

    const tokenStrings = tokens.map(t => t.fcm_token);
    const results = await sendFCMNotification(tokenStrings, payload);

    // Log results
    const successCount = Object.values(results).filter(r => r.success).length;
    const failureCount = Object.values(results).filter(r => !r.success).length;
    
    console.log(`User notification sent: ${successCount} success, ${failureCount} failures`);
  } catch (error) {
    console.error('Error sending notification to users:', error);
  }
};

// Send test notification (for debugging)
export const sendTestNotification = async (userId: string): Promise<boolean> => {
  try {
    const payload: FCMNotificationPayload = {
      title: 'Test Notification',
      body: 'This is a test notification from NestTask',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'test-notification',
      data: {
        url: '/',
        type: 'test',
        timestamp: Date.now().toString()
      },
      requireInteraction: false
    };

    await sendNotificationToUsers([userId], payload);
    return true;
  } catch (error) {
    console.error('Error sending test notification:', error);
    return false;
  }
};
