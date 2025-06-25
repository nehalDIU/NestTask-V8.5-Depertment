# 🚀 Production Landing Page Fix Guide

## Issue: Landing Page Works on Preview but Not Production

### Problem Description
The landing page works correctly on Vercel preview domains but fails to display on the production domain. This is a common issue with different caching, environment variables, or routing behavior between preview and production environments.

## 🔧 Fixes Applied

### 1. **Enhanced State Management**
Updated `src/App.tsx` with production-specific logic:

```typescript
// Production-aware landing page state
const [showLandingPage, setShowLandingPage] = useState(() => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    
    // Force landing page for production domain root
    const isProductionRoot = window.location.pathname === '/' && 
                            !urlParams.has('auth') && 
                            !hash.includes('auth') && 
                            !hash.includes('access_token') &&
                            !hash.includes('error');
    
    const hasStoredAuth = localStorage.getItem('supabase.auth.token') || 
                         sessionStorage.getItem('supabase.auth.token');
    
    return isProductionRoot && !hasStoredAuth;
  } catch (error) {
    return true; // Default to landing page on error
  }
});
```

### 2. **Production Domain Detection**
Added automatic detection and forcing of landing page for production domains:

```typescript
useEffect(() => {
  const isProductionDomain = window.location.hostname.includes('.vercel.app') || 
                            window.location.hostname.includes('nesttask');
  const isRootPath = window.location.pathname === '/';
  const hasAuthParams = window.location.search.includes('auth') || 
                       window.location.hash.includes('auth') ||
                       window.location.hash.includes('access_token');
  
  if (isProductionDomain && isRootPath && !hasAuthParams && !user && authLoading === false) {
    setShowLandingPage(true);
  }
}, [user, authLoading]);
```

### 3. **Improved Vercel Configuration**
Updated `vercel.json` with better caching and routing:

```json
{
  "version": 2,
  "buildCommand": "npm run vercel-build",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "trailingSlash": false,
  "routes": [
    {
      "src": "/index.html",
      "headers": { 
        "cache-control": "public, max-age=0, must-revalidate",
        "content-type": "text/html"
      }
    },
    { 
      "src": "/(.*)", 
      "dest": "/index.html",
      "headers": { 
        "cache-control": "public, max-age=0, must-revalidate"
      }
    }
  ]
}
```

## 🚀 Deployment Steps

### Step 1: Clear Production Cache
1. Go to Vercel Dashboard → Your Project → Settings → Functions
2. Click "Clear Cache" or redeploy with cache bypass
3. Or add `?nocache=1` to your production URL temporarily

### Step 2: Verify Environment Variables
Ensure these are set in **Production** environment (not just Preview):
```
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

### Step 3: Force Production Deployment
```bash
# Commit changes
git add .
git commit -m "Fix production landing page display"

# Push to main branch (triggers production deployment)
git push origin main

# Or use Vercel CLI for immediate deployment
vercel --prod
```

### Step 4: Test Production Domain
1. Visit your production URL: `https://your-domain.vercel.app/`
2. Clear browser cache (Ctrl+F5 or Cmd+Shift+R)
3. Try incognito/private browsing mode
4. Check browser console for debug logs

## 🔍 Debugging Production Issues

### Console Logs to Check
The app now logs detailed state information:
```javascript
App state: {
  user: false,
  authLoading: false,
  showLandingPage: true,
  url: "https://your-domain.vercel.app/",
  hostname: "your-domain.vercel.app",
  isProduction: true,
  pathname: "/",
  search: "",
  hash: ""
}
```

### Common Issues & Solutions

#### Issue 1: Environment Variables Not Set in Production
**Symptoms**: App loads but shows errors in console
**Solution**: 
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Ensure all `VITE_*` variables are set for "Production" environment
3. Redeploy after adding variables

#### Issue 2: Cached Old Version
**Symptoms**: Changes work in preview but not production
**Solution**:
1. Clear Vercel cache in dashboard
2. Hard refresh browser (Ctrl+F5)
3. Try incognito mode
4. Add `?v=1` to URL to bypass cache

#### Issue 3: Domain-Specific Issues
**Symptoms**: Works on vercel.app subdomain but not custom domain
**Solution**:
1. Check custom domain DNS settings
2. Verify SSL certificate is active
3. Test with vercel.app subdomain first

#### Issue 4: Authentication State Interference
**Symptoms**: Landing page flickers then disappears
**Solution**:
1. Clear localStorage and sessionStorage
2. Check for stored Supabase auth tokens
3. Test in incognito mode

## 🛠️ Manual Testing Checklist

### Production Domain Testing
- [ ] Visit `https://your-domain.vercel.app/` shows landing page
- [ ] Landing page animations work correctly
- [ ] "Get Started" button transitions to auth page
- [ ] "Sign In" button transitions to auth page
- [ ] "Back to Landing Page" works from auth page
- [ ] Mobile responsive design works
- [ ] Dark theme displays correctly
- [ ] No console errors

### Cross-Browser Testing
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Edge
- [ ] Mobile browsers

### Cache Testing
- [ ] Hard refresh (Ctrl+F5)
- [ ] Incognito/private mode
- [ ] Different devices
- [ ] Clear browser data

## 🚨 Emergency Fixes

### Quick Fix 1: Force Landing Page
Add this temporary code to `App.tsx`:
```typescript
// TEMPORARY: Force landing page for production
const [showLandingPage, setShowLandingPage] = useState(true);
```

### Quick Fix 2: URL Parameter Override
Visit production URL with: `https://your-domain.vercel.app/?landing=true`

### Quick Fix 3: Disable Auth Check Temporarily
Comment out auth loading logic temporarily:
```typescript
// if (authLoading) {
//   return <LoadingScreen />;
// }
```

## 📞 Support & Troubleshooting

### If Landing Page Still Doesn't Work:

1. **Check Build Logs**:
   - Go to Vercel Dashboard → Deployments
   - Click latest deployment
   - Check for build errors

2. **Verify Bundle Contents**:
   - Check if LandingPage component is in the bundle
   - Look for JavaScript errors in browser console

3. **Test API Endpoints**:
   - Verify Supabase connection works
   - Check Firebase configuration

4. **Contact Support**:
   - Provide browser console logs
   - Include Vercel deployment URL
   - Share environment variable configuration (without sensitive values)

## ✅ Expected Behavior After Fix

1. **Production URL Visit**: Shows dark-themed landing page immediately
2. **Navigation**: Smooth transitions between landing and auth pages
3. **Responsive**: Works on all device sizes
4. **Performance**: Fast loading with proper caching
5. **SEO**: Proper meta tags and Open Graph data
6. **PWA**: Progressive Web App features work correctly

---

**Last Updated**: December 2024  
**Status**: Production-ready fix applied
