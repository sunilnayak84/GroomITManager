/**
 * MAIN DEPLOYMENT ENTRY POINT
 * 
 * This file serves as the main entry point for the Replit deployment.
 * It handles both static file serving and API requests properly.
 */

// Set environment variables for deployment
process.env.NODE_ENV = 'production';

// Check for and create client build if needed before starting deployment
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Print environment mode and deployment information
console.log('=========================================');
console.log('Starting GroomIT Manager in PRODUCTION mode');
console.log('Node environment:', process.env.NODE_ENV);
console.log('Current directory:', process.cwd());
console.log('=========================================');

// Check if client build exists
const clientDistDir = path.join(__dirname, 'client', 'dist');
const distClientDir = path.join(__dirname, 'dist', 'client');

if (!fs.existsSync(clientDistDir) && !fs.existsSync(distClientDir)) {
  console.log('WARNING: No client build found! Deployment may serve backend only.');
  console.log('To fix this, run: cd client && npm run build');
  console.log('Then redeploy the application.');
}

// Import the replit_deployment.js file which contains the main server logic
import './replit_deployment.js';

// Log that the deployment is using this entry point
console.log('GroomIT Manager deployment running...');