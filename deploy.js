/**
 * STANDALONE DEPLOYMENT SERVER
 * 
 * This is a completely self-contained deployment server that ignores
 * other configuration files in the project. It's designed to work
 * regardless of environment variable settings.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Setup basic Express application
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

console.log('DEPLOYMENT MODE: Frontend Priority');
console.log('Starting deployment server');
console.log('Current directory:', __dirname);

// Define client path options to check
const clientPaths = [
  path.join(__dirname, 'client/dist'),
  path.join(__dirname, 'dist/client')
];

// Find valid client path
let clientPath = null;
for (const testPath of clientPaths) {
  if (fs.existsSync(path.join(testPath, 'index.html'))) {
    clientPath = testPath;
    console.log('Found client build at:', clientPath);
    break;
  }
}

if (!clientPath) {
  console.error('ERROR: Client build not found!');
  console.log('Creating emergency client directory');
  
  clientPath = path.join(__dirname, 'client/dist');
  fs.mkdirSync(clientPath, { recursive: true });
  
  // Create a placeholder index.html
  fs.writeFileSync(path.join(clientPath, 'index.html'), `
    <!DOCTYPE html>
    <html>
      <head>
        <title>GroomIT Manager</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
          h1 { color: #047857; }
          .error { color: #b91c1c; background: #fee2e2; padding: 12px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>GroomIT Manager</h1>
        <div class="error">
          <p><strong>Error:</strong> Frontend build not found.</p>
          <p>Please build the client application with:</p>
          <pre>cd client && npm run build</pre>
        </div>
      </body>
    </html>
  `);
  console.log('Created emergency client placeholder at:', clientPath);
}

// API endpoint to check if the server is running
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Frontend deployment server is running',
    time: new Date().toISOString()
  });
});

// CRITICAL: Serve static files BEFORE any other routes
// This ensures frontend assets are served with highest priority
console.log('Setting up static file serving from:', clientPath);
app.use(express.static(clientPath));

// CRITICAL: This catch-all route MUST come after static file middleware
// but before any API routes to ensure SPA routing works
app.get('*', (req, res) => {
  // Skip API paths to allow backend to handle them if needed
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // For all other routes, serve the SPA's index.html
  console.log('Serving index.html for path:', req.path);
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend deployment server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT} to view the application`);
});