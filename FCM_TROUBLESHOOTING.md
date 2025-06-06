# Firebase Cloud Messaging (FCM) Troubleshooting Guide

This guide helps you diagnose and fix common issues with Firebase Cloud Messaging in your NestTask application.

## Common Issues and Solutions

### 1. Service Worker Not Registering

**Symptoms:**
- FCM token cannot be retrieved
- No notifications in background mode
- Error: "Failed to register service worker"

**Solutions:**
1. **Check Service Worker Path**: Ensure the service worker file is at the correct location (`/firebase-messaging-sw.js` in the public folder).

2. **Verify Service Worker Content**: Make sure the service worker has the correct Firebase configuration that matches your `firebase.ts` file.

3. **Use Absolute URL**: Register the service worker with an absolute URL:
   ```javascript
   const swUrl = new URL('/firebase-messaging-sw.js', window.location.origin).href;
   navigator.serviceWorker.register(swUrl);
   ```

4. **Check Browser Support**: Ensure you're using a browser that supports service workers and FCM.

5. **HTTPS Requirement**: Service workers require HTTPS. Use HTTPS even in development (or localhost which is exempt).

6. **Clear Browser Cache**: Clear your browser cache and reload the application.

### 2. FCM Token Not Generated

**Symptoms:**
- `getFcmToken()` returns null
- Error: "Messaging: We are unable to register the default service worker."

**Solutions:**
1. **Check Firebase Initialization**: Ensure Firebase is properly initialized before requesting a token.

2. **Verify VAPID Key**: Make sure you've provided the correct VAPID key from Firebase Console.

3. **Wait for Service Worker**: Ensure the service worker is registered and active before requesting a token:
   ```javascript
   await navigator.serviceWorker.ready;
   const token = await getFcmToken();
   ```

4. **Check Console for Errors**: Look for specific Firebase errors in the browser console.

5. **Try with Retry Logic**: Implement retry logic when getting the token:
   ```javascript
   const getTokenWithRetry = async (retries = 3) => {
     try {
       const token = await getFcmToken();
       return token;
     } catch (error) {
       if (retries > 0) {
         await new Promise(resolve => setTimeout(resolve, 1000));
         return getTokenWithRetry(retries - 1);
       }
       return null;
     }
   };
   ```

### 3. FCM Token Not Saved in Supabase

**Symptoms:**
- Token is generated but not stored in Supabase
- Error: "Error storing FCM token in Supabase"

**Solutions:**
1. **Check Authentication**: Ensure the user is authenticated before storing the token.

2. **Verify Table Exists**: Make sure the `fcm_tokens` table exists in your Supabase database with the correct schema.

3. **Check RLS Policies**: Ensure Row Level Security policies allow token insertion.

4. **Validate Schema**: Confirm the table schema matches what you're trying to insert:
   ```sql
   -- Required schema
   CREATE TABLE public.fcm_tokens (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     fcm_token TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     last_used TIMESTAMP WITH TIME ZONE DEFAULT now(),
     device_info TEXT,
     CONSTRAINT unique_user_token UNIQUE (user_id, fcm_token)
   );
   ```

5. **Check Supabase Connection**: Verify your Supabase connection is working properly.

### 4. Notifications Not Showing in Background

**Symptoms:**
- Notifications work when app is open but not in background
- No errors in console

**Solutions:**
1. **Check Service Worker Installation**: Ensure the service worker is properly installed and handling background messages.

2. **Verify Background Handler**: Make sure your service worker has the correct background message handler:
   ```javascript
   messaging.onBackgroundMessage(function(payload) {
     const notificationTitle = payload.notification.title;
     const notificationOptions = {
       body: payload.notification.body,
       icon: '/icons/icon-192x192.png'
     };
     self.registration.showNotification(notificationTitle, notificationOptions);
   });
   ```

3. **Test with FCM Debugger**: Use the FCM Debugger component to test notification functionality.

4. **Check Notification Format**: Ensure your notification payload follows the FCM format.

5. **Verify Browser Support**: Some browsers have restrictions on background notifications.

### 5. Notifications Not Showing in Foreground

**Symptoms:**
- Messages are received (visible in console) but no notification is displayed
- Error: "Notification permission not granted"

**Solutions:**
1. **Check Notification Permission**: Ensure notification permission is granted:
   ```javascript
   if (Notification.permission !== 'granted') {
     await Notification.requestPermission();
   }
   ```

2. **Implement Manual Display**: For foreground notifications, you need to manually create them:
   ```javascript
   onMessageListener().then(payload => {
     new Notification(payload.notification.title, {
       body: payload.notification.body,
       icon: '/icons/icon-192x192.png',
     });
   });
   ```

3. **Check for Errors**: Look for errors in the console when displaying notifications.

### 6. Permission Issues

**Symptoms:**
- Notification permission dialog never appears
- Permission status stays as "default"

**Solutions:**
1. **Request in User Action**: Request notification permission in response to a user action:
   ```javascript
   button.addEventListener('click', async () => {
     await Notification.requestPermission();
   });
   ```

2. **Check Browser Settings**: User might have blocked notifications at the browser level.

3. **Explain Benefits**: Before requesting permission, explain to users why notifications are beneficial.

## Using the FCM Debugger

The FCM Debugger component can help diagnose issues:

1. Add the debugger to your app in development mode:
   ```jsx
   {process.env.NODE_ENV === 'development' && <FcmDebugger />}
   ```

2. Use the debugger to:
   - Check notification permission status
   - Register the service worker
   - Test FCM token retrieval
   - Send test notifications
   - View detailed error information

## Advanced Troubleshooting

### Inspect Service Worker

1. Open Chrome DevTools
2. Go to Application > Service Workers
3. Check if your service worker is registered and active
4. Look for errors in the service worker console

### Check Firebase Console

1. Go to Firebase Console > Cloud Messaging
2. Verify your project settings
3. Check that the Web Push certificates are properly configured
4. Try sending a test message from the console

### Network Monitoring

1. Use Chrome DevTools Network tab
2. Filter for "firebase" or "fcm"
3. Look for failed requests to FCM endpoints
4. Check response codes and error messages

## Still Having Issues?

If you're still experiencing problems after trying these solutions:

1. Enable verbose logging in Firebase:
   ```javascript
   firebase.setLogLevel('debug');
   ```

2. Check browser compatibility:
   - Chrome, Edge, and Firefox support FCM well
   - Safari has limited support for web push

3. Test on different devices and networks

4. Verify your Firebase project settings and permissions

5. Consider implementing a fallback notification mechanism for browsers that don't support FCM 