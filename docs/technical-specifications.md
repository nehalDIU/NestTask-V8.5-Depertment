# Technical Specifications Guide

## Overview

This document provides comprehensive technical specifications for the NestTask project, including file structure, configuration files, environment variables, build processes, deployment procedures, and testing strategies.

## Project File Structure

```
NestTask-V8.5-Department/
├── docs/                           # Documentation files
│   ├── README.md                   # Project overview
│   ├── frontend-architecture.md   # Frontend documentation
│   ├── backend-architecture.md    # Backend documentation
│   ├── database-schema.md         # Database documentation
│   ├── core-features.md           # Features documentation
│   └── technical-specifications.md # This file
├── public/                         # Static assets
│   ├── icons/                     # PWA icons
│   │   ├── icon-192x192.png
│   │   ├── icon-512x512.png
│   │   └── maskable-icon.png
│   ├── manifest.json              # PWA manifest
│   ├── offline.html               # Offline fallback page
│   ├── service-worker.js          # Service worker
│   └── _headers                   # Netlify headers
├── src/                           # Source code
│   ├── components/                # React components
│   │   ├── admin/                # Admin components
│   │   ├── auth/                 # Authentication components
│   │   ├── calendar/             # Calendar components
│   │   ├── navigation/           # Navigation components
│   │   ├── profile/              # Profile components
│   │   ├── routine/              # Routine components
│   │   ├── search/               # Search components
│   │   ├── settings/             # Settings components
│   │   ├── study-materials/      # Study materials components
│   │   ├── task/                 # Task components
│   │   └── ui/                   # Base UI components
│   ├── hooks/                    # Custom React hooks
│   ├── pages/                    # Page components
│   ├── services/                 # API service layer
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility functions
│   ├── constants/                # Application constants
│   ├── lib/                      # Third-party configurations
│   ├── App.tsx                   # Root component
│   ├── main.tsx                  # Application entry point
│   ├── index.css                 # Global styles
│   └── vite-env.d.ts            # Vite type definitions
├── supabase/                     # Supabase configuration
│   ├── functions/                # Edge functions
│   └── migrations/               # Database migrations
├── package.json                  # Dependencies and scripts
├── package-lock.json            # Dependency lock file
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript configuration
├── tsconfig.app.json            # App-specific TypeScript config
├── tsconfig.node.json           # Node-specific TypeScript config
├── tailwind.config.js           # Tailwind CSS configuration
├── postcss.config.js            # PostCSS configuration
├── eslint.config.js             # ESLint configuration
├── vercel.json                  # Vercel deployment config
├── vercel-build.js              # Custom build script
└── .env.production              # Production environment variables
```

## Configuration Files

### 1. Vite Configuration (vite.config.ts)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
      manifest: {
        name: 'NestTask',
        short_name: 'NestTask',
        description: 'A modern task management application',
        theme_color: '#0284c7',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              networkTimeoutSeconds: 10
            }
          }
        ]
      }
    })
  ],
  build: {
    target: 'es2018',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-components': ['@radix-ui/react-dialog', 'framer-motion'],
          'supabase': ['@supabase/supabase-js']
        }
      }
    }
  }
});
```

### 2. TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/services/*": ["./src/services/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"]
    }
  },
  "include": ["src"],
  "references": [
    { "path": "./tsconfig.node.json" }
  ]
}
```

### 3. Tailwind CSS Configuration (tailwind.config.js)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#0284c7',
          600: '#0369a1',
          700: '#0c4a6e'
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        }
      }
    },
  },
  plugins: [],
  darkMode: 'class'
}
```

### 4. ESLint Configuration (eslint.config.js)

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn'
    },
  },
)
```

## Environment Variables

### Development Environment (.env.local)

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Application Configuration
VITE_APP_NAME=NestTask
VITE_APP_VERSION=8.5.0
VITE_APP_ENVIRONMENT=development

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_PWA=true
VITE_ENABLE_OFFLINE_MODE=true

# API Configuration
VITE_API_TIMEOUT=10000
VITE_MAX_FILE_SIZE=10485760  # 10MB

# Debug Configuration
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
```

### Production Environment (.env.production)

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://production-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=production-anon-key

# Application Configuration
VITE_APP_NAME=NestTask
VITE_APP_VERSION=8.5.0
VITE_APP_ENVIRONMENT=production

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PWA=true
VITE_ENABLE_OFFLINE_MODE=true

# Performance Configuration
VITE_API_TIMEOUT=5000
VITE_MAX_FILE_SIZE=5242880  # 5MB

# Security Configuration
VITE_ENABLE_CSP=true
VITE_SECURE_COOKIES=true
```

### Environment Variable Usage

```typescript
// src/lib/config.ts
export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || 'NestTask',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.VITE_APP_ENVIRONMENT || 'development'
  },
  features: {
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    pwa: import.meta.env.VITE_ENABLE_PWA === 'true',
    offlineMode: import.meta.env.VITE_ENABLE_OFFLINE_MODE === 'true'
  },
  api: {
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000'),
    maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '10485760')
  }
};
```

## Build Process

### Development Build

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Clean development cache and restart
npm run clean-dev
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Analyze bundle size
npm run analyze
```

### Build Scripts (package.json)

```json
{
  "scripts": {
    "dev": "vite",
    "clean-dev": "node -e \"if (require('fs').existsSync('node_modules/.vite')) require('fs').rmSync('node_modules/.vite', { recursive: true, force: true })\" && vite --force",
    "build": "tsc && vite build",
    "vercel-build": "node vercel-build.js",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "analyze": "vite build --mode analyze"
  }
}
```

### Custom Build Script (vercel-build.js)

```javascript
const { execSync } = require('child_process');
const fs = require('fs');

console.log('Starting custom Vercel build process...');

try {
  // Run TypeScript compilation
  console.log('Running TypeScript compilation...');
  execSync('npx tsc --noEmit', { stdio: 'inherit' });

  // Run Vite build
  console.log('Running Vite build...');
  execSync('npx vite build', { stdio: 'inherit' });

  // Verify build output
  if (fs.existsSync('dist/index.html')) {
    console.log('✅ Build completed successfully');
  } else {
    throw new Error('Build output not found');
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
```

## Deployment Configuration

### Vercel Configuration (vercel.json)

```json
{
  "buildCommand": "npm run vercel-build",
  "outputDirectory": "dist",
  "framework": "vite",
  "functions": {
    "app/api/**/*.js": {
      "runtime": "nodejs18.x"
    }
  },
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/service-worker.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### Netlify Configuration (_headers)

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin

/service-worker.js
  Cache-Control: public, max-age=0, must-revalidate

/static/*
  Cache-Control: public, max-age=31536000, immutable
```

## Testing Strategies

### Unit Testing Setup

```bash
# Install testing dependencies
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

### Test Configuration (vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  }
});
```

### Test Examples

```typescript
// src/components/__tests__/TaskList.test.tsx
import { render, screen } from '@testing-library/react';
import { TaskList } from '../TaskList';
import { mockTasks } from '../../test/mocks';

describe('TaskList', () => {
  it('renders task list correctly', () => {
    render(<TaskList tasks={mockTasks} loading={false} />);
    
    expect(screen.getByText('Assignment 1')).toBeInTheDocument();
    expect(screen.getByText('Quiz 1')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<TaskList tasks={[]} loading={true} />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
```

### E2E Testing with Playwright

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Run E2E tests
npx playwright test
```

```typescript
// tests/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can login successfully', async ({ page }) => {
  await page.goto('/auth');
  
  await page.fill('[data-testid="email-input"]', 'test@diu.edu.bd');
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.click('[data-testid="login-button"]');
  
  await expect(page).toHaveURL('/');
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
});
```

## Performance Optimization

### Bundle Analysis

```bash
# Generate bundle analysis
npm run analyze

# View bundle composition
npx vite-bundle-analyzer dist/stats.html
```

### Performance Monitoring

```typescript
// src/utils/performance.ts
export class PerformanceMonitor {
  static measurePageLoad() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    }
    return null;
  }

  static measureComponentRender(componentName: string, renderFn: () => void) {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    
    console.log(`${componentName} render time: ${end - start}ms`);
  }
}
```

### Code Splitting Strategy

```typescript
// Lazy loading implementation
const AdminDashboard = lazy(() => 
  import('./pages/AdminDashboard').then(module => ({ 
    default: module.AdminDashboard 
  }))
);

// Route-based code splitting
const router = createBrowserRouter([
  {
    path: "/admin",
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <AdminDashboard />
      </Suspense>
    )
  }
]);
```

## Security Considerations

### Content Security Policy

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
">
```

### Environment Variable Security

```typescript
// Validate required environment variables
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

requiredEnvVars.forEach(envVar => {
  if (!import.meta.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

---

*This technical specifications guide provides comprehensive information about the project structure, configuration, build processes, deployment, and testing strategies for the NestTask application.*
