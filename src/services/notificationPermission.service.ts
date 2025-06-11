import { requestNotificationPermission } from '../firebase';
import { subscribeToPushNotifications, testFCMDatabaseConnection } from '../utils/pushNotifications';

// Simple toast functions (fallback if toast utility doesn't exist)
const showSuccessToast = (message: string) => {
  console.log('✅', message);
  // You can replace this with your actual toast implementation
};

const showErrorToast = (message: string) => {
  console.error('❌', message);
  // You can replace this with your actual toast implementation
};

interface NotificationPermissionOptions {
  showToast?: boolean;
  autoSubscribe?: boolean;
  silent?: boolean;
}

// Track if we've already requested permission in this session
let permissionRequestedInSession = false;

/**
 * Request notification permission after user login/signup
 * This function is designed to be called only after successful authentication
 */
export async function requestNotificationPermissionOnLogin(
  userId: string,
  options: NotificationPermissionOptions = {}
): Promise<boolean> {
  const { showToast = true, autoSubscribe = true, silent = false } = options;

  try {
    console.log('🔔 Starting notification permission request for user:', userId.substring(0, 8) + '...');

    // Test database connection first
    const dbConnected = await testFCMDatabaseConnection();
    if (!dbConnected) {
      console.error('❌ Database connection failed - cannot save FCM tokens');
      if (showToast && !silent) {
        showErrorToast('Database connection failed. Notifications may not work properly.');
      }
      // Continue anyway, but warn user
    }

    // Check if we've already requested permission in this session
    if (permissionRequestedInSession) {
      console.log('🔔 Notification permission already requested in this session');
      return false;
    }

    // Check current permission status
    if (!('Notification' in window)) {
      if (!silent) {
        console.warn('🔔 This browser does not support notifications');
        if (showToast) {
          showErrorToast('Your browser does not support notifications');
        }
      }
      return false;
    }

    // If permission is already granted, just subscribe
    if (Notification.permission === 'granted') {
      console.log('🔔 Notification permission already granted');
      if (autoSubscribe) {
        await subscribeToPushNotifications(userId);
        if (showToast) {
          showSuccessToast('Notifications are enabled!');
        }
      }
      return true;
    }

    // If permission is denied, don't request again
    if (Notification.permission === 'denied') {
      if (!silent) {
        console.log('🔔 Notification permission was previously denied');
        if (showToast) {
          showErrorToast('Notifications are blocked. You can enable them in your browser settings.');
        }
      }
      return false;
    }

    // Mark that we're requesting permission in this session
    permissionRequestedInSession = true;

    // Show a friendly message before requesting permission
    if (showToast && !silent) {
      showSuccessToast('Welcome! We\'d like to send you task notifications.');
    }

    // Request permission
    console.log('🔔 Requesting notification permission for user:', userId);
    const hasPermission = await requestNotificationPermission();

    if (hasPermission) {
      console.log('✅ Notification permission granted');

      if (autoSubscribe) {
        // Subscribe to push notifications
        const subscription = await subscribeToPushNotifications(userId);
        if (subscription) {
          console.log('✅ Successfully subscribed to push notifications');
          if (showToast) {
            showSuccessToast('🔔 Notifications enabled! You\'ll receive task updates.');
          }
        } else {
          console.error('❌ Failed to subscribe to push notifications');
          if (showToast) {
            showErrorToast('Failed to set up notifications. Please try again later.');
          }
        }
      }

      return true;
    } else {
      console.log('❌ Notification permission denied by user');
      if (showToast && !silent) {
        showErrorToast('Notifications disabled. You can enable them later in settings.');
      }
      return false;
    }

  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    if (showToast && !silent) {
      showErrorToast('Failed to set up notifications. Please try again later.');
    }
    return false;
  }
}

/**
 * Reset the session flag (useful for testing or when user logs out)
 */
export function resetNotificationPermissionSession(): void {
  permissionRequestedInSession = false;
}

/**
 * Get current notification permission status with user-friendly message
 */
export function getNotificationPermissionStatus(): {
  permission: NotificationPermission;
  message: string;
  canRequest: boolean;
} {
  if (!('Notification' in window)) {
    return {
      permission: 'denied',
      message: 'Your browser does not support notifications',
      canRequest: false
    };
  }

  const permission = Notification.permission;

  switch (permission) {
    case 'granted':
      return {
        permission,
        message: 'Notifications are enabled',
        canRequest: false
      };
    case 'denied':
      return {
        permission,
        message: 'Notifications are blocked. Enable them in your browser settings.',
        canRequest: false
      };
    case 'default':
      return {
        permission,
        message: 'Click to enable notifications',
        canRequest: !permissionRequestedInSession
      };
    default:
      return {
        permission: 'denied',
        message: 'Unknown notification status',
        canRequest: false
      };
  }
}

/**
 * Manual notification permission request (for settings page)
 */
export async function requestNotificationPermissionManually(userId: string): Promise<boolean> {
  // Reset session flag to allow manual request
  const wasRequested = permissionRequestedInSession;
  permissionRequestedInSession = false;

  try {
    const result = await requestNotificationPermissionOnLogin(userId, {
      showToast: true,
      autoSubscribe: true,
      silent: false
    });

    return result;
  } catch (error) {
    // Restore previous state if manual request fails
    permissionRequestedInSession = wasRequested;
    throw error;
  }
}