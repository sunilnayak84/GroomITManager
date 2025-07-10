/**
 * SMART PRODUCTION DEPLOYMENT
 * 
 * Uses the exact working development server configuration but configured for production
 * Runs both frontend and backend like the working Backend workflow
 */

import { spawn } from 'child_process';
import path from 'path';

console.log('🚀 Smart Production Deployment Starting...');
console.log('📋 Using exact working development configuration');

// Set production environment variables
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '5000';

console.log('🌍 Environment: production');
console.log('📡 Port:', process.env.PORT);

// Start the exact same command as the working Backend workflow but on production port
const serverProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: process.env.PORT || '5000'
  }
});

serverProcess.on('error', (error) => {
  console.error('❌ Production server error:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(`📴 Production server exited with code: ${code}`);
  if (code !== 0) {
    process.exit(code);
  }
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down...');
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down...');
  serverProcess.kill('SIGINT');
});

console.log('✅ Smart Production Deployment initialized');
console.log('🔗 Server will be available on port', process.env.PORT || '5000');