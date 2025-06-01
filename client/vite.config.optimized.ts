import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-form', '@radix-ui/react-toast'],
          charts: ['recharts'],
          calendar: ['@fullcalendar/core', '@fullcalendar/react'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          icons: ['lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 800
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
})