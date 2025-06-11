import React, { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
// Import CSS (Vite handles this correctly)
import './index.css';
import { MicroLoader } from './components/MicroLoader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initPWA } from './utils/pwa';
import { supabase } from './lib/supabase';
import type { LoginCredentials, SignupCredentials } from './types/auth';

// Lazy-load core pages
const App = lazy(() => import('./App'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then(module => ({ default: module.AuthPage })));

// Enhanced environment validation for production
if (import.meta.env.PROD) {
  console.log('[Production] NestTask starting in production mode');
  console.log('[Production] Build time:', import.meta.env.VITE_BUILD_TIME || 'Unknown');
  console.log('[Production] Version:', import.meta.env.VITE_BUILD_VERSION || 'Unknown');

  // Environment variable validation
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (window as any).ENV_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (window as any).ENV_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    console.error('[Production Error] Missing Supabase URL in production environment');
    console.error('[Production Error] Please set VITE_SUPABASE_URL in Vercel environment variables');
  } else {
    console.log('[Production] Supabase URL configured:', supabaseUrl.substring(0, 30) + '...');
  }

  if (!supabaseKey) {
    console.error('[Production Error] Missing Supabase Anon Key in production environment');
    console.error('[Production Error] Please set VITE_SUPABASE_ANON_KEY in Vercel environment variables');
  } else {
    console.log('[Production] Supabase Anon Key configured:', supabaseKey.substring(0, 20) + '...');
  }

  // Log deployment environment info
  console.log('[Production] Hostname:', window.location.hostname);
  console.log('[Production] Protocol:', window.location.protocol);
  console.log('[Production] User Agent:', navigator.userAgent.substring(0, 50) + '...');
}

// Conditionally import Analytics only in production
const Analytics = import.meta.env.PROD 
  ? lazy(() => import('@vercel/analytics/react').then(mod => ({ default: mod.Analytics })))
  : () => null;

// Simple error boundary for analytics
const AnalyticsErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  if (!import.meta.env.PROD) return null;
  return <>{children}</>;
};

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
          onLogin={async (credentials: LoginCredentials, rememberMe?: boolean) => {
            try {
              const { error } = await supabase.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password
              });
              if (error) throw error;
            } catch (error) {
              throw error;
            }
          }}
          onSignup={async (credentials: SignupCredentials) => {
            try {
              const { error } = await supabase.auth.signUp({
                email: credentials.email,
                password: credentials.password,
                options: { data: { name: credentials.name } }
              });
              if (error) throw error;
            } catch (error) {
              throw error;
            }
          }}
          onForgotPassword={async (email: string) => {
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(email);
              if (error) throw error;
            } catch (error) {
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

// Initialize app with minimal operations
function initApp() {
  // Add DNS prefetch for critical domains
  if (import.meta.env.VITE_SUPABASE_URL) {
    try {
      const url = new URL(import.meta.env.VITE_SUPABASE_URL);
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = url.origin;
      document.head.appendChild(link);
    } catch (e) {
      // Silently fail - non-critical
    }
  }
  
  // Get root element and create React root
  const root = document.getElementById('root');
  if (!root) return;
  
  const reactRoot = createRoot(root);
  
  // Render app with error boundary and minimal surrounding components
  reactRoot.render(
    <StrictMode>
      <ErrorBoundary>
        <Suspense fallback={<MicroLoader />}>
          <RouterProvider router={router} />
          {import.meta.env.PROD && (
            <AnalyticsErrorBoundary>
              <Suspense fallback={null}><Analytics /></Suspense>
            </AnalyticsErrorBoundary>
          )}
        </Suspense>
      </ErrorBoundary>
    </StrictMode>
  );
  
  // Initialize PWA features
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Register main service worker
      navigator.serviceWorker.register('/service-worker.js')
        .then(() => {
          // Initialize PWA features after service worker is registered
          setTimeout(() => initPWA(), 1000);
        })
        .catch(error => console.error('SW registration failed:', error));

      // Register Firebase messaging service worker
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('Firebase messaging SW registered:', registration);
        })
        .catch(error => console.error('Firebase messaging SW registration failed:', error));
    });
  }
}

// Start the app
initApp();