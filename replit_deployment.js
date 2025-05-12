/**
 * REPLIT DEPLOYMENT ENTRY POINT
 * 
 * This file is specifically designed for Replit Deployments.
 * It serves static files from the client build directory and
 * initializes the backend server for API handling.
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';

console.log('Starting Replit Deployment Server...');

// Set environment to production
process.env.NODE_ENV = 'production';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Basic Express middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// Set Access-Control-Allow headers for all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Find the client build directory
let clientBuildPath = '';
const possiblePaths = [
  path.join(__dirname, 'client/dist'),
  path.join(__dirname, 'dist/client'),
  path.join(process.cwd(), 'client/dist'),
  path.join(process.cwd(), 'dist/client')
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
  </style>
</head>
<body>
  <div class="container">
    <h1>GroomIT Manager</h1>
    <p>Welcome to the GroomIT Manager application!</p>
  </div>
</body>
</html>`;
  
  fs.writeFileSync(path.join(clientBuildPath, 'index.html'), placeholderHtml);
}

// Check if we need to build the client before deploying
// This is important for making sure the client build exists
if (process.env.BUILDING_FOR_REPLIT_DEPLOYMENT === 'true') {
  console.log('Building client for deployment...');
  const { execSync } = require('child_process');
  try {
    // Run the client build process
    execSync('cd client && npm run build', { stdio: 'inherit' });
    console.log('Client build completed successfully.');
    
    // Make sure the dist directory exists
    if (!fs.existsSync(path.join(__dirname, 'dist'))) {
      fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
    }
    
    // Copy the client build to the deployment location
    const distClientDir = path.join(__dirname, 'dist/client');
    if (!fs.existsSync(distClientDir)) {
      fs.mkdirSync(distClientDir, { recursive: true });
    }
    
    // Check if client/dist exists and has files to copy
    const clientDistDir = path.join(__dirname, 'client/dist');
    if (fs.existsSync(clientDistDir)) {
      execSync(`cp -r ${clientDistDir}/* ${distClientDir}/`, { stdio: 'inherit' });
      console.log('Copied client build to deployment directory.');
    } else {
      console.error('Client build directory not found after build process.');
    }
  } catch (error) {
    console.error('Error building client:', error);
  }
}

// First check if the path exists and is accessible
if (clientBuildPath) {
  try {
    const stat = fs.statSync(clientBuildPath);
    if (!stat.isDirectory()) {
      console.error(`Client build path ${clientBuildPath} is not a directory`);
      clientBuildPath = '';
    }
  } catch (error) {
    console.error(`Error accessing client build path ${clientBuildPath}:`, error.message);
    clientBuildPath = '';
  }
}

// Create a separate router for API requests
const apiRouter = express.Router();

// Mock API handlers for deployment
apiRouter.get('/stats', (req, res) => {
  res.json({
    status: 'success',
    message: 'API endpoint working',
    stats: {
      activeAppointments: 5,
      completedAppointments: 12,
      customers: 34,
      revenue: 45600
    }
  });
});

apiRouter.get('/customers', (req, res) => {
  res.json({
    status: 'success', 
    message: 'Customers fetched',
    data: {
      customerCount: 3,
      customerIds: ["sample1", "sample2", "sample3"],
      customerNames: ["Demo Customer 1", "Demo Customer 2", "Demo Customer 3"]
    }
  });
});

apiRouter.get('/appointments', (req, res) => {
  res.json({
    status: 'success',
    message: 'Appointments fetched',
    data: {
      appointments: [],
      count: 0
    }
  });
});

// Important: Route order matters!
// 1. First define explicit API routes
app.use('/api', apiRouter);

// 2. Then serve static files
console.log('Setting up static file serving from:', clientBuildPath);
if (clientBuildPath) {
  app.use(express.static(clientBuildPath));
}

// 3. Then handle WebSocket route if needed
app.get('/ws', (req, res) => {
  res.status(400).send('WebSocket endpoint - use a WebSocket client to connect');
});

// 4. Finally, catch-all route for SPA client-side routing
// This must be AFTER API routes to prevent API routes from being caught
if (clientBuildPath) {
  app.get('*', (req, res) => {
    // Skip API routes (should already be handled, but just in case)
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'API endpoint not found'
      });
    }
    
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  // Fallback if no client build is found
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.status(500).send('Client build not found. Please rebuild the application.');
    }
  });
}

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Replit Deployment Server running on port ${PORT}`);
  if (clientBuildPath) {
    console.log(`Static files served from: ${clientBuildPath}`);
  } else {
    console.log(`WARNING: No static files being served - client build not found!`);
  }
  console.log(`API endpoints available at /api/*`);
});