import React from 'react';
import { useFcm } from '../../providers/FcmProvider';
import { FcmRegistrationStatus } from '../notifications/FcmRegistrationStatus';

interface NotificationSettingsProps {
  className?: string;
}

/**
 * Component for managing notification settings
 * Allows users to enable/disable notifications and view current status
 */
export function NotificationSettings({ className = '' }: NotificationSettingsProps) {
  const {
    status,
    permission,
    isRegistered,
    isPermissionGranted,
    isLoading,
    hasError,
    token,
    requestPermission
  } = useFcm();

  // Handle token registration success
  const handleTokenRegistered = (token: string) => {
    console.log('FCM token registration successful');
  };

  return (
    <div className={`notification-settings ${className}`}>
      <h2>Notification Settings</h2>
      
      <div className="notification-settings-section">
        <h3>Push Notifications</h3>
        <p className="notification-description">
          Receive push notifications for important updates, task deadlines, and announcements.
        </p>
        
        <div className="notification-status">
          <h4>Current Status</h4>
          <div className={`status-indicator ${isPermissionGranted ? 'enabled' : 'disabled'}`}>
            {isPermissionGranted ? 'Enabled' : 'Disabled'}
          </div>
          
          {isRegistered && (
            <p className="status-message success">
              Push notifications are properly configured on this device.
            </p>
          )}
          
          {permission === 'denied' && (
            <div className="status-message warning">
              <p>Push notifications are blocked by your browser.</p>
              <p>To enable notifications, you need to change your browser settings:</p>
              <ol>
                <li>Click on the lock/info icon in your browser's address bar</li>
                <li>Look for "Notifications" or "Site permissions"</li>
                <li>Change the setting from "Block" to "Allow"</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          )}
          
          {hasError && (
            <p className="status-message error">
              There was a problem setting up notifications. Please try again later.
            </p>
          )}
        </div>
        
        <div className="notification-controls">
          <FcmRegistrationStatus 
            onRegistered={handleTokenRegistered}
          />
          
          {isRegistered && (
            <div className="notification-test">
              <button className="test-button" onClick={() => {
                // Show a test notification
                if (Notification.permission === 'granted') {
                  new Notification('Test Notification', {
                    body: 'This is a test notification to verify your settings.',
                    icon: '/icons/icon-192x192.png'
                  });
                }
              }}>
                Test Notification
              </button>
              <small>Click to send a test notification</small>
            </div>
          )}
        </div>
      </div>
      
      <div className="notification-settings-section">
        <h3>Email Notifications</h3>
        <p className="notification-description">
          Manage email notification preferences for important updates.
        </p>
        
        <div className="notification-options">
          <div className="notification-option">
            <input 
              type="checkbox" 
              id="email-task-updates" 
              checked={true} 
              onChange={() => {/* Update user preferences */}} 
            />
            <label htmlFor="email-task-updates">Task updates and reminders</label>
          </div>
          
          <div className="notification-option">
            <input 
              type="checkbox" 
              id="email-announcements" 
              checked={true}
              onChange={() => {/* Update user preferences */}} 
            />
            <label htmlFor="email-announcements">Announcements and news</label>
          </div>
          
          <div className="notification-option">
            <input 
              type="checkbox" 
              id="email-account" 
              checked={true}
              onChange={() => {/* Update user preferences */}} 
            />
            <label htmlFor="email-account">Account security notifications</label>
          </div>
        </div>
        
        <button className="save-email-settings" onClick={() => {/* Save email preferences */}}>
          Save Email Preferences
        </button>
      </div>
      
      <div className="notification-settings-section">
        <h3>Device Management</h3>
        <p className="notification-description">
          This device is registered to receive push notifications.
        </p>
        
        {isRegistered && (
          <div className="device-info">
            <p><strong>Device:</strong> {navigator.userAgent}</p>
            <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
            <button className="remove-device" onClick={() => {/* Implement device removal */}}>
              Unregister This Device
            </button>
          </div>
        )}
      </div>
      
      <div className="notification-debug" style={{ 
        marginTop: '30px',
        padding: '10px',
        borderTop: '1px solid #eee',
        fontSize: '12px',
        color: '#666'
      }}>
        <p><strong>Debug Info:</strong></p>
        <p>Status: {status}</p>
        <p>Permission: {permission || 'unknown'}</p>
        <p>Token: {token ? `${token.substring(0, 15)}...` : 'none'}</p>
      </div>
    </div>
  );
}

export default NotificationSettings;