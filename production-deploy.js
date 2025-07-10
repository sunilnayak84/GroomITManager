/**
 * PRODUCTION DEPLOYMENT WITH FULL API SUPPORT
 * 
 * This deployment script serves the built frontend AND runs the full backend API
 * It ensures all billing and appointment APIs work properly in production
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { createServer } from 'http';

// Import the backend server components
import { initializeFirebaseAdmin } from './server/firebase.js';
import { setupAuthenticationFirestore } from './server/auth-firestore.js';
import { registerRoutes } from './server/routes.js';
import { logger } from './server/utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting GroomIT Manager Production Server...');
console.log('📍 Node Environment:', process.env.NODE_ENV);

// Set production environment
process.env.NODE_ENV = 'production';

// Basic Express middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', 1);

// Enhanced CORS for production
app.use(cors({
  origin: ['https://groomery.replit.app', 'https://*.replit.dev', 'https://*.repl.co', 'https://*.sisko.replit.dev'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    headers: req.headers,
    query: req.query
  });
  next();
});

// Find the client build directory (check optimized build path first)
let clientBuildPath = '';
const possiblePaths = [
  path.join(__dirname, 'dist/public'),  // Optimized build output
  path.join(__dirname, 'client/dist'),
  path.join(__dirname, 'dist/client'),
  path.join(process.cwd(), 'client/dist'),
  path.join(process.cwd(), 'dist/public')
];

for (const pathToCheck of possiblePaths) {
  try {
    if (fs.existsSync(pathToCheck) && fs.existsSync(path.join(pathToCheck, 'index.html'))) {
      clientBuildPath = pathToCheck;
      console.log('✅ Found client build at:', clientBuildPath);
      break;
    }
  } catch (error) {
    console.error(`❌ Error checking path ${pathToCheck}:`, error.message);
  }
}

if (!clientBuildPath) {
  console.error('❌ Client build not found! Building client...');
  
  try {
    const { execSync } = await import('child_process');
    console.log('🚀 Building with optimized chunking for faster deployment...');
    execSync('npx vite build --config vite.config.prod.ts', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    // Check again after building
    for (const pathToCheck of possiblePaths) {
      if (fs.existsSync(pathToCheck) && fs.existsSync(path.join(pathToCheck, 'index.html'))) {
        clientBuildPath = pathToCheck;
        console.log('✅ Client built successfully at:', clientBuildPath);
        break;
      }
    }
  } catch (buildError) {
    console.error('❌ Failed to build client:', buildError);
    process.exit(1);
  }
}

async function startProductionServer() {
  try {
    console.log('🔧 Initializing Firebase Admin...');
    const firebaseApp = await initializeFirebaseAdmin();
    if (!firebaseApp) {
      throw new Error('Failed to initialize Firebase Admin');
    }
    console.log('✅ Firebase Admin initialized successfully');

    console.log('🔐 Setting up authentication...');
    await setupAuthenticationFirestore(app);
    console.log('✅ Authentication setup completed');

    console.log('🛠️ Registering API routes...');
    await registerRoutes(app);
    console.log('✅ API routes registered successfully');

    // Create HTTP server
    const server = createServer(app);

    // Serve static files AFTER API routes to ensure API takes priority
    if (clientBuildPath) {
      console.log('📁 Setting up static file serving...');
      app.use(express.static(clientBuildPath, {
        maxAge: '1d' // Cache static assets for 1 day
      }));

      // SPA fallback route - MUST be last
      app.get('*', (req, res) => {
        // Skip API routes - they should already be handled
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ 
            error: 'API endpoint not found',
            path: req.path 
          });
        }
        
        // Serve index.html for all other routes (SPA routing)
        res.sendFile(path.join(clientBuildPath, 'index.html'));
      });
    }

    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      console.log('🎉 GroomIT Manager Production Server Started!');
      console.log(`📡 Server running on port: ${PORT}`);
      console.log(`🌐 Frontend served from: ${clientBuildPath}`);
      console.log(`⚡ API endpoints available at: /api/*`);
      console.log(`🔗 Access at: http://localhost:${PORT}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Production server startup failed:', error);
    process.exit(1);
  }
}

// Start the production server
startProductionServer();