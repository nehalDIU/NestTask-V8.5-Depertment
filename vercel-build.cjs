const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Log build environment info
console.log('== Build Environment Info (CJS) ==');
console.log(`Node version: ${process.version}`);
console.log(`PWD: ${process.cwd()}`);
console.log(`VERCEL: ${process.env.VERCEL || 'Not set'}`);
console.log('== Environment Variables ==');
console.log(`VITE_SUPABASE_URL set: ${process.env.VITE_SUPABASE_URL ? 'Yes' : 'No'}`);
console.log(`VITE_SUPABASE_ANON_KEY set: ${process.env.VITE_SUPABASE_ANON_KEY ? 'Yes' : 'No'}`);

// Copy production env file
try {
  if (fs.existsSync('.env.production')) {
    const envProdContent = fs.readFileSync('.env.production', 'utf8');
    fs.writeFileSync('.env', envProdContent);
    console.log('Successfully copied .env.production to .env');
  } else {
    console.warn('.env.production file not found');
    
    // Create .env file with hardcoded values as fallback
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
      console.log('Creating fallback .env file with hardcoded values');
      const fallbackEnv = 
`VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzbXV4bnNmemtmZnptaGJtdHRzIiwicm9sZSI6ImFub24iLCJpYVQiOjE3NDg3MDE0ODMsImV4cCI6MjA2NDI3NzQ4M30.0y17sSd6pDwJzj4VXqJiclAQeI3V_dtFihbtF-jlcTI
VITE_SUPABASE_URL=https://hsmuxnsfzkffzmhbmtts.supabase.co`;
      fs.writeFileSync('.env', fallbackEnv);
      console.log('Fallback .env file created');
    }
  }
} catch (error) {
  console.error('Error handling environment files:', error);
}

// Run build
try {
  console.log('Starting build process...');
  
  // First, ensure all dependencies are installed, especially @radix-ui/react-dropdown-menu
  console.log('Ensuring all dependencies are installed...');
  try {
    execSync('npm install @radix-ui/react-dropdown-menu@^2.0.6 --no-save', { stdio: 'inherit' });
    console.log('Successfully installed required dependencies');
  } catch (depError) {
    console.error('Error installing dependencies:', depError);
    // Continue with build anyway
  }
  
  execSync('npm run build', { stdio: 'inherit' });
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}

// Copy _headers file to dist if it exists
if (fs.existsSync('_headers')) {
  try {
    fs.copyFileSync('_headers', path.join('dist', '_headers'));
    console.log('Successfully copied _headers to dist directory');
  } catch (error) {
    console.error('Error copying _headers file:', error);
  }
}

// Create 200.html from index.html for SPA routing
try {
  if (fs.existsSync(path.join('dist', 'index.html'))) {
    fs.copyFileSync(
      path.join('dist', 'index.html'), 
      path.join('dist', '200.html')
    );
    console.log('Successfully created 200.html for SPA routing');
  } else {
    console.error('index.html not found, cannot create 200.html');
  }
} catch (error) {
  console.error('Error creating 200.html:', error);
}

// Check dist directory
try {
  const distFiles = fs.readdirSync('dist');
  console.log('== Dist Directory Contents ==');
  console.log(distFiles);
  
  // Check if index.html exists
  if (distFiles.includes('index.html')) {
    console.log('index.html found in dist directory');
    const indexContent = fs.readFileSync(path.join('dist', 'index.html'), 'utf8');
    console.log(`index.html size: ${indexContent.length} bytes`);
  } else {
    console.error('index.html NOT FOUND in dist directory!');
  }
} catch (error) {
  console.error('Error checking dist directory:', error);
} 