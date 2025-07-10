/**
 * DEPLOYMENT SERVER - FIXED VERSION
 * 
 * This version addresses all the deployment issues:
 * 1. Uses correct import paths
 * 2. Serves frontend properly
 * 3. Includes health check endpoint
 * 4. Avoids module resolution issues
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting GroomIT Manager Deployment Server...');

// Basic Express middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Find client build directory
const clientBuildPath = path.join(__dirname, 'client/dist');

if (!fs.existsSync(clientBuildPath)) {
  console.error('❌ Client build not found at:', clientBuildPath);
  process.exit(1);
}

console.log('✅ Found client build at:', clientBuildPath);

// Serve static files from client build
app.use(express.static(clientBuildPath));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production'
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    server: 'GroomIT Manager',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Catch-all handler for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ GroomIT Manager server running on port ${PORT}`);
  console.log(`📍 Frontend: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Status: http://localhost:${PORT}/api/status`);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});