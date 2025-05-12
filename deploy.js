/**
 * STANDALONE DEPLOYMENT SERVER
 * 
 * This is a completely self-contained deployment server that ignores
 * other configuration files in the project. It's designed to work
 * regardless of environment variable settings.
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';

// Force production mode
process.env.NODE_ENV = 'production';

// Override PORT to ensure consistency
process.env.PORT = '3000';

console.log('=============================================');
console.log('STARTING STANDALONE DEPLOYMENT SERVER');
console.log('=============================================');
console.log('Environment:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Find the client build directory
const possibleClientPaths = [
  path.join(__dirname, 'client/dist'),
  path.join(__dirname, 'dist/client'),
  path.join(process.cwd(), 'client/dist'),
  path.join(process.cwd(), 'dist/client')
];

let clientBuildPath = '';
for (const pathToCheck of possibleClientPaths) {
  try {
    if (fs.existsSync(pathToCheck) && fs.existsSync(path.join(pathToCheck, 'index.html'))) {
      clientBuildPath = pathToCheck;
      console.log('Found client build at:', clientBuildPath);
      break;
    }
  } catch (error) {
    // Continue checking other paths
  }
}

// Build the client if it doesn't exist
if (!clientBuildPath) {
  console.log('No client build found. Attempting to build the client...');
  try {
    const { execSync } = require('child_process');
    
    console.log('Installing client dependencies...');
    execSync('cd client && npm install', { stdio: 'inherit' });
    
    console.log('Building client...');
    execSync('cd client && npm run build', { stdio: 'inherit' });
    
    clientBuildPath = path.join(__dirname, 'client/dist');
    if (!fs.existsSync(clientBuildPath) || !fs.existsSync(path.join(clientBuildPath, 'index.html'))) {
      console.error('Failed to build client');
      clientBuildPath = '';
    } else {
      console.log('Client built successfully at:', clientBuildPath);
    }
  } catch (error) {
    console.error('Error building client:', error.message);
  }
}

// Create API endpoints for testing
const apiRouter = express.Router();

// Add authentication endpoint
apiRouter.post('/auth/login', (req, res) => {
  res.json({
    status: 'success',
    message: 'Authentication successful',
    data: {
      token: 'sample-token',
      user: {
        id: 'sample-user-id',
        name: 'Demo User',
        role: 'admin'
      }
    }
  });
});

// Basic API endpoints
apiRouter.get('/stats', (req, res) => {
  res.json({
    status: 'success',
    message: 'Stats fetched successfully',
    data: {
      activeAppointments: 3,
      completedAppointments: 12,
      customers: 25,
      revenue: 45000
    }
  });
});

apiRouter.get('/customers', (req, res) => {
  res.json({
    status: 'success',
    message: 'Customers fetched successfully',
    data: {
      customerCount: 3,
      customerIds: ["sample1", "sample2", "sample3"],
      customerNames: ["Demo Customer 1", "Demo Customer 2", "Demo Customer 3"]
    }
  });
});

// Define a simple not-authenticated response for any token failures
app.use((req, res, next) => {
  const auth = req.headers.authorization;
  // If the path starts with /api and it's not the login endpoint
  if (req.path.startsWith('/api/') && !req.path.includes('/auth/login') && !auth) {
    // Don't block requests, but add a flag to indicate authentication failed
    req.notAuthenticated = true;
  }
  next();
});

// Mount API router at /api path - CRITICAL to put this BEFORE static file serving
app.use('/api', apiRouter);

// For /api/* routes that are not authenticated, override with this middleware
app.use('/api/*', (req, res, next) => {
  if (req.notAuthenticated) {
    return res.status(401).json({
      message: "Not authenticated",
      code: "NO_TOKEN"
    });
  }
  next();
});

// WebSocket endpoint for client-side code that expects it
app.get('/ws', (req, res) => {
  res.status(200).send('WebSocket endpoint available');
});

// NOW serve static files - AFTER all API routes are defined
if (clientBuildPath) {
  console.log('Setting up static file serving from:', clientBuildPath);
  
  // Serve static files
  app.use(express.static(clientBuildPath));
  
  // SPA client-side routing - catch-all route MUST be last
  app.get('*', (req, res) => {
    // Skip any API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'API endpoint not found' 
      });
    }
    
    // Send the React app
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  // If no client build, create a simple HTML response
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>GroomIT Manager</title>
          <style>
            body { font-family: system-ui, sans-serif; background: #f9fafb; color: #111827; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .container { max-width: 600px; background: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
            h1 { color: #047857; margin-top: 0; }
            .error { color: #b91c1c; margin-top: 1rem; padding: 1rem; background: #fee2e2; border-radius: 0.25rem; }
            .code { font-family: monospace; background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 0.25rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>GroomIT Manager</h1>
            <p>The application frontend could not be found.</p>
            <div class="error">
              <strong>Error:</strong> Client build not found. Please build the application first.
            </div>
            <p>Run the following command to build the client:</p>
            <div class="code">cd client && npm run build</div>
            <p>Then restart the deployment.</p>
          </div>
        </body>
        </html>
      `);
    }
  });
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
  
  if (clientBuildPath) {
    console.log(`Static files served from: ${clientBuildPath}`);
  } else {
    console.log(`WARNING: No client build found - frontend will not be served!`);
  }
});