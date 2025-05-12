/**
 * LAST RESORT DEPLOYMENT SERVER
 * 
 * This is an ultra-simplified server that only serves static files.
 * It's designed as a last resort when all other deployment options fail.
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

console.log('Starting LAST RESORT deployment server');
console.log('Directory:', __dirname);

// Find client build
const clientPath = path.join(__dirname, 'client/dist');
console.log('Looking for client at:', clientPath);

if (!fs.existsSync(path.join(clientPath, 'index.html'))) {
  console.error('ERROR: Client build not found!');
  
  // Create emergency index.html
  if (!fs.existsSync(clientPath)) {
    fs.mkdirSync(clientPath, { recursive: true });
  }
  
  fs.writeFileSync(path.join(clientPath, 'index.html'), `
    <!DOCTYPE html>
    <html>
      <head>
        <title>GroomIT Manager</title>
        <style>body{font-family:system-ui;margin:40px auto;max-width:650px;line-height:1.6;padding:0 10px}h1{color:#047857}</style>
      </head>
      <body>
        <h1>GroomIT Manager</h1>
        <p>Client build not found. Please build the client with <code>cd client && npm run build</code></p>
      </body>
    </html>
  `);
  console.log('Created emergency index.html');
}

// Serve static files with high priority
app.use(express.static(clientPath));

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', mode: 'frontend-only', time: new Date().toISOString() });
});

// Catch-all route for client-side routing
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not available in frontend-only mode' });
  }
  
  // For all other routes, serve the SPA's index.html
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Last resort server running on port ${PORT}`);
});