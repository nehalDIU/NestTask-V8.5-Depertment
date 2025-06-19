import React, { useState, useEffect } from 'react';
import { Bell, Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useFCMPermissions } from '../hooks/useFCMPermissions';
import { sendTestNotification } from '../services/fcm-notifications.service';
import { getUserFCMTokens } from '../services/fcm.service';

interface FCMTestComponentProps {
  userId: string;
}

export const FCMTestComponent: React.FC<FCMTestComponentProps> = ({ userId }) => {
  const {
    permission,
    isSupported,
    isNotificationsEnabled,
    canEnableNotifications,
    requestPermission,
    isLoading,
    error
  } = useFCMPermissions(userId);

  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [tokens, setTokens] = useState<any[]>([]);
  const [lastTestResult, setLastTestResult] = useState<string>('');

  // Load FCM tokens
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const userTokens = await getUserFCMTokens(userId);
        setTokens(userTokens);
      } catch (error) {
        console.error('Error loading FCM tokens:', error);
      }
    };

    if (userId) {
      loadTokens();
    }
  }, [userId, isNotificationsEnabled]);

  const handleRequestPermission = async () => {
    try {
      const result = await requestPermission();
      if (result === 'granted') {
        // Reload tokens after permission granted
        const userTokens = await getUserFCMTokens(userId);
        setTokens(userTokens);
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    }
  };

  const handleSendTestNotification = async () => {
    setTestStatus('sending');
    try {
      const success = await sendTestNotification(userId);
      if (success) {
        setTestStatus('success');
        setLastTestResult('Test notification sent successfully!');
      } else {
        setTestStatus('error');
        setLastTestResult('Failed to send test notification');
      }
    } catch (error) {
      setTestStatus('error');
      setLastTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Reset status after 3 seconds
    setTimeout(() => {
      setTestStatus('idle');
    }, 3000);
  };

  const getStatusIcon = () => {
    if (!isSupported) return <XCircle className="w-5 h-5 text-red-500" />;
    if (isNotificationsEnabled) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (permission === 'denied') return <XCircle className="w-5 h-5 text-red-500" />;
    return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (!isSupported) return 'FCM Not Supported';
    if (isNotificationsEnabled) return 'FCM Enabled';
    if (permission === 'denied') return 'Permission Denied';
    return 'FCM Not Enabled';
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md border">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Bell className="w-5 h-5 mr-2" />
        FCM Test Panel
      </h3>

      {/* Status Section */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          {getStatusIcon()}
          <span className="font-medium">{getStatusText()}</span>
        </div>
        
        <div className="text-sm text-gray-600 space-y-1">
          <div>Browser Support: {isSupported ? '✅ Supported' : '❌ Not Supported'}</div>
          <div>Permission: {permission}</div>
          <div>Active Tokens: {tokens.length}</div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Actions Section */}
      <div className="space-y-3">
        {/* Permission Request */}
        {canEnableNotifications && !isNotificationsEnabled && (
          <button
            onClick={handleRequestPermission}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Requesting Permission...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Enable Notifications
              </>
            )}
          </button>
        )}

        {/* Test Notification */}
        {isNotificationsEnabled && (
          <button
            onClick={handleSendTestNotification}
            disabled={testStatus === 'sending'}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center justify-center"
          >
            {testStatus === 'sending' ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Sending Test...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Test Notification
              </>
            )}
          </button>
        )}
      </div>

      {/* Test Result */}
      {lastTestResult && (
        <div className={`mt-4 p-3 rounded-md ${
          testStatus === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <p className="text-sm">{lastTestResult}</p>
        </div>
      )}

      {/* Token Information */}
      {tokens.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Active FCM Tokens:</h4>
          <div className="space-y-2">
            {tokens.map((token, index) => (
              <div key={token.id} className="text-xs bg-gray-50 p-2 rounded border">
                <div className="font-mono truncate mb-1">{token.fcm_token}</div>
                <div className="text-gray-500">
                  Device: {token.device_type} | Created: {new Date(token.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 pt-4 border-t">
        <h4 className="text-sm font-medium mb-2">Instructions:</h4>
        <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
          <li>Click "Enable Notifications" to request permission</li>
          <li>Allow notifications when prompted by the browser</li>
          <li>Click "Send Test Notification" to test the functionality</li>
          <li>Check that you receive the notification</li>
        </ol>
      </div>
    </div>
  );
};
