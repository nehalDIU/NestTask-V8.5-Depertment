import React from 'react';
import useFcmRegistration from '../../hooks/useFcmRegistration';

interface FcmRegistrationStatusProps {
  showStatus?: boolean;
  className?: string;
  onRegistered?: (token: string) => void;
}

/**
 * Component to display FCM registration status and request permission
 * Can be used in settings or notification preferences screens
 */
export function FcmRegistrationStatus({
  showStatus = true,
  className = '',
  onRegistered
}: FcmRegistrationStatusProps) {
  const { 
    status, 
    token, 
    permission, 
    register, 
    isRegistering,
    isPermissionGranted,
    isRegistered,
    isLoading,
    hasError,
    error 
  } = useFcmRegistration();

  // Call the onRegistered callback when token is available
  React.useEffect(() => {
    if (isRegistered && token && onRegistered) {
      onRegistered(token);
    }
  }, [isRegistered, token, onRegistered]);

  // Determine what to display based on registration state
  const getStatusMessage = () => {
    switch (status) {
      case 'initial':
        return 'Initializing notifications...';
      case 'checking':
        return 'Checking notification permission...';
      case 'requesting':
        return 'Requesting notification permission...';
      case 'denied':
        return 'Notification permission denied. Please enable notifications in your browser settings.';
      case 'generating':
        return 'Generating notification token...';
      case 'storing':
        return 'Registering notification token...';
      case 'registered':
        return 'Notifications successfully enabled!';
      case 'error':
        return `Error: ${error?.message || 'Unknown error enabling notifications'}`;
      default:
        return 'Notifications status unknown';
    }
  };

  // Determine button text based on state
  const getButtonText = () => {
    if (isPermissionGranted && isRegistered) {
      return 'Notifications Enabled';
    }
    
    if (isLoading) {
      return 'Enabling Notifications...';
    }
    
    if (permission === 'denied') {
      return 'Enable in Browser Settings';
    }
    
    return 'Enable Notifications';
  };

  // Handle button click based on state
  const handleEnableClick = () => {
    if (permission === 'denied') {
      // Can't request again if denied - direct user to settings
      // This will vary by browser, so we just show a message
      alert('Please enable notifications in your browser settings:\n\n' +
        '1. Click on the lock/info icon in the address bar\n' +
        '2. Find "Notifications" in site settings\n' +
        '3. Change the setting to "Allow"');
      return;
    }
    
    if (!isLoading) {
      register(true);
    }
  };

  // Handle browser opening settings directly if supported
  const openBrowserSettings = () => {
    // Check for Firefox
    if (navigator.userAgent.includes('Firefox')) {
      window.open('about:preferences#privacy', '_blank');
      return;
    }

    // Chrome and others don't have a direct way to open notification settings
    alert('Please open your browser settings and search for "notifications" to enable notifications for this site.');
  };

  return (
    <div className={`fcm-registration ${className}`}>
      {showStatus && (
        <div className={`fcm-status ${status}`}>
          <p>{getStatusMessage()}</p>
        </div>
      )}
      
      <button
        className={`fcm-button ${status}`}
        onClick={permission === 'denied' ? openBrowserSettings : handleEnableClick}
        disabled={isLoading || (isPermissionGranted && isRegistered)}
      >
        {getButtonText()}
      </button>
      
      {hasError && showStatus && (
        <div className="fcm-error">
          <small>Error details: {error?.message || String(error) || 'Unknown error'}</small>
        </div>
      )}
    </div>
  );
}

export default FcmRegistrationStatus; 