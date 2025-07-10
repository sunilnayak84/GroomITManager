/**
 * ULTRA-SIMPLE DEPLOYMENT SERVER
 * 
 * This is a minimal deployment that avoids all complex imports and builds
 * It serves the frontend and provides basic API functionality
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting Ultra-Simple GroomIT Manager Deployment...');

// Basic Express middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// Find and serve client build
const clientBuildPath = path.join(__dirname, 'client/dist');

if (fs.existsSync(clientBuildPath)) {
  console.log('✅ Found client build at:', clientBuildPath);
  
  // Serve static files from client build
  app.use(express.static(clientBuildPath));
  
  // API health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Catch-all handler for SPA routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 Frontend available at: http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  });
} else {
  console.error('❌ Client build not found at:', clientBuildPath);
  process.exit(1);
}