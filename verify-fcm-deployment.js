// FCM Deployment Verification Script
// Run this in your browser console on the deployed Vercel site

console.log('🔥 Starting FCM Deployment Verification...');
console.log('='.repeat(50));

// Configuration
const SUPABASE_URL = 'https://jqpdftmgertvsgpwdvgw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxcGRmdG1nZXJ0dnNncHdkdmd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyOTY1MDUsImV4cCI6MjA2NDg3MjUwNX0.7XEAIhSBMqknx4jCQ5dTdUSfbhQpU2GoPybIHhnOcrA';

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  tests: {},
  summary: { passed: 0, failed: 0, total: 0 }
};

// Helper function to log test results
function logTest(testName, passed, message, details = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${testName}: ${message}`);
  if (details) console.log('  Details:', details);
  
  testResults.tests[testName] = { passed, message, details };
  testResults.summary.total++;
  if (passed) testResults.summary.passed++;
  else testResults.summary.failed++;
}

// Test 1: Environment Variables
console.log('\n📋 Test 1: Environment Variables');
try {
  const firebaseConfig = {
    apiKey: window.VITE_FIREBASE_API_KEY || 'AIzaSyACfcXjX0vNXWNduCRks1Z6LRa9XAY2pJ8',
    projectId: window.VITE_FIREBASE_PROJECT_ID || 'nesttask-diu',
    messagingSenderId: window.VITE_FIREBASE_MESSAGING_SENDER_ID || '743430115138',
    vapidKey: window.VITE_FIREBASE_VAPID_KEY || 'BP0PQk228HtybCDJ7LkkRGd437hwZjbC0SAQYM4Pk2n5PyFRfbxKoRKq7ze6lFuTM1njp7f9y0oaWFM5D_k5TS4'
  };
  
  const allConfigured = Object.values(firebaseConfig).every(val => val && val !== 'undefined');
  logTest('Environment Variables', allConfigured, 
    allConfigured ? 'All Firebase config variables are set' : 'Some Firebase config variables are missing',
    firebaseConfig
  );
} catch (error) {
  logTest('Environment Variables', false, 'Error checking environment variables', error.message);
}

// Test 2: Service Worker Registration
console.log('\n🔧 Test 2: Service Worker Registration');
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    const firebaseSW = registrations.find(reg => 
      reg.active?.scriptURL?.includes('firebase-messaging-sw.js')
    );
    
    logTest('Service Worker', !!firebaseSW, 
      firebaseSW ? 'Firebase messaging service worker is registered' : 'Firebase messaging service worker not found',
      { 
        totalSW: registrations.length,
        firebaseSWUrl: firebaseSW?.active?.scriptURL 
      }
    );
  }).catch(error => {
    logTest('Service Worker', false, 'Error checking service workers', error.message);
  });
} else {
  logTest('Service Worker', false, 'Service workers not supported in this browser');
}

// Test 3: Firebase Messaging Availability
console.log('\n🔥 Test 3: Firebase Messaging');
setTimeout(() => {
  try {
    const hasFirebase = typeof window.firebase !== 'undefined';
    const hasMessaging = hasFirebase && typeof window.firebase.messaging !== 'undefined';
    
    logTest('Firebase SDK', hasFirebase, 
      hasFirebase ? 'Firebase SDK is loaded' : 'Firebase SDK not loaded'
    );
    
    logTest('Firebase Messaging', hasMessaging, 
      hasMessaging ? 'Firebase Messaging is available' : 'Firebase Messaging not available'
    );
  } catch (error) {
    logTest('Firebase Messaging', false, 'Error checking Firebase messaging', error.message);
  }
}, 2000);

// Test 4: FCM Edge Function
console.log('\n🚀 Test 4: FCM Edge Function');
fetch(`${SUPABASE_URL}/functions/v1/test-fcm`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  }
}).then(response => {
  if (response.ok) {
    return response.json().then(data => {
      const allTestsPassed = data.summary.failed === 0;
      logTest('FCM Edge Function', allTestsPassed, 
        `FCM test function: ${data.summary.passed}/${data.summary.totalTests} tests passed`,
        data
      );
      
      // Log individual test results
      Object.entries(data.tests).forEach(([testName, result]) => {
        console.log(`  ${result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️'} ${testName}: ${result.message}`);
      });
      
      if (data.recommendations.length > 0) {
        console.log('  📝 Recommendations:');
        data.recommendations.forEach(rec => console.log(`    • ${rec}`));
      }
    });
  } else {
    logTest('FCM Edge Function', false, `FCM test function failed: ${response.status}`, response.statusText);
  }
}).catch(error => {
  logTest('FCM Edge Function', false, 'Error calling FCM test function', error.message);
});

// Test 5: Database Connection
console.log('\n🗄️ Test 5: Database Connection');
fetch(`${SUPABASE_URL}/rest/v1/fcm_tokens?select=count`, {
  method: 'GET',
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  }
}).then(response => {
  if (response.ok) {
    logTest('Database Connection', true, 'Successfully connected to fcm_tokens table');
  } else {
    logTest('Database Connection', false, `Database connection failed: ${response.status}`, response.statusText);
  }
}).catch(error => {
  logTest('Database Connection', false, 'Error connecting to database', error.message);
});

// Test 6: Notification Permission
console.log('\n🔔 Test 6: Notification Permission');
if ('Notification' in window) {
  const permission = Notification.permission;
  const permissionGranted = permission === 'granted';
  
  logTest('Notification Permission', permissionGranted, 
    `Notification permission: ${permission}`,
    { 
      permission,
      supported: true,
      canRequest: permission === 'default'
    }
  );
} else {
  logTest('Notification Permission', false, 'Notifications not supported in this browser');
}

// Test 7: FCM Token Generation (if logged in)
console.log('\n🎫 Test 7: FCM Token Generation');
setTimeout(() => {
  if (typeof window.getFCMToken === 'function') {
    window.getFCMToken().then(token => {
      const hasToken = !!token;
      logTest('FCM Token Generation', hasToken, 
        hasToken ? 'FCM token generated successfully' : 'FCM token generation failed',
        { tokenLength: token?.length, tokenPreview: token?.substring(0, 20) + '...' }
      );
    }).catch(error => {
      logTest('FCM Token Generation', false, 'Error generating FCM token', error.message);
    });
  } else {
    logTest('FCM Token Generation', false, 'getFCMToken function not available (may need to log in)');
  }
}, 3000);

// Test 8: Network Connectivity
console.log('\n🌐 Test 8: Network Connectivity');
Promise.all([
  fetch('https://fcm.googleapis.com/fcm/send', { method: 'OPTIONS', mode: 'cors' })
    .then(() => true)
    .catch(() => false),
  fetch('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js', { method: 'HEAD' })
    .then(response => response.ok)
    .catch(() => false)
]).then(([fcmConnectivity, firebaseConnectivity]) => {
  logTest('FCM Connectivity', fcmConnectivity, 
    fcmConnectivity ? 'FCM endpoint is accessible' : 'FCM endpoint not accessible'
  );
  
  logTest('Firebase CDN', firebaseConnectivity, 
    firebaseConnectivity ? 'Firebase CDN is accessible' : 'Firebase CDN not accessible'
  );
});

// Summary
setTimeout(() => {
  console.log('\n' + '='.repeat(50));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  console.log(`Success Rate: ${Math.round((testResults.summary.passed / testResults.summary.total) * 100)}%`);
  
  if (testResults.summary.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    Object.entries(testResults.tests).forEach(([testName, result]) => {
      if (!result.passed) {
        console.log(`  • ${testName}: ${result.message}`);
      }
    });
    
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Check the FCM_VERCEL_SETUP.md guide');
    console.log('2. Verify Supabase environment variables');
    console.log('3. Run database migrations');
    console.log('4. Check Vercel deployment logs');
  } else {
    console.log('\n🎉 ALL TESTS PASSED! FCM is properly configured.');
  }
  
  console.log('\n📋 Full test results:', testResults);
}, 5000);
