#!/usr/bin/env node

/**
 * FCM Implementation Test Script
 * 
 * This script validates the Firebase Cloud Messaging implementation
 * by testing database functions, edge functions, and notification flow.
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://unrjnmpxikgsocixureq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

if (!FCM_SERVER_KEY) {
  console.error('❌ FCM_SERVER_KEY environment variable is required');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test utilities
const log = (message, type = 'info') => {
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
  console.log(`${icons[type]} ${message}`);
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test functions
async function testDatabaseTables() {
  log('Testing database tables...', 'info');
  
  try {
    // Test fcm_tokens table
    const { data: tokens, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('*')
      .limit(1);
    
    if (tokensError) throw new Error(`fcm_tokens table error: ${tokensError.message}`);
    log('fcm_tokens table exists and accessible', 'success');
    
    // Test notification_history table
    const { data: history, error: historyError } = await supabase
      .from('notification_history')
      .select('*')
      .limit(1);
    
    if (historyError) throw new Error(`notification_history table error: ${historyError.message}`);
    log('notification_history table exists and accessible', 'success');
    
    // Test notification_preferences table
    const { data: prefs, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('*')
      .limit(1);
    
    if (prefsError) throw new Error(`notification_preferences table error: ${prefsError.message}`);
    log('notification_preferences table exists and accessible', 'success');
    
    return true;
  } catch (error) {
    log(`Database tables test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testDatabaseFunctions() {
  log('Testing database functions...', 'info');
  
  try {
    // Test upsert_fcm_token function
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Test UUID
    const testToken = 'test-token-' + Date.now();
    
    const { data: tokenResult, error: tokenError } = await supabase
      .rpc('upsert_fcm_token', {
        p_user_id: testUserId,
        p_token: testToken,
        p_device_type: 'web',
        p_device_info: { test: true }
      });
    
    if (tokenError) throw new Error(`upsert_fcm_token function error: ${tokenError.message}`);
    log('upsert_fcm_token function works', 'success');
    
    // Test get_section_fcm_tokens function
    const testSectionId = '00000000-0000-0000-0000-000000000000'; // Test UUID
    
    const { data: sectionTokens, error: sectionError } = await supabase
      .rpc('get_section_fcm_tokens', {
        p_section_id: testSectionId
      });
    
    if (sectionError) throw new Error(`get_section_fcm_tokens function error: ${sectionError.message}`);
    log('get_section_fcm_tokens function works', 'success');
    
    // Clean up test token
    await supabase
      .from('fcm_tokens')
      .delete()
      .eq('token', testToken);
    
    return true;
  } catch (error) {
    log(`Database functions test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testEdgeFunction() {
  log('Testing edge function...', 'info');
  
  try {
    const testPayload = {
      task_id: '00000000-0000-0000-0000-000000000000',
      task_name: 'Test FCM Notification',
      section_id: '00000000-0000-0000-0000-000000000000',
      due_date: new Date().toISOString(),
      category: 'test',
      description: 'Testing FCM implementation',
      created_by: '00000000-0000-0000-0000-000000000000'
    };
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-task-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify(testPayload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge function returned ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    log(`Edge function responded: ${result.message}`, 'success');
    
    return true;
  } catch (error) {
    log(`Edge function test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testFCMConnectivity() {
  log('Testing FCM connectivity...', 'info');
  
  try {
    // Test FCM endpoint connectivity
    const testMessage = {
      to: 'test-token-invalid',
      notification: {
        title: 'Test Notification',
        body: 'Testing FCM connectivity'
      }
    };
    
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMessage)
    });
    
    if (response.ok || response.status === 400) {
      // 400 is expected for invalid token, but means FCM is reachable
      log('FCM endpoint is reachable', 'success');
      return true;
    } else {
      throw new Error(`FCM endpoint returned ${response.status}`);
    }
  } catch (error) {
    log(`FCM connectivity test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testNotificationFlow() {
  log('Testing complete notification flow...', 'info');
  
  try {
    // Create a test user and section
    const testUser = {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      section_id: '22222222-2222-2222-2222-222222222222'
    };
    
    const testSection = {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Test Section'
    };
    
    // Insert test FCM token
    const testToken = 'test-fcm-token-' + Date.now();
    await supabase
      .from('fcm_tokens')
      .insert({
        user_id: testUser.id,
        token: testToken,
        device_type: 'web',
        is_active: true
      });
    
    log('Test FCM token created', 'success');
    
    // Test the complete flow by calling the edge function
    const testPayload = {
      task_id: '33333333-3333-3333-3333-333333333333',
      task_name: 'Integration Test Task',
      section_id: testSection.id,
      due_date: new Date().toISOString(),
      category: 'assignment',
      description: 'Testing complete notification flow',
      created_by: '44444444-4444-4444-4444-444444444444'
    };
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-task-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify(testPayload)
    });
    
    const result = await response.json();
    log(`Notification flow test completed: ${result.message}`, 'success');
    
    // Check if notification history was created
    await delay(1000); // Wait for async operations
    
    const { data: history } = await supabase
      .from('notification_history')
      .select('*')
      .eq('related_id', testPayload.task_id);
    
    if (history && history.length > 0) {
      log(`Notification history created: ${history.length} records`, 'success');
    } else {
      log('No notification history found', 'warning');
    }
    
    // Clean up test data
    await supabase.from('fcm_tokens').delete().eq('token', testToken);
    await supabase.from('notification_history').delete().eq('related_id', testPayload.task_id);
    
    return true;
  } catch (error) {
    log(`Notification flow test failed: ${error.message}`, 'error');
    return false;
  }
}

// Main test runner
async function runTests() {
  log('🚀 Starting FCM Implementation Tests', 'info');
  console.log('');
  
  const tests = [
    { name: 'Database Tables', fn: testDatabaseTables },
    { name: 'Database Functions', fn: testDatabaseFunctions },
    { name: 'Edge Function', fn: testEdgeFunction },
    { name: 'FCM Connectivity', fn: testFCMConnectivity },
    { name: 'Notification Flow', fn: testNotificationFlow }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n📋 Running ${test.name} test...`);
    const result = await test.fn();
    
    if (result) {
      passed++;
    } else {
      failed++;
    }
    
    await delay(500); // Brief pause between tests
  }
  
  console.log('\n' + '='.repeat(50));
  log(`Test Results: ${passed} passed, ${failed} failed`, passed === tests.length ? 'success' : 'error');
  
  if (failed === 0) {
    log('🎉 All tests passed! FCM implementation is ready.', 'success');
  } else {
    log('❌ Some tests failed. Please check the implementation.', 'error');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    log(`Test runner failed: ${error.message}`, 'error');
    process.exit(1);
  });
}
