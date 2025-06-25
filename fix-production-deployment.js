// Production deployment fix script for landing page
// This script helps identify and fix common production deployment issues

console.log('🚀 NestTask Production Deployment Fix');

// 1. Environment Detection
const isProduction = window.location.hostname !== 'localhost' && 
                    window.location.hostname !== '127.0.0.1' &&
                    !window.location.hostname.includes('vercel.app');

const isVercelPreview = window.location.hostname.includes('vercel.app') && 
                       !window.location.hostname.includes('nesttask.vercel.app');

const isVercelProduction = window.location.hostname === 'nesttask.vercel.app' ||
                          window.location.hostname === 'your-production-domain.com';

console.log('Environment Detection:', {
  isProduction,
  isVercelPreview,
  isVercelProduction,
  hostname: window.location.hostname,
  href: window.location.href
});

// 2. Check for common issues
const checkEnvironmentVariables = () => {
  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID'
  ];

  const missingVars = requiredEnvVars.filter(varName => {
    const value = import.meta.env[varName];
    return !value || value === 'undefined';
  });

  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:', missingVars);
    return false;
  } else {
    console.log('✅ All required environment variables are present');
    return true;
  }
};

// 3. Check React app mounting
const checkReactMounting = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('❌ Root element not found');
    return false;
  }

  if (rootElement.children.length === 0) {
    console.error('❌ React app not mounted - root element is empty');
    return false;
  }

  console.log('✅ React app appears to be mounted');
  return true;
};

// 4. Check for JavaScript errors
let jsErrorCount = 0;
window.addEventListener('error', (e) => {
  jsErrorCount++;
  console.error(`❌ JavaScript Error #${jsErrorCount}:`, {
    message: e.message,
    filename: e.filename,
    lineno: e.lineno,
    colno: e.colno,
    error: e.error
  });
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('❌ Unhandled Promise Rejection:', e.reason);
});

// 5. Check network requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('🌐 Network Request:', args[0]);
  return originalFetch.apply(this, args)
    .then(response => {
      if (!response.ok) {
        console.error('❌ Network Error:', response.status, response.statusText, args[0]);
      } else {
        console.log('✅ Network Success:', response.status, args[0]);
      }
      return response;
    })
    .catch(error => {
      console.error('❌ Network Failure:', error, args[0]);
      throw error;
    });
};

// 6. Force landing page display (emergency fix)
const forceLandingPage = () => {
  console.log('🔧 Attempting to force landing page display...');
  
  // Clear any auth tokens that might be causing issues
  localStorage.removeItem('supabase.auth.token');
  sessionStorage.removeItem('supabase.auth.token');
  
  // Add URL parameter to force landing page
  if (!window.location.search.includes('landing=true')) {
    const newUrl = window.location.origin + window.location.pathname + '?landing=true';
    console.log('🔄 Redirecting to force landing page:', newUrl);
    window.location.href = newUrl;
  }
};

// 7. Production-specific fixes
const applyProductionFixes = () => {
  if (isVercelProduction) {
    console.log('🔧 Applying production-specific fixes...');
    
    // Fix 1: Ensure proper cache busting
    const timestamp = Date.now();
    const metaTag = document.createElement('meta');
    metaTag.httpEquiv = 'cache-control';
    metaTag.content = 'no-cache, no-store, must-revalidate';
    document.head.appendChild(metaTag);
    
    // Fix 2: Add production debug info
    window.NESTTASK_DEBUG = {
      timestamp,
      environment: 'production',
      buildTime: document.querySelector('meta[name="build-time"]')?.content || 'unknown',
      version: '8.5'
    };
    
    console.log('🔧 Production fixes applied:', window.NESTTASK_DEBUG);
  }
};

// 8. Run diagnostics
const runDiagnostics = () => {
  console.log('🔍 Running production diagnostics...');
  
  const results = {
    environmentVariables: checkEnvironmentVariables(),
    reactMounting: checkReactMounting(),
    jsErrors: jsErrorCount === 0,
    timestamp: new Date().toISOString()
  };
  
  console.log('📊 Diagnostic Results:', results);
  
  // If critical issues found, try emergency fixes
  if (!results.environmentVariables || !results.reactMounting) {
    console.log('🚨 Critical issues detected, applying emergency fixes...');
    setTimeout(forceLandingPage, 2000);
  }
  
  return results;
};

// 9. Initialize fixes
document.addEventListener('DOMContentLoaded', () => {
  console.log('📋 DOM loaded, initializing production fixes...');
  applyProductionFixes();
  
  // Run diagnostics after a short delay to allow React to mount
  setTimeout(runDiagnostics, 1000);
});

// 10. Export for manual debugging
window.NESTTASK_PRODUCTION_FIX = {
  forceLandingPage,
  runDiagnostics,
  checkEnvironmentVariables,
  checkReactMounting,
  applyProductionFixes
};

console.log('🛠️ Production fix script loaded. Use window.NESTTASK_PRODUCTION_FIX for manual debugging.');

export default {
  forceLandingPage,
  runDiagnostics,
  checkEnvironmentVariables,
  checkReactMounting,
  applyProductionFixes
};
