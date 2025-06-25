// Production deployment verification script
// This script helps verify that the production deployment is working correctly

console.log('🔍 NestTask Production Deployment Verification');

// Check if we're running in the correct environment
const isProduction = window.location.hostname === 'nesttask.vercel.app';
const isPreview = window.location.hostname.includes('vercel.app') && !isProduction;
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

console.log('Environment Detection:', {
  isProduction,
  isPreview,
  isLocal,
  hostname: window.location.hostname,
  href: window.location.href
});

// Check for build metadata
const buildTime = document.querySelector('meta[name="build-time"]')?.content;
const buildId = document.querySelector('meta[name="build-id"]')?.content;
const cacheBust = document.querySelector('meta[name="cache-bust"]')?.content;

console.log('Build Information:', {
  buildTime: buildTime ? new Date(parseInt(buildTime)).toISOString() : 'Not found',
  buildId: buildId || 'Not found',
  cacheBust: cacheBust || 'Not found'
});

// Check if React app is mounted
const checkReactMount = () => {
  const root = document.getElementById('root');
  const hasContent = root && root.children.length > 0;
  
  console.log('React App Status:', {
    rootExists: !!root,
    hasContent,
    childrenCount: root ? root.children.length : 0
  });
  
  return hasContent;
};

// Check for landing page components
const checkLandingPage = () => {
  const hasLandingPageComponent = typeof window.LandingPage !== 'undefined';
  const hasLandingPageInDOM = document.querySelector('[data-testid="landing-page"]') !== null;
  
  console.log('Landing Page Status:', {
    componentAvailable: hasLandingPageComponent,
    inDOM: hasLandingPageInDOM
  });
  
  return hasLandingPageComponent || hasLandingPageInDOM;
};

// Check environment variables (client-side accessible ones)
const checkEnvironmentVars = () => {
  const hasSupabaseUrl = !!import.meta.env.VITE_SUPABASE_URL;
  const hasSupabaseKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
  const hasFirebaseConfig = !!import.meta.env.VITE_FIREBASE_API_KEY;
  
  console.log('Environment Variables:', {
    supabaseUrl: hasSupabaseUrl,
    supabaseKey: hasSupabaseKey,
    firebaseConfig: hasFirebaseConfig
  });
  
  return hasSupabaseUrl && hasSupabaseKey;
};

// Check for JavaScript errors
let errorCount = 0;
const errors = [];

window.addEventListener('error', (e) => {
  errorCount++;
  const error = {
    message: e.message,
    filename: e.filename,
    lineno: e.lineno,
    timestamp: new Date().toISOString()
  };
  errors.push(error);
  console.error(`❌ JS Error #${errorCount}:`, error);
});

window.addEventListener('unhandledrejection', (e) => {
  const error = {
    type: 'Promise Rejection',
    reason: e.reason,
    timestamp: new Date().toISOString()
  };
  errors.push(error);
  console.error('❌ Promise Rejection:', error);
});

// Run verification after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('📋 Starting verification...');
  
  setTimeout(() => {
    const results = {
      environment: { isProduction, isPreview, isLocal },
      buildInfo: { buildTime, buildId, cacheBust },
      reactMounted: checkReactMount(),
      landingPageAvailable: checkLandingPage(),
      environmentVarsOk: checkEnvironmentVars(),
      errorCount,
      errors: errors.slice(0, 5) // Show first 5 errors
    };
    
    console.log('🔍 Verification Results:', results);
    
    // Overall status
    const isHealthy = results.reactMounted && 
                     results.environmentVarsOk && 
                     errorCount === 0;
    
    console.log(isHealthy ? '✅ Production deployment is healthy!' : '❌ Issues detected in production deployment');
    
    // Store results for debugging
    window.NESTTASK_VERIFICATION = results;
    
  }, 3000); // Wait 3 seconds for app to fully load
});

// Export verification function for manual testing
window.verifyProduction = () => {
  console.log('🔄 Running manual verification...');
  return window.NESTTASK_VERIFICATION || 'Verification not yet complete';
};

console.log('🛠️ Verification script loaded. Run window.verifyProduction() for manual check.');
