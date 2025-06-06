import React from 'react';
import { FirebaseMessagingProvider } from './components/FirebaseMessagingProvider';
import { FcmDebugger } from './components/FcmDebugger';

/**
 * Example of how to integrate FCM into your App
 * This is a simplified version - incorporate these changes into your actual App.tsx
 */

// Import this at the top of your App.tsx
const AppWithFcm: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check if we're in development mode to show debugger
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                        import.meta.env.DEV || 
                        window.location.hostname === 'localhost';
  
  return (
    <FirebaseMessagingProvider>
      {children}
      {isDevelopment && <FcmDebugger showDebugInfo={true} />}
    </FirebaseMessagingProvider>
  );
};

/**
 * Example of how to wrap your application with the FCM provider
 */
const AppExample: React.FC = () => {
  // Your existing app code
  return (
    <AppWithFcm>
      <div>
        {/* Your existing app content */}
        <h1>My Application</h1>
        <p>This is an example of how to integrate FCM.</p>
      </div>
    </AppWithFcm>
  );
};

export default AppExample;

/**
 * INTEGRATION INSTRUCTIONS:
 * 
 * 1. Wrap your App component with FirebaseMessagingProvider
 * 2. Add the FcmDebugger component in development mode
 * 3. Make sure the service worker is registered in index.tsx
 * 4. Ensure the fcm_tokens table exists in your Supabase database
 * 5. Test FCM token registration using the debugger
 * 
 * Example App.tsx integration:
 * 
 * export default function App() {
 *   // Your existing App code
 *   
 *   // Check if user is authenticated
 *   if (!user) {
 *     return <AuthPage />;
 *   }
 *   
 *   // For regular users
 *   return (
 *     <FirebaseMessagingProvider>
 *       <div className="app-container">
 *         {/* Your existing app content */}
 *       </div>
 *       {process.env.NODE_ENV === 'development' && <FcmDebugger />}
 *     </FirebaseMessagingProvider>
 *   );
 * }
 */ 