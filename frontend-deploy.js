/**
 * MINIMAL FRONTEND-ONLY SERVER FOR DEPLOYMENT
 * 
 * This is a standalone server that ONLY serves the frontend.
 * It bypasses any backend API functionality to ensure the frontend is deployed properly.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Basic setup
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

console.log('Starting frontend-only deployment server');
console.log('Current directory:', __dirname);

// Possible locations for client files
const clientPaths = [
  path.join(__dirname, 'client/dist'),
  path.join(__dirname, 'dist/client'),
  path.join(process.cwd(), 'client/dist'),
  path.join(process.cwd(), 'dist/client')
];

// Find the client files
let clientPath = null;
for (const testPath of clientPaths) {
  try {
    if (fs.existsSync(path.join(testPath, 'index.html'))) {
      clientPath = testPath;
      console.log('Found client at:', clientPath);
      break;
    }
  } catch (error) {
    // Continue checking
  }
}

if (!clientPath) {
  console.error('No client found - creating emergency build');
  
  // Try to build the client if not found
  try {
    const { execSync } = require('child_process');
    console.log('Building client...');
    execSync('cd client && npm run build', { stdio: 'inherit' });
    clientPath = path.join(__dirname, 'client/dist');
    console.log('Client built successfully at:', clientPath);
  } catch (error) {
    console.error('Failed to build client:', error);
    
    // Create an emergency index.html
    clientPath = path.join(__dirname, 'client/dist');
    
    if (!fs.existsSync(clientPath)) {
      fs.mkdirSync(clientPath, { recursive: true });
    }
    
    fs.writeFileSync(path.join(clientPath, 'index.html'), `
      <!DOCTYPE html>
      <html>
        <head>
          <title>GroomIT Manager</title>
          <style>
            body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 20px; }
            h1 { color: #047857; }
          </style>
        </head>
        <body>
          <h1>GroomIT Manager</h1>
          <p>This is a placeholder. The frontend is deploying.</p>
          <p>If you continue to see this page, please check deployment logs.</p>
        </body>
      </html>
    `);
    console.log('Created emergency index.html at:', clientPath);
  }
}

// Create a simple API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    mode: 'frontend-only',
    time: new Date().toISOString()
  });
});

// Serve static files with priority
app.use(express.static(clientPath));

// Send index.html for all other routes (SPA routing)
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  console.log('Serving index.html for path:', req.path);
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend-only server running on port ${PORT}`);
});