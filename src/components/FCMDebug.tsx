import React, { useState } from 'react';
import { requestNotificationPermission, getFCMToken, initializeFCM } from '../firebase';
import { testFCMDatabaseConnection, subscribeToPushNotifications, createFCMTokensTable } from '../utils/pushNotifications';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export function FCMDebug() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string>('Ready to test');
  const [token, setToken] = useState<string>('');
  const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [savedTokens, setSavedTokens] = useState<any[]>([]);

  const handleTestDatabase = async () => {
    try {
      setStatus('🔍 Testing database connection...');
      const connected = await testFCMDatabaseConnection();
      setDbConnected(connected);

      if (connected) {
        setStatus('✅ Database connection successful');

        // Try to fetch existing tokens
        const { data, error } = await supabase
          .from('fcm_tokens')
          .select('*')
          .limit(5);

        if (error) {
          setStatus(`❌ Error fetching tokens: ${error.message}`);
        } else {
          setSavedTokens(data || []);
          setStatus(`✅ Found ${data?.length || 0} FCM tokens in database`);
        }
      } else {
        setStatus('❌ Database connection failed - table may not exist');
      }
    } catch (error) {
      setStatus(`❌ Database test error: ${error.message}`);
      setDbConnected(false);
    }
  };

  const handleCreateTable = async () => {
    try {
      setStatus('🔧 Creating FCM tokens table...');
      const created = await createFCMTokensTable();

      if (created) {
        setStatus('✅ FCM tokens table created successfully');
        // Test connection again
        await handleTestDatabase();
      } else {
        setStatus('❌ Failed to create FCM tokens table');
      }
    } catch (error) {
      setStatus(`❌ Table creation error: ${error.message}`);
    }
  };

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

  const handleFullSubscription = async () => {
    if (!user) {
      setStatus('❌ Please log in first');
      return;
    }

    try {
      setStatus('🔔 Starting full FCM subscription...');
      
      const subscription = await subscribeToPushNotifications(user.id);
      if (subscription) {
        setToken(subscription.fcmToken);
        setStatus('✅ Full FCM subscription successful!');
        
        // Refresh saved tokens
        handleTestDatabase();
      } else {
        setStatus('❌ FCM subscription failed');
      }
    } catch (error) {
      console.error('Error in full subscription:', error);
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
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold mb-4">🔧 FCM Debug Tool</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">User Status:</p>
          <p className={`font-medium ${user ? 'text-green-600' : 'text-red-600'}`}>
            {user ? `Logged in as ${user.name} (${user.id.substring(0, 8)}...)` : 'Not logged in'}
          </p>
        </div>

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
          <p className="text-sm text-gray-600">Database Connection:</p>
          <p className={`font-medium ${
            dbConnected === true ? 'text-green-600' : 
            dbConnected === false ? 'text-red-600' : 'text-gray-600'
          }`}>
            {dbConnected === true ? 'Connected' : dbConnected === false ? 'Failed' : 'Not tested'}
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

        {savedTokens.length > 0 && (
          <div>
            <p className="text-sm text-gray-600">Saved Tokens ({savedTokens.length}):</p>
            <div className="max-h-32 overflow-y-auto">
              {savedTokens.map((tokenData, index) => (
                <div key={index} className="text-xs bg-gray-50 p-2 mb-1 rounded">
                  <p><strong>User:</strong> {tokenData.user_id.substring(0, 8)}...</p>
                  <p><strong>Token:</strong> {tokenData.fcm_token.substring(0, 30)}...</p>
                  <p><strong>Created:</strong> {new Date(tokenData.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handleTestDatabase}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Test Database Connection
          </button>

          <button
            onClick={handleCreateTable}
            disabled={dbConnected === true}
            className="w-full bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:bg-gray-400"
          >
            Create FCM Tokens Table
          </button>

          <button
            onClick={handleRequestPermission}
            className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Request Permission & Get Token
          </button>

          <button
            onClick={handleFullSubscription}
            disabled={!user}
            className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:bg-gray-400"
          >
            Full FCM Subscription (Requires Login)
          </button>

          <button
            onClick={handleTestNotification}
            disabled={permission !== 'granted'}
            className="w-full bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:bg-gray-400"
          >
            Send Test Notification
          </button>
        </div>

        <div className="text-xs text-gray-500 mt-4">
          <p>Environment: {import.meta.env.MODE}</p>
          <p>Host: {window.location.hostname}</p>
          <p>SW Support: {'serviceWorker' in navigator ? '✅' : '❌'}</p>
          <p>Notification Support: {'Notification' in window ? '✅' : '❌'}</p>
          <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL?.substring(0, 30)}...</p>
        </div>
      </div>
    </div>
  );
}
