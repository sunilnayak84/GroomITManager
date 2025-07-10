/**
 * PRODUCTION ENTRY POINT FOR REPLIT DEPLOYMENT
 * 
 * This deployment approach uses the working development setup but configured for production.
 * It starts both the client (Vite dev server) and server concurrently for full functionality.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('[DEPLOYMENT] Starting GroomIT Manager with full billing functionality...');

// Start the full development server which includes both frontend and backend
const serverProcess = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: process.env.PORT || '3000',
    VITE_PORT: '5174'
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

console.log('[DEPLOYMENT] Full stack GroomIT Manager with billing functionality starting...');