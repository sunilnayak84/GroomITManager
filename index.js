/**
 * PRODUCTION ENTRY POINT FOR REPLIT DEPLOYMENT
 * 
 * This file starts the Express server with all API routes for production deployment.
 * It ensures all billing, authentication, and database APIs are available.
 */

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('[DEPLOYMENT] Starting production server with full API support...');

// Start the server from the server directory
const serverProcess = spawn('npm', ['run', 'dev'], {
  cwd: join(__dirname, 'server'),
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: process.env.PORT || '3000'
  }
});

serverProcess.on('error', (error) => {
  console.error('[DEPLOYMENT] Failed to start server:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(`[DEPLOYMENT] Server process exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[DEPLOYMENT] Received SIGTERM, shutting down gracefully...');
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('[DEPLOYMENT] Received SIGINT, shutting down gracefully...');
  serverProcess.kill('SIGINT');
});