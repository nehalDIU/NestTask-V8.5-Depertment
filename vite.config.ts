import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';
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
    react({
      // Improve build performance by reducing unnecessary operations
      babel: {
        babelrc: false,
        configFile: false,
        plugins: [],
      },
      // Enable fast refresh for development
      // @ts-ignore - fastRefresh is supported but TypeScript doesn't know about it
      fastRefresh: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico', 
        'robots.txt', 
        'icons/*.png',
        'manifest.json',
        'offline.html'
      ],
      manifest: false, // Use external manifest file for more control
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        sourcemap: false,
        // Use minimal runtime caching
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      }
    }),
    compression({
      algorithm: 'brotliCompress' as CompressionAlgorithm,
      ext: '.br',
      threshold: 1024, // Only compress files > 1kb
      deleteOriginFile: false,
    }),
    compression({
      algorithm: 'gzip' as CompressionAlgorithm,
      ext: '.gz',
      threshold: 1024, // Only compress files > 1kb
    }),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
    })
  ],
  build: {
    // Enable aggressive optimization
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for debugging on Vercel
        drop_debugger: true,
        pure_funcs: [], // Don't remove console logs for Vercel deployment
        passes: 2,
        ecma: 2020
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false,
        ecma: 2020
      }
    },
    cssMinify: true,
    target: 'es2020',
    reportCompressedSize: false, // Improves build speed
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': [
            'react', 
            'react-dom',
            'react-router-dom',
            'scheduler'
          ],
          'ui-components': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-toast',
            'framer-motion'
          ],
          'supabase': [
            '@supabase/supabase-js'
          ],
          'icons': [
            'lucide-react'
          ],
          'utils': [
            'date-fns'
          ]
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name || '';
          if (info.endsWith('.css')) {
            return 'assets/css/[name].[hash:8][extname]';
          }
          if (/\.(png|jpe?g|gif|svg|webp)$/.test(info)) {
            return 'assets/img/[name].[hash:8][extname]';
          }
          if (/\.(woff2?|ttf|otf|eot)$/.test(info)) {
            return 'assets/fonts/[name].[hash:8][extname]';
          }
          return 'assets/[name].[hash:8][extname]';
        },
        chunkFileNames: 'assets/js/[name].[hash:8].js',
        entryFileNames: 'assets/js/[name].[hash:8].js',
      }
    },
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 10240, // Inline assets < 10kb
    emptyOutDir: true,
    modulePreload: {
      polyfill: false // Reduces bundle size
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-dialog'
    ],
    esbuildOptions: {
      target: 'es2020',
      supported: { 
        'top-level-await': true 
      },
    }
  },
  // Improve dev server performance
  server: {
    hmr: {
      overlay: false // Improves dev performance
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