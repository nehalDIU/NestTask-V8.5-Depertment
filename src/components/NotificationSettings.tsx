import React from 'react';
import { Bell, BellOff, Settings, Check, X, AlertCircle } from 'lucide-react';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';
import { useAuth } from '../hooks/useAuth';

interface NotificationSettingsProps {
  className?: string;
}

export function NotificationSettings({ className = '' }: NotificationSettingsProps) {
  const { user } = useAuth();
  const {
    preferences,
    loading,
    error,
    permissionStatus,
    fcmSupported,
    updatePreference,
    requestPermission,
    disableNotifications,
    enableNotifications,
    getPermissionStatusText,
    canRequestPermission,
    isFullyEnabled
  } = useNotificationPreferences(user?.id);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  const getPermissionIcon = () => {
    switch (permissionStatus) {
      case 'granted':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'denied':
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getPermissionColor = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'denied':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!fcmSupported && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            Push notifications are not supported in this browser.
          </p>
        </div>
      )}

      {/* Permission Status */}
      <div className={`mb-6 p-4 border rounded-lg ${getPermissionColor()}`}>
        <div className="flex items-center gap-3">
          {getPermissionIcon()}
          <div className="flex-1">
            <p className="font-medium">{getPermissionStatusText()}</p>
            {permissionStatus === 'denied' && (
              <p className="text-sm mt-1">
                To enable notifications, please allow them in your browser settings and refresh the page.
              </p>
            )}
          </div>
          {canRequestPermission() && permissionStatus !== 'granted' && (
            <button
              onClick={requestPermission}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Enable
            </button>
          )}
        </div>
      </div>

      {/* Master Toggle */}
      <div className="mb-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {isFullyEnabled() ? (
              <Bell className="w-5 h-5 text-green-600" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <h4 className="font-medium text-gray-900">All Notifications</h4>
              <p className="text-sm text-gray-600">
                {isFullyEnabled() ? 'Notifications are enabled' : 'Enable all notifications'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isFullyEnabled() ? (
              <button
                onClick={enableNotifications}
                disabled={!fcmSupported}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Enable All
              </button>
            ) : (
              <button
                onClick={disableNotifications}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Disable All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Individual Settings */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 mb-3">Notification Types</h4>
        
        {/* Push Notifications */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <h5 className="font-medium text-gray-900">Push Notifications</h5>
            <p className="text-sm text-gray-600">Receive notifications in your browser</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.push && permissionStatus === 'granted'}
              onChange={(e) => updatePreference('push', e.target.checked)}
              disabled={!fcmSupported || (preferences.push && permissionStatus === 'denied')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Task Notifications */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <h5 className="font-medium text-gray-900">Task Notifications</h5>
            <p className="text-sm text-gray-600">Get notified about new tasks and deadlines</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.tasks}
              onChange={(e) => updatePreference('tasks', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Announcement Notifications */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <h5 className="font-medium text-gray-900">Announcements</h5>
            <p className="text-sm text-gray-600">Receive important announcements</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.announcements}
              onChange={(e) => updatePreference('announcements', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Reminder Notifications */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <h5 className="font-medium text-gray-900">Reminders</h5>
            <p className="text-sm text-gray-600">Get reminded about upcoming deadlines</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.reminders}
              onChange={(e) => updatePreference('reminders', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <h5 className="font-medium text-gray-900">Email Notifications</h5>
            <p className="text-sm text-gray-600">Receive notifications via email</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.email}
              onChange={(e) => updatePreference('email', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> Push notifications require browser permission. 
          You can change these settings at any time. If you're not receiving notifications, 
          check your browser's notification settings.
        </p>
      </div>
    </div>
  );
}
