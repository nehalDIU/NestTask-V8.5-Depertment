# Firebase Push Notifications - Vercel Deployment Guide

## 🚨 Common Issues with FCM on Vercel

Firebase Cloud Messaging often fails on Vercel due to several deployment-specific issues. This guide addresses all common problems and provides solutions.

## ✅ Pre-Deployment Checklist

### 1. Environment Variables Configuration

Ensure all Firebase environment variables are set in your Vercel dashboard:

```bash
# Go to Vercel Dashboard > Your Project > Settings > Environment Variables
VITE_FIREBASE_API_KEY=AIzaSyChI8shVaBxQ56eRinJEyslNx72Za_tUkM
VITE_FIREBASE_AUTH_DOMAIN=nesttask-73c13.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nesttask-73c13
VITE_FIREBASE_STORAGE_BUCKET=nesttask-73c13.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=128980799129
VITE_FIREBASE_APP_ID=1:128980799129:web:8f96bd1343e5c08bf8f208
VITE_FIREBASE_MEASUREMENT_ID=G-PP4W274KEL
VITE_FIREBASE_VAPID_KEY=BJVKvCe8slVvlEahsyvKUvlK4j79lbDza4prZrKSsG_-i5wPGQ8J2MQEGK4a8uNthBW0qg-GO1M8-Y2cLln-BtI
```

**Important**: Set these for all environments (Production, Preview, Development)

### 2. Firebase Console Configuration

1. **Enable Cloud Messaging API**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your project: `nesttask-73c13`
   - Navigate to APIs & Services > Library
   - Search for "Firebase Cloud Messaging API"
   - Enable the API

2. **Configure Authorized Domains**:
   - Go to Firebase Console > Authentication > Settings > Authorized domains
   - Add your Vercel domain: `your-app.vercel.app`
   - Add any custom domains you're using

3. **Verify Web Push Certificate**:
   - Go to Firebase Console > Project Settings > Cloud Messaging
   - Ensure Web Push Certificate is generated
   - Copy the VAPID key (should match your environment variable)

## 🔧 Deployment Steps

### 1. Update Vercel Configuration

The `vercel.json` has been updated to properly handle the Firebase service worker:

```json
{
  "src": "/firebase-messaging-sw.js",
  "headers": { 
    "cache-control": "public, max-age=0, must-revalidate",
    "service-worker-allowed": "/"
  },
  "continue": true
}
```

### 2. Deploy to Vercel

```bash
# Deploy to Vercel
vercel --prod

# Or if using Vercel CLI
npm run build
vercel deploy --prod
```

### 3. Verify Deployment

After deployment, check these items:

1. **Service Worker Registration**:
   - Open browser dev tools
   - Go to Application > Service Workers
   - Verify `firebase-messaging-sw.js` is registered

2. **HTTPS Verification**:
   - Ensure your site is served over HTTPS
   - FCM requires secure context in production

3. **Console Logs**:
   - Check browser console for FCM initialization logs
   - Look for any error messages

## 🐛 Troubleshooting Common Issues

### Issue 1: Service Worker Not Found (404)

**Symptoms**: 
- Console error: "Failed to register service worker"
- 404 error for `/firebase-messaging-sw.js`

**Solution**:
```bash
# Ensure the file is in the public directory
ls public/firebase-messaging-sw.js

# Verify vercel.json configuration includes the service worker route
```

### Issue 2: FCM Token Generation Fails

**Symptoms**:
- Console warning: "Failed to get FCM token"
- No notification permission prompt

**Solution**:
1. Check VAPID key configuration
2. Verify notification permissions
3. Ensure HTTPS is enabled

**Debug Command**:
```javascript
// Run in browser console
window.fcmDebug.testFCMSetup()
```

### Issue 3: Notifications Not Received

**Symptoms**:
- FCM token generated successfully
- No notifications appear on device

**Solution**:
1. Check Supabase Edge Function logs
2. Verify FCM server key in Supabase environment variables
3. Test with Firebase Console messaging

### Issue 4: Environment Variables Not Loading

**Symptoms**:
- Console error: "Firebase VAPID key not configured"
- Firebase initialization fails

**Solution**:
1. Verify environment variables in Vercel dashboard
2. Ensure variables are set for correct environment (Production/Preview)
3. Redeploy after adding variables

## 🧪 Testing Your Deployment

### 1. Automated Testing

Use the debug utility to check FCM setup:

```javascript
// In browser console on your deployed site
window.fcmDebug.testFCMSetup()
```

### 2. Manual Testing Steps

1. **Open your deployed app**
2. **Login as a regular user**
3. **Check browser console** for FCM logs:
   ```
   ✅ Firebase messaging initialized successfully
   ✅ Service Worker registered successfully
   ✅ FCM token generated successfully
   ```
4. **Login as section admin** in another browser/incognito
5. **Create a task** for the section
6. **Verify notification** appears for the regular user

### 3. Database Verification

Check if notifications are being logged:

```sql
-- Check recent notifications
SELECT * FROM notification_history 
ORDER BY sent_at DESC 
LIMIT 10;

-- Check FCM tokens
SELECT COUNT(*) FROM fcm_tokens WHERE is_active = true;
```

## 🔍 Debug Tools

### Browser Console Commands

```javascript
// Test FCM setup
window.fcmDebug.testFCMSetup()

// Get detailed debug info
window.fcmDebug.getFCMDebugInfo().then(console.log)

// Check service worker status
navigator.serviceWorker.getRegistrations().then(console.log)

// Check notification permission
console.log('Notification permission:', Notification.permission)
```

### Network Tab Checks

1. **Service Worker Request**: Look for successful load of `firebase-messaging-sw.js`
2. **FCM Token Request**: Check for requests to `https://fcmregistrations.googleapis.com/`
3. **Supabase Requests**: Verify token registration calls to your Supabase database

## 🚀 Performance Optimization

### 1. Service Worker Caching

The service worker is configured with proper cache headers:
- `cache-control: public, max-age=0, must-revalidate`
- This ensures the service worker updates immediately

### 2. Token Management

- Tokens are automatically refreshed
- Inactive tokens are cleaned up after 30 days
- Multiple device support per user

## 📊 Monitoring

### 1. Vercel Analytics

Monitor your deployment:
- Check function execution logs
- Monitor error rates
- Track performance metrics

### 2. Firebase Console

Monitor FCM usage:
- Go to Firebase Console > Cloud Messaging
- Check message delivery statistics
- Monitor token registration rates

## 🆘 Emergency Troubleshooting

If notifications completely stop working:

1. **Check Vercel Function Logs**:
   - Go to Vercel Dashboard > Functions
   - Check for any errors in edge function execution

2. **Verify Firebase Quotas**:
   - Check Firebase Console for quota limits
   - Ensure you haven't exceeded free tier limits

3. **Test with Firebase Console**:
   - Go to Firebase Console > Cloud Messaging
   - Send a test message to verify FCM is working

4. **Rollback if Necessary**:
   ```bash
   # Rollback to previous deployment
   vercel rollback
   ```

## 📞 Support Resources

- **Firebase Documentation**: https://firebase.google.com/docs/cloud-messaging/js/client
- **Vercel Documentation**: https://vercel.com/docs
- **Debug Console**: Use `window.fcmDebug` in browser console
- **Supabase Logs**: Check Edge Function logs in Supabase dashboard

## ✅ Success Indicators

Your FCM implementation is working correctly when:

- ✅ Service worker registers without errors
- ✅ FCM tokens are generated and stored in database
- ✅ Notifications appear when section admins create tasks
- ✅ Notification history is logged in database
- ✅ No console errors related to Firebase
- ✅ Debug utility reports all checks passed
