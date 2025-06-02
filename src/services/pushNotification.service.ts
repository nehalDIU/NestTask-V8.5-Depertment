import { requestNotificationPermission, unsubscribeFromNotifications } from '../notifications';

/**
 * Request notification permission and register the user's device for push notifications
 * @param userId The user ID to associate with the notification token
 * @returns A promise that resolves to true if the permission was granted and token saved, false otherwise
 */
export async function registerForPushNotifications(userId: string): Promise<boolean> {
  try {
    // Request permission and get FCM token
    const success = await requestNotificationPermission(userId);
    
    if (!success) {
      console.warn('Failed to register for push notifications');
      return false;
    }
    
    console.log('Successfully registered for push notifications');
    return true;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return false;
  }
}

/**
 * Unregister the user's device from push notifications
 * @param userId The user ID associated with the notification token
 * @returns A promise that resolves to true if the token was removed, false otherwise
 */
export async function unregisterFromPushNotifications(userId: string): Promise<boolean> {
  try {
    const success = await unsubscribeFromNotifications(userId);
    
    if (!success) {
      console.warn('Failed to unregister from push notifications');
      return false;
    }
    
    console.log('Successfully unregistered from push notifications');
    return true;
  } catch (error) {
    console.error('Error unregistering from push notifications:', error);
    return false;
  }
}

/**
 * Send a test notification to the user
 * @param userId The user ID to send the test notification to
 * @returns A promise that resolves to true if the notification was sent, false otherwise
 */
export async function sendTestNotification(userId: string): Promise<boolean> {
  try {
    // This would typically call a server endpoint to send a notification
    // For now, we'll just show a local notification if permission is granted
    if (Notification.permission === 'granted') {
      const notification = new Notification('Test Notification', {
        body: 'This is a test notification from NestTask',
        icon: '/logo192.png',
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error sending test notification:', error);
    return false;
  }
} 