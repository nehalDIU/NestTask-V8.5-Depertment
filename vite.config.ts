import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';
// PWA plugin removed
import path from 'path';

// Define algorithm type to avoid type errors
type CompressionAlgorithm = 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    // Add aliases for better import paths
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Force consistent extensions and improve module resolution
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  plugins: [
    react(),
    // PWA and caching functionality removed
    compression({
      algorithm: 'brotliCompress' as CompressionAlgorithm,
      ext: '.br'
    }),
    compression({
      algorithm: 'gzip' as CompressionAlgorithm,
      ext: '.gz'
    }),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true
    })
  ],
  build: {
    // Enable minification and tree shaking
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    cssMinify: true,
    target: 'es2018',
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React dependencies
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') || 
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }
          
          // Date handling
          if (id.includes('node_modules/date-fns/')) {
            return 'date-utils';
          }
          
          // UI component libraries
          if (id.includes('node_modules/@radix-ui/') || 
              id.includes('node_modules/framer-motion/')) {
            return 'ui-components';
          }
          
          // Supabase
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase';
          }
          
          // Icons
          if (id.includes('node_modules/lucide-react/')) {
            return 'icons';
          }
          
          // Charts
          if (id.includes('node_modules/recharts/') || 
              id.includes('node_modules/d3/')) {
            return 'charts';
          }
        },
        // Ensure proper file types and names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name || '';
          if (info.endsWith('.css')) {
            return 'assets/css/[name].[hash][extname]';
          }
          if (info.endsWith('.png') || info.endsWith('.jpg') || 
              info.endsWith('.jpeg') || info.endsWith('.svg') || 
              info.endsWith('.gif')) {
            return 'assets/images/[name].[hash][extname]';
          }
          if (info.endsWith('.woff') || info.endsWith('.woff2') || 
              info.endsWith('.ttf') || info.endsWith('.otf') || 
              info.endsWith('.eot')) {
            return 'assets/fonts/[name].[hash][extname]';
          }
          return 'assets/[name].[hash][extname]';
        },
        // Optimize chunk names
        chunkFileNames: 'assets/js/[name].[hash].js',
        entryFileNames: 'assets/js/[name].[hash].js',
      }
    },
    // Enable source map optimization
    sourcemap: process.env.NODE_ENV !== 'production',
    // Enable chunk size optimization
    chunkSizeWarningLimit: 1000,
    // Add asset optimization
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    modulePreload: true
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'date-fns',
      '@radix-ui/react-dialog',
      'framer-motion',
      'react-router-dom',
      'recharts'
    ],
    // Don't exclude Vercel Analytics as it causes 404 errors in dev mode
    // exclude: ['@vercel/analytics']
  },
  // Improve dev server performance
  server: {
    hmr: {
      overlay: false
    },
    watch: {
      usePolling: false
    },
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Embedder-Policy": "credentialless",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "cross-origin"
    }
  },
  // Improve preview server performance
  preview: {
    port: 4173,
    strictPort: true,
  },
  // Speed up first dev startup by caching
  cacheDir: 'node_modules/.vite'
});