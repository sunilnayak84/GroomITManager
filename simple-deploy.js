// Simple standalone deployment server for Replit
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Set production environment
process.env.NODE_ENV = 'production';

// Setup paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Find client build directory
const clientPaths = [
  path.join(__dirname, 'dist/client'),
  path.join(__dirname, 'client/dist'),
  path.join(__dirname, 'dist/public')
];

let clientBuildPath = null;
for (const path of clientPaths) {
  if (fs.existsSync(path) && fs.existsSync(`${path}/index.html`)) {
    clientBuildPath = path;
    console.log(`Found client build at: ${clientBuildPath}`);
    break;
  }
}

if (!clientBuildPath) {
  console.error('ERROR: Could not locate client build directory');
  process.exit(1);
}

// IMPORTANT: First serve static files - This should happen BEFORE any API routes
console.log(`Serving static files from ${clientBuildPath}`);
app.use(express.static(clientBuildPath, {
  // Set correct MIME types for JavaScript and CSS files
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// Basic API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Important: Catch-all route AFTER API routes for SPA routing
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Check if request is for an asset file
  if (req.path.startsWith('/assets/')) {
    const assetPath = path.join(clientBuildPath, req.path);
    if (fs.existsSync(assetPath)) {
      console.log(`Serving asset: ${req.path}`);
      return res.sendFile(assetPath);
    }
    console.log(`Asset not found: ${req.path}`);
  }
  
  // Send index.html for all other routes (SPA client-side routing)
  console.log(`Serving index.html for route: ${req.path}`);
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Debug info endpoint for troubleshooting
app.get('/api/debug', (req, res) => {
  // Only available in development
  if (process.env.NODE_ENV !== 'production') {
    res.json({
      environment: process.env.NODE_ENV,
      port: PORT,
      clientBuildPath,
      buildExists: fs.existsSync(clientBuildPath),
      indexExists: fs.existsSync(path.join(clientBuildPath, 'index.html')),
      assetsExists: fs.existsSync(path.join(clientBuildPath, 'assets')),
      assetFiles: fs.existsSync(path.join(clientBuildPath, 'assets')) 
        ? fs.readdirSync(path.join(clientBuildPath, 'assets')).slice(0, 10) // Just show first 10
        : []
    });
  } else {
    res.status(404).json({ error: 'Debug endpoint not available in production' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple deployment server running on port ${PORT}`);
  console.log(`Static files served from: ${clientBuildPath}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  
  // List all environment variables that might affect client app
  const clientEnvVars = [
    'VITE_API_URL',
    'VITE_API_BASE_URL',
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ];
  
  console.log('Client environment variables:');
  clientEnvVars.forEach(key => {
    if (process.env[key]) {
      // Mask sensitive values
      const value = key.includes('KEY') || key.includes('ID') 
        ? '****' 
        : process.env[key];
      console.log(`  ${key}: ${value}`);
    } else {
      console.log(`  ${key}: not set`);
    }
  });
});