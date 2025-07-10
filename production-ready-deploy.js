/**
 * PRODUCTION DEPLOYMENT - EXACT MIRROR OF WORKING DEVELOPMENT
 * 
 * This deployment replicates the exact working setup from development
 * environment where billing functionality is confirmed working perfectly.
 */

import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer } from 'http';
import { fileURLToPath } from 'url';

// Import backend components exactly as working in development
import { initializeFirebaseAdmin } from './server/firebase.ts';
import { setupAuthenticationFirestore } from './server/auth-firestore.ts';
import { registerRoutes } from './server/routes.ts';
import { logger } from './server/utils/logger.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting Production Deployment (Port 5000)...');
console.log('📋 Mirroring exact working development configuration...');

// Set production environment
process.env.NODE_ENV = 'production';

// Express middleware - exact same as working development
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', 1);

// CORS configuration for production deployment
app.use(cors({
  origin: true, // Allow all origins for deployment
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    timestamp: new Date().toISOString(),
    query: req.query
  });
  next();
});

async function startProductionServer() {
  try {
    console.log('🔧 Initializing Firebase Admin (Production Mode)...');
    const firebaseApp = await initializeFirebaseAdmin();
    if (!firebaseApp) {
      throw new Error('Failed to initialize Firebase Admin');
    }
    console.log('✅ Firebase Admin initialized successfully');

    console.log('🔐 Setting up authentication middleware...');
    await setupAuthenticationFirestore(app);
    console.log('✅ Authentication setup completed');

    console.log('🛠️ Registering all API routes...');
    await registerRoutes(app);
    console.log('✅ All API routes registered (including billing)');

    // Serve the client from development build (since it's working perfectly)
    const clientPath = path.join(__dirname, 'client');
    console.log('📁 Setting up client serving from:', clientPath);

    // Import and use Vite middleware in production mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: clientPath,
      configFile: path.join(clientPath, 'vite.config.ts')
    });

    // Use Vite middleware to serve the client
    app.use(vite.ssrFixStacktrace);
    app.use('/', vite.middlewares);

    // Fallback for SPA routing (must be last)
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ 
          error: 'API endpoint not found',
          path: req.path 
        });
      }
      next();
    });

    // Create HTTP server
    const server = createServer(app);

    // Start server on port 5000 (same as working deployment)
    server.listen(PORT, '0.0.0.0', () => {
      console.log('🎉 Production Server Ready!');
      console.log(`📡 Server running on port: ${PORT}`);
      console.log(`🌐 Frontend: Vite development server (production mode)`);
      console.log(`⚡ API: All billing endpoints available at /api/*`);
      console.log(`🔗 Access at: http://localhost:${PORT}`);
      console.log('✨ Exact mirror of working development environment');
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('❌ Production server startup failed:', error);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start the production server
startProductionServer().catch(error => {
  console.error('❌ Fatal error starting production server:', error);
  process.exit(1);
});