#!/usr/bin/env node

/**
 * Deployment Verification Script for NestTask Landing Page
 * This script helps verify if the landing page is properly deployed on Vercel
 */

const https = require('https');
const fs = require('fs');

// Configuration
const DOMAIN = 'nesttask.vercel.app'; // Replace with your actual domain
const TIMEOUT = 10000; // 10 seconds

console.log('🚀 NestTask Deployment Verification');
console.log('=====================================');

// Test URLs
const testUrls = [
  { path: '/', description: 'Landing Page' },
  { path: '/?auth=true', description: 'Auth Page Direct' },
  { path: '/manifest.json', description: 'PWA Manifest' },
  { path: '/icons/icon-192x192.png', description: 'PWA Icon' }
];

async function checkUrl(url, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: DOMAIN,
      path: url,
      method: 'GET',
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'NestTask-Deployment-Checker/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const result = {
          url: `https://${DOMAIN}${url}`,
          description,
          status: res.statusCode,
          headers: res.headers,
          contentLength: data.length,
          hasLandingPageContent: data.includes('NestTask') && data.includes('Academic'),
          hasReactApp: data.includes('id="root"'),
          hasMetaTags: data.includes('og:title'),
          success: res.statusCode === 200
        };
        resolve(result);
      });
    });

    req.on('error', (error) => {
      resolve({
        url: `https://${DOMAIN}${url}`,
        description,
        error: error.message,
        success: false
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        url: `https://${DOMAIN}${url}`,
        description,
        error: 'Request timeout',
        success: false
      });
    });

    req.end();
  });
}

async function verifyDeployment() {
  console.log(`🌐 Testing domain: https://${DOMAIN}`);
  console.log('');

  const results = [];

  for (const test of testUrls) {
    process.stdout.write(`⏳ Testing ${test.description}... `);
    const result = await checkUrl(test.path, test.description);
    results.push(result);

    if (result.success) {
      console.log('✅ OK');
    } else {
      console.log('❌ FAILED');
    }
  }

  console.log('\n📊 Detailed Results:');
  console.log('====================');

  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.description}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Status: ${result.status || 'ERROR'}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    } else {
      console.log(`   Content Length: ${result.contentLength} bytes`);
      if (result.description === 'Landing Page') {
        console.log(`   Has Landing Content: ${result.hasLandingPageContent ? '✅' : '❌'}`);
        console.log(`   Has React App: ${result.hasReactApp ? '✅' : '❌'}`);
        console.log(`   Has Meta Tags: ${result.hasMetaTags ? '✅' : '❌'}`);
      }
    }
  });

  // Overall assessment
  const landingPageResult = results.find(r => r.description === 'Landing Page');
  
  console.log('\n🎯 Assessment:');
  console.log('===============');

  if (landingPageResult && landingPageResult.success) {
    if (landingPageResult.hasLandingPageContent && landingPageResult.hasReactApp) {
      console.log('✅ Landing page is properly deployed and working!');
      console.log('✅ React app is loading correctly');
      console.log('✅ Landing page content is present');
    } else if (landingPageResult.hasReactApp) {
      console.log('⚠️  React app is loading but landing page content might not be showing');
      console.log('   This could be a state management or routing issue');
    } else {
      console.log('❌ React app is not loading properly');
      console.log('   Check for JavaScript errors or build issues');
    }
  } else {
    console.log('❌ Landing page is not accessible');
    console.log('   Check domain configuration and deployment status');
  }

  console.log('\n🔧 Troubleshooting Tips:');
  console.log('========================');
  console.log('1. Check Vercel deployment logs for errors');
  console.log('2. Verify environment variables are set correctly');
  console.log('3. Test the landing page in incognito mode');
  console.log('4. Clear browser cache and cookies');
  console.log('5. Check browser console for JavaScript errors');

  console.log('\n📱 Manual Testing:');
  console.log('==================');
  console.log(`1. Visit: https://${DOMAIN}/`);
  console.log(`2. Check: Dark theme landing page loads`);
  console.log(`3. Test: "Get Started" and "Sign In" buttons work`);
  console.log(`4. Verify: Smooth animations and responsive design`);

  return results;
}

// Run the verification
if (require.main === module) {
  verifyDeployment().catch(console.error);
}

module.exports = { verifyDeployment, checkUrl };
