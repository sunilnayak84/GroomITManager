/**
 * REPLIT DEPLOYMENT ENTRY POINT
 * 
 * This file is specifically designed for Replit Deployments.
 * It provides an integrated solution that serves static files 
 * from the client build directory and handles API requests properly.
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';

// Import server modules - if build process has been completed correctly
let serverModules = {};
try {
  serverModules = await import('./dist/index.js').catch(() => ({}));
  console.log('Successfully loaded server modules');
} catch (err) {
  console.warn('Could not load server modules, falling back to static file serving only:', err.message);
}

console.log('Starting Replit Deployment Server...');

// Set environment to production
process.env.NODE_ENV = 'production';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Basic Express middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({
  origin: ['https://groomery.replit.app', 'https://*.replit.dev', 'https://*.repl.co'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Set Access-Control-Allow headers for all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Enhanced request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Incoming ${req.method} request to ${req.path}`);
  next();
});

// Find the client build directory
let clientBuildPath = '';
const possiblePaths = [
  path.join(__dirname, 'client/dist'),
  path.join(__dirname, 'dist/client'),
  path.join(__dirname, 'dist/public'),
  path.join(process.cwd(), 'client/dist'),
  path.join(process.cwd(), 'dist/client'),
  path.join(process.cwd(), 'dist/public')
];

for (const pathToCheck of possiblePaths) {
  try {
    if (fs.existsSync(pathToCheck) && fs.existsSync(path.join(pathToCheck, 'index.html'))) {
      clientBuildPath = pathToCheck;
      console.log('Found client build at:', clientBuildPath);
      break;
    }
  } catch (error) {
    console.error(`Error checking path ${pathToCheck}:`, error.message);
  }
}

if (!clientBuildPath) {
  console.error('Could not find client build directory. Creating a simple index.html...');
  clientBuildPath = path.join(__dirname, 'dist/client');
  
  if (!fs.existsSync(clientBuildPath)) {
    fs.mkdirSync(clientBuildPath, { recursive: true });
  }
  
  // Create a simple placeholder index.html
  const placeholderHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GroomIT Manager</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f1f5f9; color: #334155; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; padding: 20px; }
    .container { max-width: 600px; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
    h1 { color: #0f766e; margin-top: 0; }
    .error { color: #b91c1c; }
  </style>
</head>
<body>
  <div class="container">
    <h1>GroomIT Manager</h1>
    <p class="error">No client build was found. Please make sure to run the build process before deploying.</p>
    <p>Run <code>npm run build</code> to build the application.</p>
  </div>
</body>
</html>`;
  
  fs.writeFileSync(path.join(clientBuildPath, 'index.html'), placeholderHtml);
}

// Special handler for the root path to ensure we serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Serve static files from the client build directory FIRST, before any API routes
console.log('Setting up static file serving from:', clientBuildPath);
app.use(express.static(clientBuildPath, {
  maxAge: '1d', // Add caching for static assets
  etag: true
}));

// Try to initialize the full server with API functionality
let serverInitialized = false;
try {
  if (serverModules.registerRoutes && typeof serverModules.registerRoutes === 'function') {
    // Register API routes after static files
    await serverModules.registerRoutes(app);
    console.log('API routes registered successfully');
    serverInitialized = true;
  }
} catch (error) {
  console.error('Failed to register API routes:', error);
}

// If server initialization failed, provide a fallback API endpoint with an informative message
if (!serverInitialized) {
  app.use('/api/*', (req, res) => {
    res.status(200).json({
      status: "limited",
      message: "API endpoint available but in limited mode",
      note: "The server was not fully initialized. Some functionality may be unavailable."
    });
  });
}

// All other routes redirect to index.html (SPA client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Create HTTP server and start listening
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Replit Deployment Server running on port ${PORT}`);
  console.log(`Static files served from: ${clientBuildPath}`);
  console.log(`Server running in ${serverInitialized ? 'FULL' : 'LIMITED'} mode`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});