/**
 * STANDALONE FRONTEND SERVER
 * 
 * This file creates a simple server that ONLY serves the frontend.
 * It completely bypasses the backend to ensure the frontend is served.
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

console.log('=====================================');
console.log('STARTING FRONTEND-ONLY SERVER');
console.log('=====================================');
console.log('Current directory:', __dirname);
console.log('Looking for client build...');

// Find the client build directory
const clientPaths = [
  path.join(__dirname, 'client/dist'),
  path.join(__dirname, 'dist/client'),
  path.join(process.cwd(), 'client/dist'),
  path.join(process.cwd(), 'dist/client')
];

let clientPath = null;
for (const testPath of clientPaths) {
  if (fs.existsSync(path.join(testPath, 'index.html'))) {
    clientPath = testPath;
    console.log('Found client build at:', clientPath);
    break;
  }
}

if (!clientPath) {
  console.error('No client build found! Creating a minimal client build...');
  
  // Create a minimal client build
  clientPath = path.join(__dirname, 'dist/client');
  if (!fs.existsSync(clientPath)) {
    fs.mkdirSync(clientPath, { recursive: true });
  }
  
  // Create a minimal index.html
  const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GroomIT Manager</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f9fafb;
      color: #111827;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      text-align: center;
    }
    .container {
      max-width: 800px;
      background: white;
      padding: 2rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    h1 { color: #047857; margin-top: 0; }
    .code {
      font-family: monospace;
      background: #f3f4f6;
      padding: 1rem;
      border-radius: 0.25rem;
      margin: 1rem 0;
      text-align: left;
      overflow-x: auto;
    }
    .error { color: #b91c1c; }
    .steps { text-align: left; }
    .steps li { margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>GroomIT Manager</h1>
    <p>This is a placeholder page for the GroomIT Manager application.</p>
    
    <div class="error">
      <h2>Client Build Not Found</h2>
      <p>The client application build files were not found. Please build the client before deploying.</p>
    </div>
    
    <h3>Steps to fix this issue:</h3>
    <ol class="steps">
      <li>Make sure the client is built: <br>
        <div class="code">cd client && npm run build</div>
      </li>
      <li>Copy the client build to the deployment directory: <br>
        <div class="code">mkdir -p dist/client && cp -r client/dist/* dist/client/</div>
      </li>
      <li>Redeploy the application</li>
    </ol>
  </div>
</body>
</html>
  `;
  
  fs.writeFileSync(path.join(clientPath, 'index.html'), indexHtml);
  console.log('Created minimal index.html');
}

// Serve static files from the client build directory
app.use(express.static(clientPath));

// For all routes, serve the index.html (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend server running on port ${PORT}`);
  console.log(`Access the application at: http://localhost:${PORT}`);
  console.log('=====================================');
});