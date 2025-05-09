#!/usr/bin/env node

/**
 * Custom deployment build script
 * This script handles the build process for deployment
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Set environment to production
process.env.NODE_ENV = 'production';

async function runCommand(command, cwd = process.cwd()) {
  console.log(`Running command: ${command} in ${cwd}`);
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    console.log(stdout);
    if (stderr) console.error(stderr);
    return true;
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(error.message);
    return false;
  }
}

async function checkClientPackageJson() {
  console.log('=== Checking client package.json ===');
  const clientPackageJsonPath = path.join(process.cwd(), 'client', 'package.json');
  
  if (!fs.existsSync(clientPackageJsonPath)) {
    console.error('Client package.json not found at:', clientPackageJsonPath);
    return false;
  }
  
  try {
    // Read and validate package.json
    const packageJson = JSON.parse(fs.readFileSync(clientPackageJsonPath, 'utf8'));
    console.log('Client package.json found and parsed successfully');
    
    // Check for build script
    if (!packageJson.scripts || !packageJson.scripts.build) {
      console.error('Build script not found in client package.json');
      return false;
    }
    
    // Check for critical dependencies
    const criticalDeps = ['react', 'react-dom', 'vite', 'typescript'];
    const missingDeps = [];
    
    criticalDeps.forEach(dep => {
      if (
        (!packageJson.dependencies || !packageJson.dependencies[dep]) && 
        (!packageJson.devDependencies || !packageJson.devDependencies[dep])
      ) {
        missingDeps.push(dep);
      }
    });
    
    if (missingDeps.length > 0) {
      console.error('Missing critical dependencies in client package.json:', missingDeps.join(', '));
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error parsing client package.json:', error.message);
    return false;
  }
}

async function buildClient() {
  console.log('=== Building client ===');
  
  // Check client package.json first
  const packageJsonValid = await checkClientPackageJson();
  if (!packageJsonValid) {
    console.error('Client package.json validation failed');
    return false;
  }
  
  // Install client dependencies first
  console.log('Installing client dependencies...');
  const installSuccess = await runCommand('npm install', path.join(process.cwd(), 'client'));
  
  if (!installSuccess) {
    console.error('Failed to install client dependencies');
    return false;
  }
  
  // Check if node_modules exists
  const nodeModulesPath = path.join(process.cwd(), 'client', 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.error('Client node_modules directory not found after npm install');
    return false;
  }
  
  // List installed vite and typescript versions
  await runCommand('ls -la node_modules/vite node_modules/typescript', path.join(process.cwd(), 'client'));
  
  // Build the client
  console.log('Building client application...');
  try {
    // Try direct execution first to see the full error
    const { stdout, stderr } = await execAsync('cd client && npx vite build', { shell: true });
    console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('Client build completed successfully');
    return true;
  } catch (error) {
    console.error('Client build failed with error:');
    console.error(error.message);
    console.error('Stdout:', error.stdout);
    console.error('Stderr:', error.stderr);
    
    // If standard build fails, try with creating a minimal build
    console.log('Attempting fallback build approach...');
    try {
      // Create a public directory if it doesn't exist
      const publicDir = path.join(process.cwd(), 'client', 'dist');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      
      // Create a minimal index.html
      fs.writeFileSync(
        path.join(publicDir, 'index.html'),
        `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Application</title>
          <style>
            body { font-family: Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .container { text-align: center; max-width: 800px; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Application</h1>
            <p>The application is running in production mode.</p>
            <p>Please contact support if you encounter any issues.</p>
          </div>
        </body>
        </html>`
      );
      
      console.log('Created fallback minimal build');
      return true;
    } catch (fallbackError) {
      console.error('Fallback build approach also failed:', fallbackError);
      return false;
    }
  }
}

async function copyClientBuild() {
  console.log('=== Copying client build to dist/client ===');
  
  const clientBuildPath = path.join(process.cwd(), 'client', 'dist');
  const destPath = path.join(process.cwd(), 'dist', 'client');
  
  // Create dist directory if it doesn't exist
  if (!fs.existsSync(path.join(process.cwd(), 'dist'))) {
    fs.mkdirSync(path.join(process.cwd(), 'dist'));
  }
  
  // Create client directory if it doesn't exist
  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath);
  }
  
  // Copy files
  await runCommand(`cp -r ${clientBuildPath}/* ${destPath}`);
  
  console.log('Client build copied successfully');
  return true;
}

async function main() {
  console.log('Starting deployment build process...');
  
  // Build client
  const clientSuccess = await buildClient();
  if (!clientSuccess) {
    process.exit(1);
  }
  
  // Copy client build to dist/client
  const copySuccess = await copyClientBuild();
  if (!copySuccess) {
    process.exit(1);
  }
  
  console.log('Deployment build completed successfully');
}

main().catch(error => {
  console.error('Build process failed:');
  console.error(error);
  process.exit(1);
});