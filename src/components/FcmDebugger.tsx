import React, { useState, useEffect } from 'react';
import { runFcmTest, isFcmSetupComplete } from '../utils/fcmTestUtils';
import firebase from '../firebase';

interface FcmDebuggerProps {
  showDebugInfo?: boolean;
}

/**
 * Debug component to diagnose FCM issues
 */
export const FcmDebugger: React.FC<FcmDebuggerProps> = ({ showDebugInfo = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string | null>(null);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  // Run FCM setup check
  useEffect(() => {
    const checkSetup = async () => {
      const result = await isFcmSetupComplete();
      setIsSetupComplete(result);
    };
    
    checkSetup();
  }, []);

  // Run FCM test
  const handleRunTest = async () => {
    setIsLoading(true);
    try {
      const results = await runFcmTest();
      setTestResults(results);
    } catch (error) {
      console.error('Error running FCM test:', error);
      setTestResults({
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Request notification permission
  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Notifications are not supported in this browser');
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        // Run test after permission is granted
        handleRunTest();
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      alert('Error requesting notification permission');
    }
  };

  // Register service worker
  const handleRegisterServiceWorker = async () => {
    setIsLoading(true);
    try {
      // Use the registerServiceWorker from the default export
      const registration = await firebase.registerServiceWorker();
      if (registration) {
        alert('Service worker registered successfully');
        // Run test after service worker is registered
        handleRunTest();
      } else {
        alert('Failed to register service worker');
      }
    } catch (error) {
      console.error('Error registering service worker:', error);
      alert(`Error registering service worker: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Show a test notification
  const handleShowTestNotification = () => {
    if (!('Notification' in window)) {
      alert('Notifications are not supported in this browser');
      return;
    }
    
    if (Notification.permission !== 'granted') {
      alert('Notification permission not granted');
      return;
    }
    
    try {
      new Notification('Test Notification', {
        body: 'This is a test notification',
        icon: '/icons/icon-192x192.png',
      });
    } catch (error) {
      console.error('Error showing test notification:', error);
      alert(`Error showing test notification: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // If debug info is disabled, render nothing
  if (!showDebugInfo) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      backgroundColor: '#f0f0f0',
      border: '1px solid #ccc',
      borderRadius: '5px',
      padding: '10px',
      maxWidth: '350px',
      zIndex: 9999,
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      fontSize: '14px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>FCM Debugger</h3>
        <button 
          onClick={() => setIsExpanded(!isExpanded)} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
        >
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>
      
      {isExpanded && (
        <div>
          <div style={{ marginBottom: '10px' }}>
            <div><strong>Status:</strong> {isSetupComplete === null ? 'Checking...' : isSetupComplete ? '✅ Working' : '❌ Not working'}</div>
            <div><strong>Notifications:</strong> {notificationPermission === 'granted' ? '✅ Granted' : notificationPermission === 'denied' ? '❌ Denied' : '⚠️ Not requested'}</div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
            {notificationPermission !== 'granted' && (
              <button 
                onClick={handleRequestPermission}
                disabled={isLoading}
                style={{ padding: '5px', cursor: 'pointer' }}
              >
                Request Notification Permission
              </button>
            )}
            
            <button 
              onClick={handleRegisterServiceWorker}
              disabled={isLoading}
              style={{ padding: '5px', cursor: 'pointer' }}
            >
              Register Service Worker
            </button>
            
            <button 
              onClick={handleRunTest}
              disabled={isLoading}
              style={{ padding: '5px', cursor: 'pointer' }}
            >
              {isLoading ? 'Running Test...' : 'Run FCM Test'}
            </button>
            
            <button 
              onClick={handleShowTestNotification}
              disabled={notificationPermission !== 'granted' || isLoading}
              style={{ padding: '5px', cursor: 'pointer' }}
            >
              Show Test Notification
            </button>
          </div>
          
          {testResults && (
            <div style={{ 
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '3px',
              padding: '8px',
              maxHeight: '200px',
              overflowY: 'auto',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FcmDebugger; 