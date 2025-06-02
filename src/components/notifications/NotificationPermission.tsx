import { useState } from 'react';
import { Bell, BellOff, AlertTriangle } from 'lucide-react';
import { requestNotificationPermission, checkNotificationPermission, unsubscribeFromNotifications } from '../../notifications';
import { useAuth } from '../../hooks/useAuth';

export function NotificationPermission() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    checkNotificationPermission()
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleEnableNotifications = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const result = await requestNotificationPermission(user.id);
      if (result) {
        setPermission('granted');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      await unsubscribeFromNotifications(user.id);
      // Note: This doesn't change the permission status, just removes the token
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (permission === 'unsupported') {
    return (
      <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
        <span className="text-sm">Notifications are not supported in this browser.</span>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <BellOff className="w-5 h-5 text-red-500 dark:text-red-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Notifications are blocked</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Please enable notifications in your browser settings to receive updates.
          </p>
        </div>
      </div>
    );
  }

  if (permission === 'granted') {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-green-500 dark:text-green-400" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Notifications enabled</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              You will receive notifications for new tasks and announcements.
            </p>
          </div>
        </div>
        <button
          onClick={handleDisableNotifications}
          disabled={isLoading}
          className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
        >
          {isLoading ? 'Disabling...' : 'Disable'}
        </button>
      </div>
    );
  }

  // Default case: permission === 'default'
  return (
    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-blue-500 dark:text-blue-400" />
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Enable notifications</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Get notified about new tasks and announcements.
          </p>
        </div>
      </div>
      <button
        onClick={handleEnableNotifications}
        disabled={isLoading}
        className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors disabled:opacity-50"
      >
        {isLoading ? 'Enabling...' : 'Enable'}
      </button>
    </div>
  );
} 