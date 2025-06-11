#!/usr/bin/env node

// Test build script to verify the fixes work locally
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing NestTask Build Process');
console.log('================================');

// Set environment variables for testing
process.env.NODE_ENV = 'production';
process.env.ENABLE_CONSOLE_LOGS = 'true';

try {
  // Clean previous build
  console.log('🧹 Cleaning previous build...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
    console.log('✅ Cleaned dist directory');
  }

  // Run the improved build script
  console.log('🔨 Running improved build script...');
  execSync('node vercel-build-improved.cjs', { stdio: 'inherit' });

  // Verify build output
  console.log('🔍 Verifying build output...');
  
  const distExists = fs.existsSync('dist');
  const indexExists = fs.existsSync('dist/index.html');
  const spa200Exists = fs.existsSync('dist/200.html');
  const assetsExists = fs.existsSync('dist/assets');

  console.log(`dist directory: ${distExists ? '✅' : '❌'}`);
  console.log(`index.html: ${indexExists ? '✅' : '❌'}`);
  console.log(`200.html (SPA): ${spa200Exists ? '✅' : '❌'}`);
  console.log(`assets directory: ${assetsExists ? '✅' : '❌'}`);

  if (indexExists) {
    const indexContent = fs.readFileSync('dist/index.html', 'utf8');
    const hasRootDiv = indexContent.includes('<div id="root">');
    const hasAssets = indexContent.includes('/assets/');
    
    console.log(`index.html has root div: ${hasRootDiv ? '✅' : '❌'}`);
    console.log(`index.html has assets: ${hasAssets ? '✅' : '❌'}`);
  }

  console.log('');
  console.log('🎉 Build test completed successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Set environment variables in Vercel dashboard');
  console.log('2. Deploy to Vercel');
  console.log('3. Test with Ctrl+Shift+D for diagnostics');

} catch (error) {
  console.error('❌ Build test failed:', error.message);
  process.exit(1);
}
