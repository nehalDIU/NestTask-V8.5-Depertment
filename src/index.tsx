import { registerServiceWorker } from './firebase';

// Ensure service worker registration happens as early as possible
if ('serviceWorker' in navigator) {
  const registerSW = async () => {
    try {
      // Use absolute URL to ensure correct path in production
      const swUrl = new URL('/firebase-messaging-sw.js', window.location.origin).href;
      console.log('Registering service worker from:', swUrl);
      
      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/'
      });
      
      console.log('Service Worker registered successfully:', registration.scope);
      
      // Check if service worker is active
      if (registration.active) {
        console.log('Service Worker is active');
      } else {
        console.log('Service Worker not yet active, waiting for activation');
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              console.log('Service Worker state changed to:', newWorker.state);
            });
          }
        });
      }
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      // Retry registration after 5 seconds
      setTimeout(registerSW, 5000);
      return null;
    }
  };
  
  // Execute registration
  registerSW();
}