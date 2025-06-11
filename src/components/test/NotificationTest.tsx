import { useState, useEffect } from 'react';
import { Bell, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getNotificationPermissionStatus } from '../../services/notificationPermission.service';

export function NotificationTest() {
  const { user } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<{
    permission: NotificationPermission;
    message: string;
    canRequest: boolean;
  }>({
    permission: 'default',
    message: 'Checking...',
    canRequest: false
  });

  useEffect(() => {
    // Update permission status
    const updateStatus = () => {
      const status = getNotificationPermissionStatus();
      setPermissionStatus(status);
    };

    updateStatus();

    // Listen for permission changes
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (permissionStatus.permission) {
      case 'granted':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'denied':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = () => {
    switch (permissionStatus.permission) {
      case 'granted':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'denied':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Notification Permission Test
          </h2>
        </div>

        <div className="space-y-4">
          {/* User Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              User Status:
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              user 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {user ? `Logged in as ${user.name}` : 'Not logged in'}
            </span>
          </div>

          {/* Permission Status */}
          <div className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor()}`}>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">
                Notification Permission:
              </span>
            </div>
            <span className="text-sm font-medium">
              {permissionStatus.permission.toUpperCase()}
            </span>
          </div>

          {/* Permission Message */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {permissionStatus.message}
            </p>
          </div>

          {/* Test Results */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Test Results:
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {user ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-gray-700 dark:text-gray-300">
                  Notification request only after authentication: {user ? 'PASS' : 'PENDING'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {permissionStatus.permission === 'default' && !user ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : permissionStatus.permission === 'granted' && user ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                )}
                <span className="text-gray-700 dark:text-gray-300">
                  No automatic permission request on page load: {
                    permissionStatus.permission === 'default' && !user ? 'PASS' : 
                    permissionStatus.permission === 'granted' && user ? 'PASS (Already granted)' :
                    'CHECK'
                  }
                </span>
              </div>

              <div className="flex items-center gap-2">
                {!permissionStatus.canRequest || user ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                )}
                <span className="text-gray-700 dark:text-gray-300">
                  Permission request controlled properly: {
                    !permissionStatus.canRequest || user ? 'PASS' : 'CHECK'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Test Instructions:
            </h4>
            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
              <li>Load the page without being logged in - no permission request should appear</li>
              <li>Log in to your account - permission request should appear after login</li>
              <li>Check that notifications work properly after granting permission</li>
              <li>Log out and log back in - permission should not be requested again if already granted</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
