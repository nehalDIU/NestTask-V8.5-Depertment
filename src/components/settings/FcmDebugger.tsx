import React, { useState, useEffect } from 'react';
import { checkFcmSetup, fixFcmSetup } from '../../utils/fcmCheck';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useAuth } from '../../hooks/useAuth';

export const FcmDebugger: React.FC = () => {
  const { user } = useAuth();
  const { 
    isSubscribed, 
    loading, 
    fcmToken, 
    subscribe, 
    unsubscribe, 
    sendTest 
  } = usePushNotifications();
  
  const [status, setStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixResults, setFixResults] = useState<any>(null);

  useEffect(() => {
    checkStatus();
  }, [isSubscribed]);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const results = await checkFcmSetup();
      setStatus(results);
    } catch (error) {
      console.error('Error checking FCM status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleFix = async () => {
    setIsFixing(true);
    try {
      const results = await fixFcmSetup();
      setFixResults(results);
      // Re-check status after fixing
      await checkStatus();
    } catch (error) {
      console.error('Error fixing FCM setup:', error);
    } finally {
      setIsFixing(false);
    }
  };

  const renderStatusBadge = (isActive: boolean) => (
    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
      isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  if (loading || isChecking) {
    return <div className="p-4 text-center">Checking FCM status...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Firebase Cloud Messaging Status</h2>
      
      <div className="grid gap-4 mb-6">
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
          <span className="font-medium">Notifications Support</span>
          {renderStatusBadge(status?.notificationsSupported)}
        </div>
        
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
          <span className="font-medium">Notification Permission</span>
          <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
            status?.notificationPermission === 'granted' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {status?.notificationPermission}
          </span>
        </div>
        
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
          <span className="font-medium">Firebase Messaging Support</span>
          {renderStatusBadge(status?.messagingSupported)}
        </div>
        
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
          <span className="font-medium">Service Worker Support</span>
          {renderStatusBadge(status?.serviceWorkerSupported)}
        </div>
        
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
          <span className="font-medium">App Service Worker Registered</span>
          {renderStatusBadge(status?.serviceWorkerRegistered)}
        </div>
        
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
          <span className="font-medium">FCM Service Worker Registered</span>
          {renderStatusBadge(status?.fcmServiceWorkerRegistered)}
        </div>
        
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
          <span className="font-medium">FCM Token Available</span>
          {renderStatusBadge(status?.fcmTokenAvailable)}
        </div>
      </div>
      
      {status?.fcmToken && (
        <div className="mb-4 p-3 bg-gray-50 rounded overflow-hidden">
          <p className="font-medium mb-2">FCM Token:</p>
          <div className="bg-gray-100 p-2 rounded overflow-x-auto text-xs">
            <code>{status.fcmToken}</code>
          </div>
        </div>
      )}
      
      {status?.issues && status.issues.length > 0 && (
        <div className="mb-4">
          <p className="font-medium text-red-600 mb-2">Issues:</p>
          <ul className="list-disc pl-5 space-y-1">
            {status.issues.map((issue: string, index: number) => (
              <li key={index} className="text-sm">{issue}</li>
            ))}
          </ul>
        </div>
      )}
      
      {status?.recommendations && status.recommendations.length > 0 && (
        <div className="mb-4">
          <p className="font-medium text-blue-600 mb-2">Recommendations:</p>
          <ul className="list-disc pl-5 space-y-1">
            {status.recommendations.map((recommendation: string, index: number) => (
              <li key={index} className="text-sm">{recommendation}</li>
            ))}
          </ul>
        </div>
      )}
      
      {fixResults && (
        <div className="mb-4 p-3 rounded border border-blue-200 bg-blue-50">
          <p className="font-medium text-blue-700 mb-2">Fix Results:</p>
          <p className="text-sm mb-2">{fixResults.message}</p>
          
          {fixResults.actions && fixResults.actions.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-medium">Actions taken:</p>
              <ul className="list-disc pl-5 space-y-1">
                {fixResults.actions.map((action: string, index: number) => (
                  <li key={index} className="text-xs">{action}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      <div className="flex flex-wrap gap-3 mt-4">
        <button 
          onClick={checkStatus}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium transition"
          disabled={isChecking}
        >
          Refresh Status
        </button>
        
        <button 
          onClick={handleFix}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition"
          disabled={isFixing}
        >
          Attempt Fix
        </button>
        
        {user && (
          <>
            {!isSubscribed ? (
              <button 
                onClick={subscribe}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium transition"
                disabled={loading}
              >
                Subscribe to Notifications
              </button>
            ) : (
              <>
                <button 
                  onClick={unsubscribe}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition"
                  disabled={loading}
                >
                  Unsubscribe
                </button>
                
                <button 
                  onClick={sendTest}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm font-medium transition"
                >
                  Send Test Notification
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}; 