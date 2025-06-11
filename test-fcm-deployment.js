// Test script to verify FCM deployment on Vercel
// Run this in the browser console on your deployed Vercel site

console.log('🔥 Starting FCM Deployment Test...');

// Test 1: Check if Firebase environment variables are loaded
console.log('\n📋 Test 1: Environment Variables');
const firebaseEnvVars = {
  apiKey: import.meta?.env?.VITE_FIREBASE_API_KEY || window.VITE_FIREBASE_API_KEY,
  authDomain: import.meta?.env?.VITE_FIREBASE_AUTH_DOMAIN || window.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta?.env?.VITE_FIREBASE_PROJECT_ID || window.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta?.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || window.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta?.env?.VITE_FIREBASE_APP_ID || window.VITE_FIREBASE_APP_ID,
  vapidKey: import.meta?.env?.VITE_FIREBASE_VAPID_KEY || window.VITE_FIREBASE_VAPID_KEY
};

Object.entries(firebaseEnvVars).forEach(([key, value]) => {
  const status = value && value !== 'undefined' ? '✅' : '❌';
  console.log(`${status} ${key}: ${value ? 'Set' : 'Missing'}`);
});

// Test 2: Check service worker registration
console.log('\n🔧 Test 2: Service Worker Registration');
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log(`Found ${registrations.length} service worker(s)`);
    
    registrations.forEach((registration, index) => {
      console.log(`SW ${index + 1}:`);
      console.log(`  Scope: ${registration.scope}`);
      console.log(`  Active: ${registration.active?.scriptURL || 'None'}`);
      console.log(`  Installing: ${registration.installing?.scriptURL || 'None'}`);
      console.log(`  Waiting: ${registration.waiting?.scriptURL || 'None'}`);
    });
    
    // Check for Firebase messaging service worker specifically
    const firebaseSW = registrations.find(reg => 
      reg.active?.scriptURL?.includes('firebase-messaging-sw.js')
    );
    
    if (firebaseSW) {
      console.log('✅ Firebase messaging service worker found');
    } else {
      console.log('❌ Firebase messaging service worker not found');
      console.log('Attempting to register firebase-messaging-sw.js...');
      
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then(registration => {
          console.log('✅ Firebase SW registered successfully:', registration);
        })
        .catch(error => {
          console.error('❌ Firebase SW registration failed:', error);
        });
    }
  }).catch(error => {
    console.error('❌ Error getting service worker registrations:', error);
  });
} else {
  console.log('❌ Service workers not supported');
}

// Test 3: Check if Firebase scripts are accessible
console.log('\n📦 Test 3: Firebase CDN Accessibility');
const firebaseScripts = [
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js'
];

firebaseScripts.forEach(scriptUrl => {
  fetch(scriptUrl, { method: 'HEAD' })
    .then(response => {
      const status = response.ok ? '✅' : '❌';
      console.log(`${status} ${scriptUrl}: ${response.status}`);
    })
    .catch(error => {
      console.log(`❌ ${scriptUrl}: Failed to fetch`);
    });
});

// Test 4: Check notification permission
console.log('\n🔔 Test 4: Notification Permission');
if ('Notification' in window) {
  console.log(`Notification permission: ${Notification.permission}`);
  switch (Notification.permission) {
    case 'granted':
      console.log('✅ Notification permission granted');
      break;
    case 'denied':
      console.log('❌ Notification permission denied');
      break;
    case 'default':
      console.log('⚠️ Notification permission not requested yet');
      break;
  }
} else {
  console.log('❌ Notifications not supported');
}

// Test 5: Check if Firebase messaging is available
console.log('\n🔥 Test 5: Firebase Messaging Availability');
setTimeout(() => {
  if (window.firebase) {
    console.log('✅ Firebase global object available');
    if (window.firebase.messaging) {
      console.log('✅ Firebase messaging available');
    } else {
      console.log('❌ Firebase messaging not available');
    }
  } else {
    console.log('❌ Firebase global object not available');
  }
}, 2000);

// Test 6: Test FCM token generation (if user is logged in)
console.log('\n🎫 Test 6: FCM Token Generation');
setTimeout(() => {
  // This will only work if the user is logged in and has granted permission
  if (window.getFCMToken) {
    window.getFCMToken().then(token => {
      if (token) {
        console.log('✅ FCM token generated successfully');
        console.log(`Token: ${token.substring(0, 20)}...`);
      } else {
        console.log('⚠️ FCM token generation returned null (permission may be needed)');
      }
    }).catch(error => {
      console.error('❌ FCM token generation failed:', error);
    });
  } else {
    console.log('⚠️ getFCMToken function not available (may need to log in first)');
  }
}, 3000);

// Test 7: Check network connectivity to Firebase
console.log('\n🌐 Test 7: Firebase Connectivity');
fetch('https://fcm.googleapis.com/fcm/send', { 
  method: 'OPTIONS',
  mode: 'cors'
}).then(response => {
  console.log('✅ Firebase FCM endpoint accessible');
}).catch(error => {
  console.log('❌ Firebase FCM endpoint not accessible:', error.message);
});

console.log('\n🏁 FCM Deployment Test Complete!');
console.log('Check the results above to identify any issues.');
console.log('If you see ❌ errors, refer to VERCEL_FCM_TROUBLESHOOTING.md for solutions.');
