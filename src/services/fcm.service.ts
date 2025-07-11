import { supabase } from '../lib/supabase';
import { getFCMToken, requestNotificationPermission, onForegroundMessage } from '../firebase';

export interface FCMTokenData {
  token: string;
  deviceType: 'android' | 'ios' | 'web';
  deviceInfo?: any;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

class FCMService {
  private isInitialized = false;
  private currentToken: string | null = null;
  private unsubscribeFromMessages: (() => void) | null = null;

  /**
   * Initialize FCM service
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      // Check if we're in a secure context (HTTPS or localhost)
      const isSecureContext = window.location.protocol === 'https:' ||
                             window.location.hostname === 'localhost' ||
                             window.location.hostname === '127.0.0.1';

      if (!isSecureContext) {
        console.warn('FCM requires HTTPS in production');
        return false;
      }

      // Check if notifications are supported
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.warn('Push notifications are not supported in this browser');
        return false;
      }

      // Check if Firebase is properly configured
      if (!import.meta.env.VITE_FIREBASE_VAPID_KEY) {
        console.error('Firebase VAPID key not configured');
        return false;
      }

      // Request notification permission
      const permissionGranted = await requestNotificationPermission();
      if (!permissionGranted) {
        console.warn('Notification permission not granted');
        return false;
      }

      // Get FCM token with retry logic
      let token = null;
      let retries = 3;

      while (retries > 0 && !token) {
        try {
          token = await getFCMToken();
          if (token) break;
        } catch (error) {
          console.warn(`FCM token attempt failed, retries left: ${retries - 1}`, error);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }

      if (!token) {
        console.error('Failed to get FCM token after retries');
        return false;
      }

      this.currentToken = token;
      this.isInitialized = true;

      // Set up foreground message listener
      this.setupForegroundMessageListener();

      console.log('FCM service initialized successfully with token:', token.substring(0, 20) + '...');
      return true;
    } catch (error) {
      console.error('Error initializing FCM service:', error);
      return false;
    }
  }

  /**
   * Register FCM token for the current user
   */
  async registerToken(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!this.currentToken) {
        const initialized = await this.initialize();
        if (!initialized || !this.currentToken) {
          throw new Error('Failed to initialize FCM or get token');
        }
      }

      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: (navigator as any).userAgentData?.platform || navigator.platform || 'unknown',
        language: navigator.language,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase.rpc('upsert_fcm_token', {
        p_user_id: user.id,
        p_token: this.currentToken,
        p_device_type: 'web',
        p_device_info: deviceInfo
      });

      if (error) throw error;

      console.log('FCM token registered successfully');
      return true;
    } catch (error) {
      console.error('Error registering FCM token:', error);
      return false;
    }
  }

  /**
   * Unregister FCM token for the current user
   */
  async unregisterToken(): Promise<boolean> {
    try {
      if (!this.currentToken) {
        return true; // Already unregistered
      }

      const { error } = await supabase
        .from('fcm_tokens')
        .update({ is_active: false })
        .eq('token', this.currentToken);

      if (error) throw error;

      this.currentToken = null;
      console.log('FCM token unregistered successfully');
      return true;
    } catch (error) {
      console.error('Error unregistering FCM token:', error);
      return false;
    }
  }

  /**
   * Get current FCM token
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Check if FCM is initialized and ready
   */
  isReady(): boolean {
    return this.isInitialized && this.currentToken !== null;
  }

  /**
   * Setup foreground message listener
   */
  private setupForegroundMessageListener(): void {
    if (this.unsubscribeFromMessages) {
      this.unsubscribeFromMessages();
    }

    this.unsubscribeFromMessages = onForegroundMessage((payload) => {
      console.log('Foreground FCM message received:', payload);

      // Show custom notification for foreground messages
      if (payload.notification) {
        this.showCustomNotification({
          title: payload.notification.title || 'New Notification',
          body: payload.notification.body || '',
          data: payload.data,
          icon: payload.notification.icon || '/icons/icon-192x192.png',
          tag: payload.data?.taskId || 'fcm-notification',
          requireInteraction: true,
          actions: [
            {
              action: 'view',
              title: 'View'
            },
            {
              action: 'dismiss',
              title: 'Dismiss'
            }
          ]
        });
      }

      // Dispatch custom event for app to handle
      window.dispatchEvent(new CustomEvent('fcm-message', {
        detail: payload
      }));
    });
  }

  /**
   * Show custom notification
   */
  private showCustomNotification(options: NotificationPayload): void {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon,
        tag: options.tag,
        requireInteraction: options.requireInteraction,
        data: options.data
      });

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        notification.close();

        // Focus the app window
        if (window.focus) {
          window.focus();
        }

        // Dispatch custom event for app to handle
        window.dispatchEvent(new CustomEvent('notification-click', {
          detail: {
            action: 'default',
            data: options.data
          }
        }));
      };

      // Auto-close after 10 seconds if not requiring interaction
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 10000);
      }
    } catch (error) {
      console.error('Error showing custom notification:', error);
    }
  }

  /**
   * Update token last used timestamp
   */
  async updateTokenLastUsed(): Promise<void> {
    if (!this.currentToken) return;

    try {
      await supabase.rpc('update_fcm_token_last_used', {
        p_token: this.currentToken
      });
    } catch (error) {
      console.error('Error updating token last used:', error);
    }
  }

  /**
   * Get user notification preferences
   */
  async getNotificationPreferences(): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase.rpc('get_user_notification_preferences', {
        p_user_id: user.id
      });

      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return null;
    }
  }

  /**
   * Cleanup FCM service
   */
  cleanup(): void {
    if (this.unsubscribeFromMessages) {
      this.unsubscribeFromMessages();
      this.unsubscribeFromMessages = null;
    }
    this.isInitialized = false;
    this.currentToken = null;
  }
}

// Export singleton instance
export const fcmService = new FCMService();

// Export individual functions for backward compatibility
export async function registerFCMToken(): Promise<boolean> {
  return fcmService.registerToken();
}

export async function unregisterFCMToken(): Promise<boolean> {
  return fcmService.unregisterToken();
}

export async function initializeFCM(): Promise<boolean> {
  return fcmService.initialize();
}
