import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom', 'wouter'],
          
          // UI Component libraries  
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-form',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-toast',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-switch',
            '@radix-ui/react-slot'
          ],
          
          // Form and validation libraries
          'forms': [
            'react-hook-form',
            '@hookform/resolvers',
            'zod'
          ],
          
          // Firebase and auth
          'firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage'
          ],
          
          // Date and utility libraries
          'utils': [
            'date-fns',
            'clsx',
            'tailwind-merge',
            'class-variance-authority'
          ],
          
          // Query and state management
          'query': [
            '@tanstack/react-query',
            '@tanstack/react-table'
          ],
          
          // Calendar and scheduling
          'calendar': [
            '@fullcalendar/core',
            '@fullcalendar/react',
            '@fullcalendar/daygrid',
            '@fullcalendar/timegrid',
            '@fullcalendar/interaction'
          ],
          
          // Chart and visualization
          'charts': [
            'recharts'
          ],
          
          // Icons and UI helpers
          'icons': [
            'lucide-react',
            '@heroicons/react'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 500
  }
})