import React, { useState } from 'react';
import { requestNotificationPermission, getFCMToken, initializeFCM } from '../firebase';

export function NotificationTest() {
  const [status, setStatus] = useState<string>('Ready to test');
  const [token, setToken] = useState<string>('');
  const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);

  const handleRequestPermission = async () => {
    try {
      setStatus('🔔 Requesting notification permission...');
      
      const hasPermission = await requestNotificationPermission();
      setPermission(Notification.permission);
      
      if (hasPermission) {
        setStatus('✅ Permission granted! Getting FCM token...');
        
        const fcmToken = await getFCMToken();
        if (fcmToken) {
          setToken(fcmToken);
          setStatus('✅ FCM token obtained successfully!');
        } else {
          setStatus('❌ Failed to get FCM token');
        }
      } else {
        setStatus('❌ Permission denied');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const handleInitializeFCM = async () => {
    try {
      setStatus('🔥 Initializing FCM...');
      
      const fcmToken = await initializeFCM();
      if (fcmToken) {
        setToken(fcmToken);
        setStatus('✅ FCM initialized successfully!');
      } else {
        setStatus('❌ FCM initialization failed');
      }
    } catch (error) {
      console.error('Error initializing FCM:', error);
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const handleTestNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('🧪 Test Notification', {
        body: 'This is a test notification from NestTask!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'test-notification'
      });
      setStatus('✅ Test notification sent!');
    } else {
      setStatus('❌ Permission not granted for test notification');
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">🔔 Notification Test</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">Current Permission:</p>
          <p className={`font-medium ${
            permission === 'granted' ? 'text-green-600' : 
            permission === 'denied' ? 'text-red-600' : 'text-yellow-600'
          }`}>
            {permission}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Status:</p>
          <p className="font-medium text-blue-600">{status}</p>
        </div>

        {token && (
          <div>
            <p className="text-sm text-gray-600">FCM Token:</p>
            <p className="text-xs bg-gray-100 p-2 rounded break-all">{token}</p>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handleRequestPermission}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Request Permission & Get Token
          </button>
          
          <button
            onClick={handleInitializeFCM}
            className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Initialize FCM
          </button>
          
          <button
            onClick={handleTestNotification}
            disabled={permission !== 'granted'}
            className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:bg-gray-400"
          >
            Send Test Notification
          </button>
        </div>

        <div className="text-xs text-gray-500 mt-4">
          <p>Environment: {import.meta.env.MODE}</p>
          <p>Host: {window.location.hostname}</p>
          <p>SW Support: {'serviceWorker' in navigator ? '✅' : '❌'}</p>
          <p>Notification Support: {'Notification' in window ? '✅' : '❌'}</p>
        </div>
      </div>
    </div>
  );
}
