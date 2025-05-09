/**
 * Deployment preparation script for GroomIT Manager
 * 
 * This script prepares the application for deployment by:
 * 1. Setting environment to production mode
 * 2. Ensuring the build output directory exists
 * 3. Setting up the correct entry point for Replit deployments
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== GroomIT Manager Deployment Preparation ===');

// Create necessary directories
console.log('Creating build directories...');
const distDir = path.join(rootDir, 'dist');
const distClientDir = path.join(distDir, 'client');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

if (!fs.existsSync(distClientDir)) {
  fs.mkdirSync(distClientDir, { recursive: true });
}

// Ensure the client has been built
const clientDistDir = path.join(rootDir, 'client', 'dist');
if (!fs.existsSync(clientDistDir)) {
  console.log('Client build not found, building now...');
  try {
    execSync('cd client && npm run build', { stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to build client:', error.message);
    process.exit(1);
  }
}

// Copy client build to dist/client (for compatibility)
console.log('Copying client build files...');
try {
  // Clean the dist/client directory first
  if (fs.existsSync(distClientDir)) {
    fs.rmSync(distClientDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distClientDir, { recursive: true });
  
  // Copy all files from client/dist to dist/client
  const files = fs.readdirSync(clientDistDir);
  for (const file of files) {
    const srcPath = path.join(clientDistDir, file);
    const destPath = path.join(distClientDir, file);
    
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      fs.cpSync(srcPath, destPath, { recursive: true });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  console.log('Client build files copied successfully');
} catch (error) {
  console.error('Failed to copy client build files:', error.message);
}

// Update package.json with correct main entry point
console.log('Ensuring package.json configuration is correct...');
try {
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!packageJson.main || packageJson.main !== 'index.js') {
    packageJson.main = 'index.js';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Updated package.json main field to index.js');
  }
} catch (error) {
  console.error('Failed to update package.json:', error.message);
}

// Create .env file for production
console.log('Creating production .env file...');
fs.writeFileSync(path.join(rootDir, '.env'), 'NODE_ENV=production\n');

// Create or update index.js as deployment entry point
console.log('Setting up deployment entry point...');
const entryPointJs = `// Deployment entry point for Replit
// This file ensures the correct production server is loaded
process.env.NODE_ENV = 'production';

// Import the deployment-specific server implementation
import('./replit_deployment.js').catch(err => {
  console.error('Failed to start deployment server:', err);
  process.exit(1);
});
`;

fs.writeFileSync(path.join(rootDir, 'index.js'), entryPointJs);

// Create a guide file for deployment
const deployInstructions = `# GroomIT Manager Deployment Instructions

## How to Deploy on Replit

1. ✅ First, build the application:
   \`\`\`
   npm run build
   \`\`\`

2. ✅ Prepare for deployment:
   \`\`\`
   node scripts/prepare-deploy.js
   \`\`\`

3. 🚀 Deploy using Replit's deployment feature:
   - Go to the "Deployments" tab
   - Click "Deploy"
   - Wait for the deployment to complete

## Server Configuration

The deployment uses:
- Node.js server on port 3000
- Static files from dist/client
- API routes from dist/index.js

## Troubleshooting

If you encounter issues:
- Make sure build completed successfully
- Check server logs for errors
- Verify Firebase configuration is correct

For further assistance, contact support.
`;

fs.writeFileSync(path.join(rootDir, 'DEPLOY-INSTRUCTIONS.md'), deployInstructions);

console.log('Deployment preparation complete!');
console.log('Next steps:');
console.log('1. If needed, run npm run build to rebuild the server and client');
console.log('2. Use the Replit Deployments feature to deploy your application');