const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Enhanced logging with timestamps
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

// Log build environment info
log('=== Enhanced Build Environment Info ===');
log(`Node version: ${process.version}`);
log(`PWD: ${process.cwd()}`);
log(`VERCEL: ${process.env.VERCEL || 'Not set'}`);
log(`VERCEL_ENV: ${process.env.VERCEL_ENV || 'Not set'}`);
log(`NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);

// Check if we're in Vercel environment
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const isProduction = process.env.VERCEL_ENV === 'production';

log(`Is Vercel environment: ${isVercel}`);
log(`Is production deployment: ${isProduction}`);

// Environment variable validation
log('=== Environment Variable Validation ===');

const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

let envVarsValid = true;

requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    log(`${envVar}: ✅ Present`, 'success');
    // Log first 30 characters for debugging
    log(`${envVar} preview: ${process.env[envVar].substring(0, 30)}...`);
  } else {
    log(`${envVar}: ❌ Missing`, 'error');
    envVarsValid = false;
  }
});

// Set console logging for debugging
if (isVercel) {
  process.env.ENABLE_CONSOLE_LOGS = 'true';
  log('Enabled console logs for Vercel deployment debugging', 'success');
}

// Handle environment file setup
log('=== Environment File Setup ===');

try {
  if (isVercel) {
    // In Vercel, rely on environment variables from dashboard
    if (!envVarsValid) {
      log('Missing required environment variables in Vercel!', 'error');
      log('Please set the following in your Vercel project settings:');
      requiredEnvVars.forEach(envVar => {
        if (!process.env[envVar]) {
          log(`- ${envVar}`, 'error');
        }
      });
      
      // Don't fail the build, but warn
      log('Continuing build with missing environment variables...', 'warn');
    }
  } else {
    // Local build - handle .env files
    if (fs.existsSync('.env.production')) {
      const envProdContent = fs.readFileSync('.env.production', 'utf8');
      fs.writeFileSync('.env', envProdContent);
      log('Copied .env.production to .env for local build', 'success');
    } else if (fs.existsSync('.env')) {
      log('Using existing .env file', 'success');
    } else {
      log('No .env file found, using environment variables only', 'warn');
    }
  }
} catch (error) {
  log(`Error handling environment setup: ${error.message}`, 'error');
}

// Install dependencies
log('=== Dependency Installation ===');
try {
  log('Installing dependencies...');
  execSync('npm ci --prefer-offline --no-audit', { stdio: 'inherit' });
  log('Dependencies installed successfully', 'success');
} catch (error) {
  log(`Dependency installation failed: ${error.message}`, 'error');
  // Try regular install as fallback
  try {
    log('Trying fallback npm install...');
    execSync('npm install', { stdio: 'inherit' });
    log('Fallback install successful', 'success');
  } catch (fallbackError) {
    log(`Fallback install also failed: ${fallbackError.message}`, 'error');
    process.exit(1);
  }
}

// Build the application
log('=== Application Build ===');
try {
  log('Starting Vite build...');
  
  // Set build environment variables
  const buildEnv = {
    ...process.env,
    NODE_ENV: 'production',
    VITE_BUILD_TIME: new Date().toISOString(),
    VITE_BUILD_VERSION: require('./package.json').version || '1.0.0'
  };
  
  execSync('npm run build', { 
    stdio: 'inherit',
    env: buildEnv
  });
  
  log('Vite build completed successfully', 'success');
} catch (error) {
  log(`Build failed: ${error.message}`, 'error');
  
  // Try to get more detailed error information
  try {
    log('Attempting to get detailed build information...');
    execSync('npm run build -- --debug', { stdio: 'inherit' });
  } catch (detailedError) {
    log(`Detailed build also failed: ${detailedError.message}`, 'error');
  }
  
  process.exit(1);
}

// Post-build validation
log('=== Post-Build Validation ===');

try {
  // Check if dist directory exists
  if (!fs.existsSync('dist')) {
    log('dist directory not found!', 'error');
    process.exit(1);
  }
  
  // Check for essential files
  const essentialFiles = ['index.html', 'assets'];
  essentialFiles.forEach(file => {
    const filePath = path.join('dist', file);
    if (fs.existsSync(filePath)) {
      log(`${file}: ✅ Present`, 'success');
      
      if (file === 'index.html') {
        const stats = fs.statSync(filePath);
        log(`index.html size: ${stats.size} bytes`);
        
        // Check if index.html contains the app div
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('<div id="root">')) {
          log('index.html contains root div', 'success');
        } else {
          log('index.html missing root div!', 'error');
        }
      }
    } else {
      log(`${file}: ❌ Missing`, 'error');
    }
  });
  
  // Create 200.html for SPA routing
  const indexPath = path.join('dist', 'index.html');
  const spa200Path = path.join('dist', '200.html');
  
  if (fs.existsSync(indexPath)) {
    fs.copyFileSync(indexPath, spa200Path);
    log('Created 200.html for SPA routing', 'success');
  }
  
  // Copy headers file if it exists
  if (fs.existsSync('_headers')) {
    fs.copyFileSync('_headers', path.join('dist', '_headers'));
    log('Copied _headers file to dist', 'success');
  }
  
  // List all files in dist for debugging
  const distFiles = fs.readdirSync('dist');
  log(`Dist directory contents (${distFiles.length} items):`);
  distFiles.forEach(file => {
    const filePath = path.join('dist', file);
    const stats = fs.statSync(filePath);
    const size = stats.isDirectory() ? 'DIR' : `${stats.size} bytes`;
    log(`  - ${file} (${size})`);
  });
  
} catch (error) {
  log(`Post-build validation failed: ${error.message}`, 'error');
  process.exit(1);
}

// Final success message
log('=== Build Completed Successfully ===', 'success');
log(`Build completed at: ${new Date().toISOString()}`);
log('Ready for deployment!', 'success');
