/**
 * DEPLOYMENT PREPARATION SCRIPT
 * 
 * This script prepares the application for deployment by:
 * 1. Building the client
 * 2. Ensuring the client build is available to the deployment server
 * 3. Setting up the proper environment variables
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('=================================================');
console.log('PREPARING APPLICATION FOR DEPLOYMENT');
console.log('=================================================');

// Clean up previous build artifacts
console.log('Cleaning up previous builds...');
try {
  if (fs.existsSync(path.join(__dirname, 'dist'))) {
    execSync('rm -rf dist');
    console.log('✓ Removed dist directory');
  }
} catch (error) {
  console.error('Error cleaning dist directory:', error.message);
}

// Create a production .env file
console.log('Creating production environment configuration...');
try {
  fs.writeFileSync('.env', 'NODE_ENV=production\n');
  console.log('✓ Created production .env file');
} catch (error) {
  console.error('Error creating .env file:', error.message);
}

// Build the client
console.log('\nBuilding the client application...');
try {
  // Check if client directory exists
  if (!fs.existsSync(path.join(__dirname, 'client'))) {
    throw new Error('Client directory not found');
  }

  // Install client dependencies if needed
  console.log('Installing client dependencies...');
  execSync('cd client && npm install', { stdio: 'inherit' });
  
  // Build the client
  console.log('Running client build...');
  execSync('cd client && npm run build', { stdio: 'inherit' });
  
  // Verify the build was successful
  const clientDistDir = path.join(__dirname, 'client', 'dist');
  const clientIndexHtml = path.join(clientDistDir, 'index.html');
  
  if (fs.existsSync(clientDistDir) && fs.existsSync(clientIndexHtml)) {
    console.log('✓ Client build successful');
    
    // Create dist/client directory for deployment
    console.log('Copying client build to deployment location...');
    const distDir = path.join(__dirname, 'dist');
    const distClientDir = path.join(distDir, 'client');
    
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    
    if (!fs.existsSync(distClientDir)) {
      fs.mkdirSync(distClientDir, { recursive: true });
    }
    
    // Copy client build to dist/client
    execSync(`cp -r ${clientDistDir}/* ${distClientDir}/`, { stdio: 'inherit' });
    console.log('✓ Copied client build to dist/client');
  } else {
    throw new Error('Client build failed - build artifacts not found');
  }
} catch (error) {
  console.error('❌ Error building client:', error.message);
  console.error('Deployment may fail or serve backend only');
}

// Create a file to indicate the build is ready for deployment
console.log('\nFinalizing deployment preparation...');
try {
  fs.writeFileSync('deploy-ready.txt', `Deployment prepared at ${new Date().toISOString()}\n`);
  console.log('✓ Created deployment marker file');
} catch (error) {
  console.error('Error creating deployment marker file:', error.message);
}

console.log('\n=================================================');
console.log('DEPLOYMENT PREPARATION COMPLETE');
console.log('=================================================');
console.log('The application is now ready for deployment.');
console.log('To deploy:');
console.log('1. Go to the Deployments tab in Replit');
console.log('2. Click "Deploy"');
console.log('3. Wait for the deployment to complete');
console.log('=================================================');

// Exit with success code
process.exit(0);