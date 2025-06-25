# 🔧 Production vs Preview Domain Fix Guide

## Issue Description
The landing page works on Vercel preview domains (e.g., `nesttask-git-main-username.vercel.app`) but not on the production domain (e.g., `nesttask.vercel.app`).

## 🎯 Root Causes

### 1. **Caching Issues**
- Production domains have more aggressive caching
- Browser cache, CDN cache, and Vercel edge cache
- Old builds may be cached on production

### 2. **Environment Variables**
- Different environment variable sets between preview and production
- Production may have missing or incorrect variables

### 3. **Build Differences**
- Preview uses latest commit, production uses specific deployment
- Different build artifacts or configurations

### 4. **Domain-Specific Issues**
- Custom domain configuration problems
- SSL/TLS certificate issues
- DNS propagation delays

## 🚀 Immediate Fixes

### Fix 1: Force Cache Invalidation
```bash
# In Vercel Dashboard:
1. Go to your project
2. Settings → Functions
3. Clear all caches
4. Redeploy

# Or use Vercel CLI:
vercel --prod --force
```

### Fix 2: Environment Variables Check
```bash
# Verify in Vercel Dashboard → Settings → Environment Variables
# Ensure these are set for PRODUCTION:
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

### Fix 3: Manual Production Deployment
```bash
# Force a fresh production deployment
git add .
git commit -m "Fix production deployment - force rebuild"
git push origin main

# Then in Vercel Dashboard:
# Go to Deployments → Latest → Promote to Production
```

## 🔍 Debugging Steps

### Step 1: Compare URLs
```
Preview:  https://nesttask-git-main-username.vercel.app/
Production: https://nesttask.vercel.app/

# Test both URLs and compare:
1. Browser console errors
2. Network requests
3. Environment variables
4. React app mounting
```

### Step 2: Check Build Logs
```
1. Vercel Dashboard → Deployments
2. Click on production deployment
3. Check build logs for errors
4. Compare with preview deployment logs
```

### Step 3: Browser Testing
```
1. Open production URL in incognito mode
2. Hard refresh (Ctrl+F5 / Cmd+Shift+R)
3. Clear all browser data for the domain
4. Check browser console for errors
```

## 🛠️ Advanced Fixes

### Fix 1: Update Vercel Configuration
The updated `vercel.json` includes:
- Cache control headers
- Clean URLs
- Proper content types
- Force no-cache for HTML files

### Fix 2: Production-Specific Code
Added production detection and fixes in `index.html`:
```javascript
// Detects production vs preview
const isVercelProduction = window.location.hostname === 'nesttask.vercel.app';

// Applies production-specific fixes
if (isVercelProduction) {
  // Cache busting
  // Error tracking
  // Emergency fallbacks
}
```

### Fix 3: Emergency Landing Page Force
```javascript
// If React app fails to mount, force landing page
if (!root || root.children.length === 0) {
  window.location.href = window.location.origin + '/?landing=true&cache=' + Date.now();
}
```

## 📋 Step-by-Step Resolution

### Step 1: Clear All Caches
```bash
# Browser
- Clear browser cache and cookies
- Use incognito/private mode

# Vercel
- Dashboard → Settings → Clear all caches
- Force redeploy
```

### Step 2: Verify Environment Variables
```bash
# Check production environment variables
# Ensure they match preview environment
# Look for typos or missing values
```

### Step 3: Force Fresh Deployment
```bash
# Make a small change to trigger rebuild
echo "// Production fix $(date)" >> src/App.tsx
git add .
git commit -m "Force production rebuild"
git push origin main
```

### Step 4: Test Production URL
```bash
# Test these URLs:
https://nesttask.vercel.app/
https://nesttask.vercel.app/?landing=true
https://nesttask.vercel.app/?cache=123456
```

### Step 5: Monitor Console Logs
The enhanced debug script will log:
- Environment detection
- Cache busting status
- React mounting status
- Error tracking
- Emergency fixes applied

## 🚨 Emergency Workarounds

### Workaround 1: URL Parameters
```
# Force landing page with URL parameter
https://nesttask.vercel.app/?landing=true

# Force cache bust
https://nesttask.vercel.app/?cache=123456

# Combine both
https://nesttask.vercel.app/?landing=true&cache=123456
```

### Workaround 2: Temporary Redirect
Add to `vercel.json`:
```json
{
  "redirects": [
    {
      "source": "/",
      "destination": "/?landing=true",
      "permanent": false
    }
  ]
}
```

### Workaround 3: Custom Domain
```bash
# If production domain has issues, temporarily use:
# 1. Different custom domain
# 2. Preview domain for production
# 3. Subdomain (app.nesttask.vercel.app)
```

## 🔧 Production-Specific Fixes Applied

### 1. Enhanced Index.html
- Production environment detection
- Automatic cache busting
- Emergency fallback mechanisms
- Enhanced error tracking

### 2. App.tsx Updates
- URL-based state management
- Production-aware authentication flow
- Debug logging for production issues

### 3. Vercel Configuration
- Optimized caching headers
- Clean URLs enabled
- Proper content types
- No-cache for HTML files

## 📊 Success Indicators

### ✅ Working Production Deployment
- Landing page loads immediately
- Dark theme displays correctly
- Navigation buttons work
- Console shows no errors
- Mobile responsive design works
- PWA features function

### ❌ Failed Production Deployment
- Blank white page
- JavaScript errors in console
- Network request failures
- Landing page doesn't appear
- Authentication issues

## 📞 Final Steps

### If Issue Persists:
1. **Contact Vercel Support** with deployment logs
2. **Try different browser** to rule out local issues
3. **Use preview domain temporarily** while fixing production
4. **Check custom domain settings** if using one
5. **Consider subdomain deployment** as alternative

### Success Verification:
```bash
# Test these scenarios:
1. Fresh browser visit to production URL
2. Mobile device testing
3. Different geographic locations
4. Various browsers (Chrome, Firefox, Safari, Edge)
5. Incognito/private browsing mode
```

---

**Expected Timeline**: 15-30 minutes for cache propagation after fixes are applied.

**Status**: Ready for production deployment testing.
