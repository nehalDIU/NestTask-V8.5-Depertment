#!/usr/bin/env node

// Test script for production deployment
const https = require('https');
const http = require('http');

const PRODUCTION_URL = 'https://nesttask.vercel.app';
const PREVIEW_URL = 'https://nesttask-git-main-username.vercel.app'; // Replace with actual preview URL

console.log('🧪 Testing NestTask Production vs Preview Deployment\n');

function testUrl(url, label) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    console.log(`Testing ${label}: ${url}`);
    
    const req = protocol.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const result = {
          url,
          label,
          statusCode: res.statusCode,
          headers: res.headers,
          hasLandingPage: data.includes('NestTask') && data.includes('Academic Task Management'),
          hasReact: data.includes('root'),
          hasMetaTags: data.includes('og:title'),
          contentLength: data.length,
          cacheControl: res.headers['cache-control'],
          lastModified: res.headers['last-modified'],
          etag: res.headers['etag']
        };
        
        console.log(`✅ ${label} Response:`, {
          status: result.statusCode,
          hasLandingPage: result.hasLandingPage,
          hasReact: result.hasReact,
          hasMetaTags: result.hasMetaTags,
          contentLength: result.contentLength,
          cacheControl: result.cacheControl
        });
        
        resolve(result);
      });
    });
    
    req.on('error', (err) => {
      console.error(`❌ ${label} Error:`, err.message);
      resolve({
        url,
        label,
        error: err.message
      });
    });
    
    req.setTimeout(10000, () => {
      console.error(`❌ ${label} Timeout`);
      req.destroy();
      resolve({
        url,
        label,
        error: 'Timeout'
      });
    });
  });
}

async function runTests() {
  console.log('Starting deployment tests...\n');
  
  // Test production URL
  const productionResult = await testUrl(PRODUCTION_URL, 'Production');
  
  // Test preview URL (if available)
  // const previewResult = await testUrl(PREVIEW_URL, 'Preview');
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  if (productionResult.error) {
    console.log('❌ Production: FAILED -', productionResult.error);
  } else {
    console.log('✅ Production: SUCCESS');
    console.log(`   Status: ${productionResult.statusCode}`);
    console.log(`   Landing Page: ${productionResult.hasLandingPage ? '✅' : '❌'}`);
    console.log(`   React App: ${productionResult.hasReact ? '✅' : '❌'}`);
    console.log(`   Meta Tags: ${productionResult.hasMetaTags ? '✅' : '❌'}`);
    console.log(`   Content Size: ${productionResult.contentLength} bytes`);
    console.log(`   Cache Control: ${productionResult.cacheControl || 'None'}`);
  }
  
  console.log('\n🔧 Recommendations:');
  console.log('===================');
  
  if (productionResult.error) {
    console.log('1. Check Vercel deployment status');
    console.log('2. Verify domain configuration');
    console.log('3. Check DNS settings');
  } else if (!productionResult.hasLandingPage) {
    console.log('1. Clear Vercel cache');
    console.log('2. Force redeploy');
    console.log('3. Check environment variables');
  } else if (productionResult.statusCode !== 200) {
    console.log('1. Check server configuration');
    console.log('2. Review Vercel logs');
    console.log('3. Verify build process');
  } else {
    console.log('✅ Production deployment appears to be working correctly!');
  }
  
  console.log('\n🌐 Manual Testing URLs:');
  console.log('=======================');
  console.log(`Production: ${PRODUCTION_URL}`);
  console.log(`With Landing: ${PRODUCTION_URL}/?landing=true`);
  console.log(`Cache Bust: ${PRODUCTION_URL}/?cache=${Date.now()}`);
  console.log(`Combined: ${PRODUCTION_URL}/?landing=true&cache=${Date.now()}`);
}

// Run the tests
runTests().catch(console.error);
