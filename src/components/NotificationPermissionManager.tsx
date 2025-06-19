import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Settings, X, Check, AlertCircle } from 'lucide-react';
import { requestNotificationPermission, isFCMSupported, registerFCMToken } from '../services/fcm.service';
import { showSuccessToast, showErrorToast } from '../utils/notifications';

interface NotificationPermissionManagerProps {
  userId: string;
  onPermissionChange?: (permission: NotificationPermission) => void;
}

export const NotificationPermissionManager: React.FC<NotificationPermissionManagerProps> = ({
  userId,
  onPermissionChange
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fcmSupported, setFcmSupported] = useState(false);

  useEffect(() => {
    // Check initial permission state
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Check FCM support
    setFcmSupported(isFCMSupported());
  }, []);

  const handleRequestPermission = async () => {
    if (!fcmSupported) {
      showErrorToast('Push notifications are not supported in this browser');
      return;
    }

    setIsLoading(true);
    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);
      
      if (newPermission === 'granted') {
        // Register FCM token after permission is granted
        const token = await registerFCMToken(userId);
        if (token) {
          showSuccessToast('Notifications enabled successfully!');
        } else {
          showErrorToast('Failed to register for notifications');
        }
      } else if (newPermission === 'denied') {
        showErrorToast('Notification permission denied. You can enable it in browser settings.');
      }

      onPermissionChange?.(newPermission);
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      showErrorToast('Failed to request notification permission');
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return {
          icon: <Bell className="w-5 h-5 text-green-600" />,
          text: 'Notifications Enabled',
          description: 'You will receive push notifications for new tasks and announcements',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'denied':
        return {
          icon: <BellOff className="w-5 h-5 text-red-600" />,
          text: 'Notifications Blocked',
          description: 'Enable notifications in your browser settings to receive updates',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      default:
        return {
          icon: <AlertCircle className="w-5 h-5 text-yellow-600" />,
          text: 'Notifications Not Set',
          description: 'Enable notifications to stay updated with new tasks and announcements',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
    }
  };

  const status = getPermissionStatus();

  if (!fcmSupported) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <BellOff className="w-5 h-5 text-gray-500" />
          <div>
            <p className="text-sm font-medium text-gray-700">
              Push notifications not supported
            </p>
            <p className="text-xs text-gray-500">
              Your browser doesn't support push notifications
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 border rounded-lg ${status.bgColor} ${status.borderColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {status.icon}
          <div className="flex-1">
            <h3 className={`text-sm font-medium ${status.color}`}>
              {status.text}
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              {status.description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {permission === 'default' && (
            <button
              onClick={handleRequestPermission}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-md transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1" />
                  Enabling...
                </>
              ) : (
                <>
                  <Bell className="w-3 h-3 mr-1" />
                  Enable
                </>
              )}
            </button>
          )}
          
          {permission === 'granted' && (
            <div className="flex items-center text-xs text-green-600">
              <Check className="w-3 h-3 mr-1" />
              Active
            </div>
          )}
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Browser Permission:</span>
              <span className={`text-xs font-medium ${status.color}`}>
                {permission.charAt(0).toUpperCase() + permission.slice(1)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">FCM Support:</span>
              <span className="text-xs font-medium text-green-600">
                {fcmSupported ? 'Supported' : 'Not Supported'}
              </span>
            </div>

            {permission === 'denied' && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                <p className="font-medium mb-1">To enable notifications:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Click the lock icon in your browser's address bar</li>
                  <li>Set "Notifications" to "Allow"</li>
                  <li>Refresh the page</li>
                </ol>
              </div>
            )}

            {permission === 'default' && (
              <button
                onClick={handleRequestPermission}
                disabled={isLoading}
                className="w-full px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-md transition-colors"
              >
                {isLoading ? 'Requesting Permission...' : 'Request Permission'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
