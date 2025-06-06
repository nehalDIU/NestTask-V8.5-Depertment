import { useState } from 'react';
import { Bell, Loader2, AlertCircle, Send } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { NotificationPermission } from '../notifications/NotificationPermission';

export function NotificationSettings() {
  const { 
    isSubscribed, 
    loading, 
    error, 
    subscribe, 
    unsubscribe,
    sendTest 
  } = usePushNotifications();

  const [isUpdating, setIsUpdating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleToggle = async () => {
    setIsUpdating(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const success = await sendTest();
      if (success) {
        setTestResult('Test notification sent successfully!');
      } else {
        setTestResult('Failed to send test notification. Make sure notifications are enabled.');
      }
    } catch (error) {
      setTestResult('Error sending test notification.');
      console.error(error);
    } finally {
      setIsTesting(false);
      
      // Clear the test result message after 5 seconds
      setTimeout(() => {
        setTestResult(null);
      }, 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-xl">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Checking notification status...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              Push Notifications
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isSubscribed 
                ? 'You will receive notifications for new tasks and announcements' 
                : 'Enable notifications to stay updated with new tasks and announcements'
              }
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={isUpdating}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${isSubscribed 
              ? 'bg-blue-600 dark:bg-blue-500' 
              : 'bg-gray-200 dark:bg-gray-700'
            }
            ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-pressed={isSubscribed}
        >
          <span className="sr-only">
            {isSubscribed ? 'Disable notifications' : 'Enable notifications'}
          </span>
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
              transition duration-200 ease-in-out
              ${isSubscribed ? 'translate-x-5' : 'translate-x-0'}
              ${isUpdating ? 'animate-pulse' : ''}
            `}
          />
        </button>
      </div>

      {/* Browser Notification Permission */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Browser Notifications
        </h4>
        <NotificationPermission />
      </div>

      {/* Test Notification Button */}
      {isSubscribed && (
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Test Notifications
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Send a test notification to verify everything is working
              </p>
            </div>
            <button
              onClick={handleTestNotification}
              disabled={isTesting || !isSubscribed}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Test
                </>
              )}
            </button>
          </div>
          
          {testResult && (
            <div className={`mt-3 p-3 rounded-md text-sm ${testResult.includes('success') ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'}`}>
              {testResult}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              Notification Error
            </p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
            {error.includes('permission') && (
              <button
                onClick={() => window.open('chrome://settings/content/notifications')}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              >
                Open browser settings to enable notifications
              </button>
            )}
          </div>
        </div>
      )}

      {isSubscribed && (
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            You will receive notifications for:
          </h4>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              New tasks assigned to you
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              Important announcements
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              Task status updates
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}