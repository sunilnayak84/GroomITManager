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
app.use(express.static(clientBuildPath));

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
  // Send index.html for all other routes (SPA client-side routing)
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple deployment server running on port ${PORT}`);
  console.log(`Static files served from: ${clientBuildPath}`);
});