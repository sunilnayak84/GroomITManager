/**
 * DIRECT DEPLOYMENT SERVER
 * 
 * This is a simple server that only serves the frontend files.
 * It completely bypasses the backend API for deployment purposes.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Basic setup
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

console.log('Starting direct deployment server');
console.log('Current directory:', __dirname);

// Check different possible client paths
const possiblePaths = [
  path.join(__dirname, 'client/dist'),
  path.join(__dirname, 'dist/client'),
  path.join(process.cwd(), 'client/dist'),
  path.join(process.cwd(), 'dist/client')
];

let clientPath = null;
for (const tryPath of possiblePaths) {
  try {
    const indexPath = path.join(tryPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      clientPath = tryPath;
      console.log('Found client at:', clientPath);
      break;
    }
  } catch (e) {
    // Continue checking other paths
  }
}

if (!clientPath) {
  console.error('ERROR: No client found!');
  console.log('Creating emergency index.html');
  
  clientPath = path.join(__dirname, 'client/dist');
  fs.mkdirSync(clientPath, { recursive: true });
  
  fs.writeFileSync(path.join(clientPath, 'index.html'), `
    <!DOCTYPE html>
    <html>
      <head>
        <title>GroomIT Manager</title>
        <style>
          body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 20px; }
          h1 { color: #047857; }
          .error { background: #fee2e2; color: #b91c1c; padding: 12px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>GroomIT Manager</h1>
        <div class="error">
          <p><strong>Error:</strong> Frontend build not found.</p>
          <p>Please run the build process with: <code>cd client && npm run build</code></p>
        </div>
      </body>
    </html>
  `);
}

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Direct deployment server running',
    timestamp: new Date().toISOString()
  });
});

// Serve static files - this is the core functionality
app.use(express.static(clientPath));

// Catch-all route for SPA routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    // For API routes, return a stub response
    return res.json({
      message: 'This is a frontend-only deployment. API endpoints are not available.',
      path: req.path
    });
  }
  
  // For all other routes, serve the SPA's index.html
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Direct deployment server running on port ${PORT}`);
});