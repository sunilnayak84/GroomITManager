/**
 * FAST DEPLOYMENT SCRIPT
 * 
 * This deployment script uses optimized chunk splitting to reduce
 * bundle sizes and significantly speed up deployment times.
 */

import express from 'express';
import path from 'path';
import { execSync } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 FAST DEPLOYMENT: Starting optimized build...');

// Step 1: Build client with optimized chunking
console.log('📦 Building client with chunk optimization...');
try {
  // Use the optimized production config
  execSync('cd client && npx vite build --config ../vite.config.prod.ts', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ Optimized client build completed!');
} catch (error) {
  console.error('❌ Client build failed:', error.message);
  process.exit(1);
}

// Step 2: Start production server
const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Serve static files with optimized caching
app.use(express.static(path.join(__dirname, 'client/dist'), {
  maxAge: '1y',
  etag: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// API routes - import the server app
app.use('/api', async (req, res, next) => {
  try {
    // Import server routes dynamically
    const { default: serverApp } = await import('./server/index.js');
    serverApp(req, res, next);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎉 FAST DEPLOYMENT: Server running on port ${PORT}`);
  console.log(`📊 Chunk optimization: Enabled`);
  console.log(`⚡ Bundle size: Optimized`);
  console.log(`🌐 App URL: http://localhost:${PORT}`);
});