# FCM on Vercel - Troubleshooting Guide

This guide helps you troubleshoot Firebase Cloud Messaging (FCM) issues when deploying to Vercel.

## Common Issues and Solutions

### 1. **Firebase Service Worker Not Loading**

**Symptoms:**
- Console error: "Failed to register service worker"
- FCM not working in production
- Service worker 404 errors

**Solutions:**
✅ **Fixed**: Updated `public/firebase-messaging-sw.js` with actual Firebase config
✅ **Fixed**: Added proper Vercel routing for service workers
✅ **Fixed**: Updated headers for service worker content type

### 2. **Environment Variables Not Available**

**Symptoms:**
- Firebase config shows `undefined` values
- Console error: "Firebase configuration validation failed"
- FCM initialization fails

**Solutions:**
✅ **Fixed**: Added fallback values in Firebase config
✅ **Fixed**: Updated `.env.production` with Firebase variables
✅ **Fixed**: Added environment variable validation

### 3. **Content Security Policy (CSP) Blocking Firebase**

**Symptoms:**
- Console error: "Refused to load script from Firebase CDN"
- Firebase scripts blocked by CSP
- Service worker import errors

**Solutions:**
✅ **Fixed**: Updated CSP headers to allow Firebase CDN
✅ **Fixed**: Added Firebase domains to connect-src and script-src

### 4. **Service Worker Registration Issues**

**Symptoms:**
- Service worker registration fails
- FCM token generation fails
- Background notifications not working

**Solutions:**
✅ **Fixed**: Added proper service worker headers
✅ **Fixed**: Updated Vercel.json routing configuration
✅ **Fixed**: Added Service-Worker-Allowed header

## Deployment Checklist

Before deploying to Vercel, ensure:

### ✅ Environment Variables
- [ ] Firebase config added to Vercel environment variables
- [ ] `.env.production` file updated with Firebase config
- [ ] VAPID key properly set

### ✅ Service Worker Configuration
- [ ] `public/firebase-messaging-sw.js` has actual Firebase config (not placeholders)
- [ ] Service worker properly registered in main app
- [ ] Vercel routing configured for service workers

### ✅ Headers and Security
- [ ] CSP headers allow Firebase CDN
- [ ] Service worker headers properly configured
- [ ] CORS headers allow Firebase domains

### ✅ Build Configuration
- [ ] Firebase SDK properly bundled
- [ ] No build errors related to Firebase
- [ ] Service workers copied to dist directory

## Testing FCM on Vercel

### 1. **Check Service Worker Registration**
```javascript
// Open browser console on your Vercel deployment
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Registered service workers:', registrations);
  registrations.forEach(reg => {
    console.log('SW scope:', reg.scope);
    console.log('SW active:', reg.active?.scriptURL);
  });
});
```

### 2. **Test Firebase Configuration**
```javascript
// Check if Firebase config is loaded correctly
console.log('Firebase config:', {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID
});
```

### 3. **Test FCM Token Generation**
```javascript
// Test FCM token generation
import { getFCMToken } from './src/firebase';
getFCMToken().then(token => {
  console.log('FCM Token:', token);
}).catch(error => {
  console.error('FCM Token Error:', error);
});
```

## Vercel Environment Variables Setup

In your Vercel dashboard, add these environment variables:

```
VITE_FIREBASE_API_KEY=AIzaSyACfcXjX0vNXWNduCRks1Z6LRa9XAY2pJ8
VITE_FIREBASE_AUTH_DOMAIN=nesttask-diu.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nesttask-diu
VITE_FIREBASE_STORAGE_BUCKET=nesttask-diu.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=743430115138
VITE_FIREBASE_APP_ID=1:743430115138:web:3cbbdc0c149def8f88c2db
VITE_FIREBASE_MEASUREMENT_ID=G-37LEQPKB3B
VITE_FIREBASE_VAPID_KEY=BP0PQk228HtybCDJ7LkkRGd437hwZjbC0SAQYM4Pk2n5PyFRfbxKoRKq7ze6lFuTM1njp7f9y0oaWFM5D_k5TS4
```

## Debug Commands

### Check Build Output
```bash
# Check if service workers are in dist
ls -la dist/
ls -la dist/firebase-messaging-sw.js
```

### Check Network Requests
1. Open browser DevTools
2. Go to Network tab
3. Look for failed requests to Firebase CDN
4. Check service worker registration requests

### Check Console Errors
1. Open browser console
2. Look for Firebase-related errors
3. Check service worker registration errors
4. Verify FCM token generation

## Common Error Messages and Fixes

### "Firebase configuration validation failed"
- **Cause**: Missing or invalid Firebase environment variables
- **Fix**: Check Vercel environment variables and fallback values

### "Failed to register service worker"
- **Cause**: Service worker file not found or CSP blocking
- **Fix**: Check Vercel routing and CSP headers

### "Messaging is not supported"
- **Cause**: Service worker not properly registered or HTTPS required
- **Fix**: Ensure HTTPS and proper service worker registration

### "Permission denied"
- **Cause**: Notification permission not granted or blocked
- **Fix**: Check notification permission flow and user interaction

## Production Deployment Steps

1. **Update Firebase Configuration**
   - Replace all placeholder values in service worker
   - Add environment variables to Vercel

2. **Deploy to Vercel**
   ```bash
   git add .
   git commit -m "Fix FCM for Vercel deployment"
   git push origin main
   ```

3. **Test After Deployment**
   - Check service worker registration
   - Test notification permission request
   - Verify FCM token generation
   - Test notification sending

4. **Monitor Logs**
   - Check Vercel function logs
   - Monitor browser console for errors
   - Test on different devices/browsers

## Support

If you're still experiencing issues:
1. Check Vercel deployment logs
2. Test locally with production build
3. Verify Firebase project settings
4. Check browser compatibility
5. Test on different networks (some corporate networks block FCM)
