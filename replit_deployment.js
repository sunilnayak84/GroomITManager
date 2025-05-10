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

// Mount the API router
app.use('/api', apiRouter);

// Serve static files from the client build directory
console.log('Setting up static file serving from:', clientBuildPath);
app.use(express.static(clientBuildPath));

// Special handler for the root path to ensure we serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// All other routes redirect to index.html (SPA client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Replit Deployment Server running on port ${PORT}`);
  console.log(`Static files served from: ${clientBuildPath}`);
  console.log(`API endpoints available at /api/*`);
});