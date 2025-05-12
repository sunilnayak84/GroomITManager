/**
 * ULTRA-MINIMAL STATIC SERVER
 * 
 * This is the simplest possible server that only serves static files.
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Basic setup
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

console.log('Starting minimal static server');
console.log('Current directory:', __dirname);

// Locations to check for client files
const clientPaths = [
  path.join(__dirname, 'client/dist'),
  path.join(__dirname, 'dist/client')
];

// Find the client files
let clientPath = null;
for (const testPath of clientPaths) {
  if (fs.existsSync(path.join(testPath, 'index.html'))) {
    clientPath = testPath;
    console.log('Found client at:', clientPath);
    break;
  }
}

if (!clientPath) {
  console.error('No client found - creating fallback');
  clientPath = path.join(__dirname, 'dist/client');
  
  if (!fs.existsSync(clientPath)) {
    fs.mkdirSync(clientPath, { recursive: true });
  }
  
  // Create a simple index.html
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
        <p>This is a placeholder. The client build was not found.</p>
        <p>Please run: <code>cd client && npm run build</code></p>
      </body>
    </html>
  `);
}

// Serve static files
app.use(express.static(clientPath));

// Handle all routes by serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Static server running on port ${PORT}`);
});