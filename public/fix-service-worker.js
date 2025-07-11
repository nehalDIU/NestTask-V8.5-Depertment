/**
 * Service Worker Fix Script
 * Run this in browser console to fix service worker conflicts
 */

(function() {
  'use strict';

  console.log('🔧 Service Worker Fix Script Starting...');

  async function fixServiceWorkerIssues() {
    try {
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.error('❌ Service Workers not supported in this browser');
        return false;
      }

      console.log('📋 Getting current service worker registrations...');
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      console.log(`Found ${registrations.length} service worker registrations:`);
      registrations.forEach((reg, index) => {
        const scriptURL = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || 'unknown';
        console.log(`  ${index + 1}. ${scriptURL}`);
        console.log(`     Scope: ${reg.scope}`);
        console.log(`     State: ${reg.active ? 'active' : reg.installing ? 'installing' : reg.waiting ? 'waiting' : 'unknown'}`);
      });

      // Step 1: Unregister all service workers
      console.log('🧹 Unregistering all service workers...');
      for (const registration of registrations) {
        const scriptURL = registration.active?.scriptURL || 'unknown';
        console.log(`  Unregistering: ${scriptURL}`);
        await registration.unregister();
      }

      // Step 2: Clear all caches
      console.log('🗑️ Clearing all caches...');
      const cacheNames = await caches.keys();
      console.log(`Found ${cacheNames.length} caches:`, cacheNames);
      
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log(`  Deleted cache: ${cacheName}`);
      }

      // Step 3: Wait a moment for cleanup
      console.log('⏳ Waiting for cleanup...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 4: Re-register Firebase messaging service worker
      console.log('🔄 Re-registering Firebase messaging service worker...');
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        console.log('✅ Firebase messaging service worker registered successfully');
        console.log('   Script URL:', registration.active?.scriptURL || registration.installing?.scriptURL);
        console.log('   Scope:', registration.scope);
      } catch (error) {
        console.error('❌ Failed to register Firebase messaging service worker:', error);
      }

      // Step 5: Verify the fix
      console.log('🔍 Verifying the fix...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newRegistrations = await navigator.serviceWorker.getRegistrations();
      console.log(`✅ Fix complete! Now have ${newRegistrations.length} service worker registrations:`);
      
      newRegistrations.forEach((reg, index) => {
        const scriptURL = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || 'unknown';
        console.log(`  ${index + 1}. ${scriptURL}`);
      });

      // Step 6: Reload the page to ensure clean state
      console.log('🔄 Reloading page to ensure clean state...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      return true;
    } catch (error) {
      console.error('❌ Error fixing service worker issues:', error);
      return false;
    }
  }

  // Run the fix
  fixServiceWorkerIssues().then(success => {
    if (success) {
      console.log('🎉 Service worker fix completed successfully!');
    } else {
      console.log('❌ Service worker fix failed. You may need to manually clear browser data.');
    }
  });

})();

// Also expose as a global function for manual use
window.fixServiceWorkerIssues = async function() {
  console.log('🔧 Manual Service Worker Fix...');
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    for (const registration of registrations) {
      await registration.unregister();
    }
    
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
    }
    
    console.log('✅ Service workers and caches cleared. Reloading page...');
    setTimeout(() => window.location.reload(), 1000);
    
    return true;
  } catch (error) {
    console.error('❌ Manual fix failed:', error);
    return false;
  }
};

console.log('💡 You can also run window.fixServiceWorkerIssues() manually anytime');
