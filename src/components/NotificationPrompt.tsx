import React, { useState, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';
import { useAuth } from '../hooks/useAuth';

interface NotificationPromptProps {
  onDismiss?: () => void;
  className?: string;
}

export function NotificationPrompt({ onDismiss, className = '' }: NotificationPromptProps) {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const {
    permissionStatus,
    fcmSupported,
    requestPermission,
    canRequestPermission
  } = useNotificationPreferences(user?.id);

  useEffect(() => {
    // Show prompt if:
    // 1. FCM is supported
    // 2. Permission is not granted
    // 3. User hasn't dismissed it before
    // 4. User is logged in
    const shouldShow = fcmSupported && 
                      permissionStatus === 'default' && 
                      user && 
                      !localStorage.getItem('notification_prompt_dismissed');

    setIsVisible(shouldShow);
  }, [fcmSupported, permissionStatus, user]);

  const handleAllow = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        setIsVisible(false);
        onDismiss?.();
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notification_prompt_dismissed', 'true');
    setIsVisible(false);
    onDismiss?.();
  };

  const handleNotNow = () => {
    // Don't permanently dismiss, just hide for this session
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible || !canRequestPermission()) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm ${className}`}>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 animate-slide-in-right">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              Stay Updated with NestTask
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Get instant notifications for new tasks, deadlines, and important announcements.
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={handleAllow}
                disabled={isRequesting}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRequesting ? (
                  <>
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Enabling...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Allow</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleNotNow}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss notification prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Notification banner for in-app display
export function NotificationBanner({ onDismiss, className = '' }: NotificationPromptProps) {
  const { user } = useAuth();
  const [isRequesting, setIsRequesting] = useState(false);
  const {
    permissionStatus,
    fcmSupported,
    requestPermission,
    canRequestPermission
  } = useNotificationPreferences(user?.id);

  const handleAllow = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        onDismiss?.();
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  if (!fcmSupported || !canRequestPermission() || permissionStatus === 'granted') {
    return null;
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-blue-900 mb-1">
            Enable Notifications
          </h4>
          <p className="text-sm text-blue-700">
            Stay updated with new tasks and important announcements.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAllow}
            disabled={isRequesting}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRequesting ? 'Enabling...' : 'Enable'}
          </button>
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
