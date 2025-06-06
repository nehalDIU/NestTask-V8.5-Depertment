import { registerServiceWorker } from './firebase';

// Register service worker for Firebase messaging
registerServiceWorker()
  .then((registration: ServiceWorkerRegistration | null) => {
    if (registration) {
      console.log('Service Worker registered successfully:', registration.scope);
      
      // Set up periodic ping to keep service worker alive
      const pingInterval = 30 * 60 * 1000; // 30 minutes
      setInterval(() => {
        if (navigator.serviceWorker.controller) {
          // Create a message channel for two-way communication
          const messageChannel = new MessageChannel();
          
          // Setup message channel for response
          messageChannel.port1.onmessage = (event) => {
            if (event.data && event.data.type === 'PONG') {
              console.log('Service worker is alive, received pong at:', new Date().toISOString());
            }
          };
          
          // Send ping message to service worker
          navigator.serviceWorker.controller.postMessage(
            { type: 'PING', timestamp: Date.now() },
            [messageChannel.port2]
          );
        }
      }, pingInterval);
    }
  })
  .catch((error: Error) => {
    console.error('Service Worker registration failed:', error);
  });