import React from 'react';
import { Bell, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useFCMRegistration } from '../hooks/useFCMRegistration';

interface FCMRegistrationButtonProps {
  userId: string;
}

export const FCMRegistrationButton: React.FC<FCMRegistrationButtonProps> = ({ userId }) => {
  const { isRegistering, isRegistered, error, token, registerToken, retry } = useFCMRegistration(userId);

  const getStatusIcon = () => {
    if (isRegistering) {
      return <RefreshCw className="w-4 h-4 animate-spin" />;
    }
    if (isRegistered) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    if (error) {
      return <XCircle className="w-4 h-4 text-red-600" />;
    }
    return <AlertCircle className="w-4 h-4 text-yellow-600" />;
  };

  const getStatusText = () => {
    if (isRegistering) return 'Registering FCM...';
    if (isRegistered) return 'FCM Registered';
    if (error) return 'FCM Failed';
    return 'FCM Not Registered';
  };

  const getButtonText = () => {
    if (isRegistering) return 'Registering...';
    if (isRegistered) return 'Re-register FCM';
    if (error) return 'Retry FCM';
    return 'Register FCM';
  };

  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
        
        <button
          onClick={isRegistered ? registerToken : retry}
          disabled={isRegistering}
          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-md transition-colors flex items-center space-x-1"
        >
          <Bell className="w-3 h-3" />
          <span>{getButtonText()}</span>
        </button>
      </div>

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 mb-2">
          <strong>Error:</strong> {error}
        </div>
      )}

      {token && (
        <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
          <strong>Token:</strong> {token.substring(0, 30)}...
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500">
        <div>User ID: {userId}</div>
        <div>Status: {isRegistered ? '✅ Ready' : '❌ Not Ready'}</div>
      </div>
    </div>
  );
};
