import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { initializeMessaging, setupForegroundMessageListener } from '../services/fcm.service';
import { NotificationPrompt } from './NotificationPrompt';
import { NotificationSettings } from './NotificationSettings';

/**
 * Example component showing how to integrate FCM notifications
 * This component should be placed in your main App component or layout
 */
export function FCMIntegrationExample() {
  const { user } = useAuth();

  useEffect(() => {
    // Initialize FCM when the app loads
    const initializeFCM = async () => {
      try {
        await initializeMessaging();
        console.log('FCM initialized successfully');
        
        // Set up foreground message listener
        const unsubscribe = setupForegroundMessageListener((payload) => {
          console.log('Received foreground message:', payload);
          // Handle the message as needed
          // The FCM service already shows a toast notification
        });

        // Cleanup function
        return unsubscribe;
      } catch (error) {
        console.error('Failed to initialize FCM:', error);
      }
    };

    initializeFCM();
  }, []);

  return (
    <div className="fcm-integration">
      {/* Notification prompt for new users */}
      {user && <NotificationPrompt />}
      
      {/* Example of how to include notification settings in a settings page */}
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
        
        {/* Other settings components would go here */}
        
        {/* Notification Settings */}
        <NotificationSettings className="mt-6" />
      </div>
    </div>
  );
}

/**
 * Example of how to send notifications from admin components
 */
export function AdminNotificationExample() {
  const { user } = useAuth();

  const sendTestNotification = async () => {
    if (!user || user.role !== 'admin') {
      alert('Only admins can send notifications');
      return;
    }

    try {
      // Import the notification service
      const { sendNotificationToAllUsers } = await import('../services/notification.service');
      
      const result = await sendNotificationToAllUsers({
        title: 'Test Notification',
        body: 'This is a test notification from the admin panel',
        tag: 'admin-test',
        data: {
          type: 'admin-announcement',
          url: '/'
        }
      });

      if (result.success) {
        alert('Notification sent successfully!');
      } else {
        alert(`Failed to send notification: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification');
    }
  };

  const sendSectionNotification = async () => {
    if (!user || user.role !== 'admin') {
      alert('Only admins can send notifications');
      return;
    }

    const sectionId = prompt('Enter section ID:');
    if (!sectionId) return;

    try {
      const { sendNotificationToSection } = await import('../services/notification.service');
      
      const result = await sendNotificationToSection(sectionId, {
        title: 'Section Announcement',
        body: 'Important announcement for your section',
        tag: 'section-announcement',
        data: {
          type: 'section-announcement',
          sectionId,
          url: '/'
        }
      });

      if (result.success) {
        alert('Section notification sent successfully!');
      } else {
        alert(`Failed to send notification: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending section notification:', error);
      alert('Failed to send notification');
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="admin-notification-panel bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Admin Notification Panel
      </h3>
      
      <div className="space-y-3">
        <button
          onClick={sendTestNotification}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Send Test Notification to All Users
        </button>
        
        <button
          onClick={sendSectionNotification}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Send Notification to Specific Section
        </button>
      </div>
      
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-700">
          <strong>Note:</strong> These are example functions for testing. 
          In production, you should implement proper validation and UI for sending notifications.
        </p>
      </div>
    </div>
  );
}

/**
 * Example of how to integrate notification banner in the main layout
 */
export function MainLayoutWithNotifications({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification prompt */}
      {user && <NotificationPrompt />}
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}

/**
 * Instructions for integration:
 * 
 * 1. Add FCMIntegrationExample to your main App component
 * 2. Include NotificationSettings in your settings/profile page
 * 3. Use AdminNotificationExample in admin panels
 * 4. Wrap your main layout with MainLayoutWithNotifications
 * 5. Make sure to set up environment variables:
 *    - VITE_FIREBASE_API_KEY
 *    - VITE_FIREBASE_AUTH_DOMAIN
 *    - VITE_FIREBASE_PROJECT_ID
 *    - VITE_FIREBASE_STORAGE_BUCKET
 *    - VITE_FIREBASE_MESSAGING_SENDER_ID
 *    - VITE_FIREBASE_APP_ID
 *    - VITE_FIREBASE_VAPID_KEY
 * 6. Update the Firebase configuration in public/firebase-messaging-sw.js
 * 7. Run the database migration: supabase/migrations/20250619000001_add_fcm_tokens.sql
 * 8. Deploy the updated Supabase Edge Function: supabase/functions/push-notification/index.ts
 */
