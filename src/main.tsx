import React, { StrictMode, Suspense, lazy, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
// Import CSS (Vite handles this correctly)
import './index.css';
import { LoadingScreen } from '@/components/LoadingScreen';
import { initPWA } from '@/utils/pwa';
import { prefetchResources, prefetchAsset, prefetchApiData } from '@/utils/prefetch';
import { supabase } from './lib/supabase';

// Ultra-light loading indicator to avoid expensive component imports
const MicroLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-50">
    <svg width="32" height="32" viewBox="0 0 32 32" style={{ color: '#2563eb' }}>
      <circle cx="16" cy="16" r="14" 
        fill="none" 
        stroke="currentColor" 
        strokeOpacity="0.2" 
        strokeWidth="4" 
      />
      <path
        d="M16 2 A14 14 0 0 1 30 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 16 16"
          to="360 16 16"
          dur="0.75s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  </div>
);

// Lazy-load all pages
const App = lazy(() => import('./App'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then(module => ({ default: module.AuthPage })));

// Ensure environment variables are properly loaded in production
if (import.meta.env.PROD) {
  console.log('[Debug] Running in production mode - checking environment variables');
  // Check if we need to add environment variables to window for runtime access
  if (!import.meta.env.VITE_SUPABASE_URL && !((window as any).ENV_SUPABASE_URL)) {
    console.error('[Error] Missing Supabase URL in production environment');
  }
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY && !((window as any).ENV_SUPABASE_ANON_KEY)) {
    console.error('[Error] Missing Supabase Anon Key in production environment');
  }
}

// Performance optimizations initialization
const startTime = performance.now();

// Mark the first paint timing
performance.mark('app-init-start');

// Conditionally import Analytics only in production
const Analytics = import.meta.env.PROD 
  ? lazy(() => import('@vercel/analytics/react').then(mod => ({ default: mod.Analytics })))
  : () => null;

// Simple error boundary component for analytics
const AnalyticsErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      if (event.message.includes('_vercel/insights') || 
          (event.error && event.error.stack && event.error.stack.includes('_vercel/insights'))) {
        setHasError(true);
        event.preventDefault();
      }
    };
    
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);
  
  return hasError ? null : <>{children}</>;
};

// Load important components in parallel before router definition
const preloadPromise = Promise.all([
  // Preload the auth page as it's likely the first thing users will see
  import('./pages/AuthPage').then(module => module.AuthPage),
  
  // Preload App.tsx for faster main app load
  import('./App'),
]);

// Define app routes
const router = createBrowserRouter([
  {
    path: '/',
    element: <Suspense fallback={<MicroLoader />}><App /></Suspense>,
    children: []
  },
  {
    path: '/auth',
    element: (
      <Suspense fallback={<MicroLoader />}>
        <AuthPage 
          onLogin={async (credentials, rememberMe) => {
            try {
              // Login is deferred to when the component is actually loaded
              const { data, error } = await supabase.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password
              });
              if (error) throw error;
            } catch (error) {
              console.error('Login error:', error);
              throw error;
            }
          }}
          onSignup={async (credentials) => {
            try {
              const { data, error } = await supabase.auth.signUp({
                email: credentials.email,
                password: credentials.password,
                options: { data: { name: credentials.name } }
              });
              if (error) throw error;
            } catch (error) {
              console.error('Signup error:', error);
              throw error;
            }
          }}
          onForgotPassword={async (email) => {
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(email);
              if (error) throw error;
            } catch (error) {
              console.error('Forgot password error:', error);
              throw error;
            }
          }}
        />
      </Suspense>
    )
  },
  {
    path: '/reset-password',
    element: <Suspense fallback={<MicroLoader />}><ResetPasswordPage /></Suspense>
  }
]);

// Optimized connection hints - only the most critical ones
function addConnectionHints() {
  // Only add the Supabase URL hint to avoid too many preconnects
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (url) {
    try {
      const u = new URL(url);
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = u.origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    } catch (e) {
      // Silently fail - non-critical
    }
  }
}

// Initialize app with minimal operations
function initApp() {
  // Add minimal connection hints
  addConnectionHints();
  
  // Get root element
  const root = document.getElementById('root');
  if (!root) return;
  
  // Create React root and render with minimal extras
  const reactRoot = createRoot(root);
  
  // Render app with minimal surrounding components
  reactRoot.render(
    <StrictMode>
      <Suspense fallback={<MicroLoader />}>
        <RouterProvider router={router} />
        {import.meta.env.PROD && (
          <AnalyticsErrorBoundary>
            <Suspense fallback={null}><Analytics /></Suspense>
          </AnalyticsErrorBoundary>
        )}
      </Suspense>
    </StrictMode>
  );
  
  // Initialize PWA immediately but handle registration in background
  if ('serviceWorker' in navigator) {
    // Register service worker immediately
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        // After successful registration, initialize PWA features
        setTimeout(() => {
          initPWA().catch(console.error);
        }, 1000);
      })
      .catch(error => console.error('SW registration failed:', error));
  }
  
  // Defer non-essential operations
  setTimeout(() => {
    // Prefetch critical assets after UI is visible
    if (navigator.onLine) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = '/icons/icon-192x192.png';
      document.head.appendChild(link);
      
      // Load API data in the background
      if (!navigator.connection?.saveData) {
        import('./utils/prefetch').then(({ prefetchApiData }) => {
          prefetchApiData(
            'tasks',
            (query: any) => query.select('*').limit(10),
            'tasks'
          );
        });
      }
    }
    
    // Log performance metrics
    const loadTime = performance.now() - startTime;
    console.debug(`App initialized in ${loadTime.toFixed(0)}ms`);
  }, 2000);
}

// Start the app
initApp();

// Attach core event listeners only
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .catch(error => console.error('SW registration failed:', error));
  });
  
  // Basic auth state change handler
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'AUTH_STATE_CHANGED',
          event,
          timestamp: Date.now()
        });
      }
    }
  });
}