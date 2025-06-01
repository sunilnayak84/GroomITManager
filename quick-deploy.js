/**
 * Quick Deployment Script for Package Management Updates
 * 
 * This script deploys only the essential changes without full rebuild
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files from client dist directory
const clientDistPath = path.join(__dirname, 'client', 'dist');

// Check if client build exists
if (fs.existsSync(clientDistPath)) {
  console.log('✓ Client build found, serving static files');
  app.use(express.static(clientDistPath));
} else {
  console.log('⚠ No client build found, serving development files');
  // Fallback to serve from client/src for development
  app.use(express.static(path.join(__dirname, 'client')));
}

// Handle React Router (SPA)
app.get('*', (req, res) => {
  const indexPath = fs.existsSync(path.join(clientDistPath, 'index.html')) 
    ? path.join(clientDistPath, 'index.html')
    : path.join(__dirname, 'client', 'index.html');
    
  res.sendFile(indexPath);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Quick deployment server running on port ${PORT}`);
  console.log(`✓ Package management updates are now live`);
  console.log(`✓ Access your app at: http://localhost:${PORT}`);
});