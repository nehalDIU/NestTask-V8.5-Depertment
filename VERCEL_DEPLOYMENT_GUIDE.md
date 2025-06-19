# Vercel Deployment Troubleshooting Guide

## 🚨 Critical Issues Fixed

This guide addresses the main issues that were causing functions to fail in production on Vercel.

### Issues Identified:

1. **Environment Variable Mismatch** - Fixed ✅
2. **Build Configuration Conflict** - Fixed ✅  
3. **Console Logging Disabled in Production** - Fixed ✅
4. **Development-Only Bypasses** - Fixed ✅
5. **FCM Service Worker Issues** - Fixed ✅

## 🔧 Required Vercel Environment Variables

Go to your Vercel dashboard → Project Settings → Environment Variables and add these:

### Supabase Configuration
```
VITE_SUPABASE_URL=https://jqpdftmgertvsgpwdvgw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxcGRmdG1nZXJ0dnNncHdkdmd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyOTY1MDUsImV4cCI6MjA2NDg3MjUwNX0.7XEAIhSBMqknx4jCQ5dTdUSfbhQpU2GoPybIHhnOcrA
```

### Firebase Configuration (for FCM)
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

**Important:** Set all environment variables for **Production**, **Preview**, and **Development** environments.

## 🔍 Debugging Production Issues

### 1. Check Console Logs
After deployment, open your production site and check the browser console. You should now see:
- `🚀 NestTask Production Debug Mode`
- Detailed configuration status
- Any missing environment variables
- Browser support information

### 2. Manual Debug Commands
In the browser console, you can run:
```javascript
// Get comprehensive debug information
window.nestTaskDebug.logDebugInfo();

// Run FCM-specific diagnostics
window.fcmDiagnostics.logFCMDiagnostics();

// Export debug info for support
console.log(window.nestTaskDebug.exportDebugInfo());
```

### 3. Enable Debug Mode
Add this to localStorage to enable debug mode:
```javascript
localStorage.setItem('nesttask_debug', 'true');
```
Then refresh the page.

## 🚀 Deployment Steps

1. **Update Environment Variables** in Vercel dashboard
2. **Redeploy** your application
3. **Check Console Logs** in production
4. **Test Critical Functions**:
   - User authentication
   - Database connections
   - Push notifications
   - FCM token generation

## 🔧 Common Issues & Solutions

### Issue: "Missing Supabase environment variables"
**Solution:** Ensure all environment variables are set in Vercel dashboard for all environments.

### Issue: "Invalid VAPID key configuration" error
**Solution:**
- Ensure VAPID key is exactly copied from Firebase Console
- Verify no extra spaces or line breaks in environment variable
- VAPID key should be 87-88 characters and start with 'B'
- Use the FCM diagnostics: `window.fcmDiagnostics.logFCMDiagnostics()`

### Issue: FCM not working in production
**Solution:**
- Verify HTTPS is enabled (automatic on Vercel)
- Check VAPID key is correctly set
- Ensure service worker is registered
- Run FCM diagnostics for detailed troubleshooting

### Issue: Authentication failures
**Solution:**
- Verify Supabase URL and anon key match your project
- Check database connection in production logs

### Issue: Console logs not showing
**Solution:** Fixed - console logs are now preserved in production for debugging.

## 📊 Monitoring

After deployment, monitor these areas:
1. **Browser Console** - Check for errors and debug information
2. **Vercel Function Logs** - Check for server-side errors
3. **Supabase Dashboard** - Monitor database connections and auth
4. **Firebase Console** - Monitor FCM delivery and errors

## 🆘 If Issues Persist

1. Check the production console for the debug information
2. Copy the debug output from `window.nestTaskDebug.exportDebugInfo()`
3. Check Vercel deployment logs for build errors
4. Verify all environment variables are correctly set

## ✅ Verification Checklist

After deployment, verify:
- [ ] App loads without errors
- [ ] User can log in/sign up
- [ ] Database operations work
- [ ] Push notifications can be enabled
- [ ] FCM tokens are generated
- [ ] No console errors related to missing environment variables
- [ ] Debug information shows all configurations as valid

The fixes implemented should resolve the main issues causing functions to fail in production. The enhanced logging and debug tools will help identify any remaining issues quickly.
