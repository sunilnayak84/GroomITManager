/**
 * PRODUCTION SERVER - FULL STACK DEPLOYMENT
 * 
 * Serves built frontend and runs complete backend API
 * Configured for production environment on port 5000
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { createServer } from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting Production Server...');

// Set production environment
process.env.NODE_ENV = 'production';

// Basic Express middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', 1);

// CORS configuration for production
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Load and register the backend server components  
async function initializeBackend() {
  try {
    console.log('🔧 Loading backend modules...');
    
    // Dynamic imports to handle TypeScript modules
    const { initializeFirebaseAdmin } = await import('./server/firebase.ts');
    const { setupAuthenticationFirestore } = await import('./server/auth-firestore.ts');
    const { registerRoutes } = await import('./server/routes.ts');
    
    console.log('🔥 Initializing Firebase Admin...');
    const firebaseApp = await initializeFirebaseAdmin();
    if (!firebaseApp) {
      throw new Error('Failed to initialize Firebase Admin');
    }
    
    console.log('🔐 Setting up authentication...');
    await setupAuthenticationFirestore(app);
    
    console.log('🛠️ Registering API routes...');
    await registerRoutes(app);
    
    console.log('✅ Backend initialization complete');
    return true;
  } catch (error) {
    console.error('❌ Backend initialization failed:', error);
    return false;
  }
}

// Serve static files from client directory (development mode for now)
const clientPath = path.join(__dirname, 'client');
console.log('📁 Client path:', clientPath);

// Import Vite for development serving
async function setupFrontend() {
  try {
    const { createServer: createViteServer } = await import('vite');
    
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: clientPath,
      mode: 'production',
      configFile: path.join(clientPath, 'vite.config.ts')
    });
    
    // Use Vite middleware
    app.use(vite.ssrFixStacktrace);
    app.use('/', vite.middlewares);
    
    console.log('✅ Frontend setup complete');
    return true;
  } catch (error) {
    console.error('❌ Frontend setup failed:', error);
    return false;
  }
}

// Fallback for SPA routing (must be last)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      error: 'API endpoint not found',
      path: req.path 
    });
  }
  // For non-API routes, let Vite handle it
  res.status(404).json({ error: 'Route not found' });
});

// Start the server
async function startServer() {
  try {
    // Initialize backend first
    const backendReady = await initializeBackend();
    if (!backendReady) {
      throw new Error('Backend initialization failed');
    }
    
    // Setup frontend
    const frontendReady = await setupFrontend();
    if (!frontendReady) {
      throw new Error('Frontend setup failed');
    }
    
    // Create and start HTTP server
    const server = createServer(app);
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log('🎉 Production Server Ready!');
      console.log(`📡 Server running on port: ${PORT}`);
      console.log(`🌐 Frontend: Vite development server`);
      console.log(`⚡ Backend: Full API with billing routes`);
      console.log(`🔗 Access at: http://localhost:${PORT}`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('📴 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();