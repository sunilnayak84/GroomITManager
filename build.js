/**
 * PRE-DEPLOYMENT BUILD SCRIPT
 * 
 * This script prepares the application for deployment by:
 * 1. Building the client
 * 2. Creating a production-ready structure
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Function to execute a command
function runCommand(command, cwd = __dirname) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} in ${cwd}`);
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
      }
      console.log(`Stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

// Main build process
async function build() {
  try {
    console.log('Starting build process...');
    
    // Build client
    console.log('Building client...');
    await runCommand('npm run build', path.join(__dirname, 'client'));
    
    // Copy index.js and deploy.js to dist
    console.log('Setting up distribution...');
    fs.copyFileSync(
      path.join(__dirname, 'index.js'),
      path.join(distDir, 'index.js')
    );
    fs.copyFileSync(
      path.join(__dirname, 'deploy.js'),
      path.join(distDir, 'deploy.js')
    );
    
    // Create package.json for dist
    console.log('Creating production package.json...');
    const packageJson = {
      "name": "groomit-manager-deployment",
      "version": "1.0.0",
      "type": "module",
      "dependencies": {
        "express": "^4.18.2"
      }
    };
    
    fs.writeFileSync(
      path.join(distDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Create client directory in dist
    const distClientDir = path.join(distDir, 'client');
    if (!fs.existsSync(distClientDir)) {
      fs.mkdirSync(distClientDir, { recursive: true });
    }
    
    // Copy client build to dist/client
    console.log('Copying client build...');
    fs.cpSync(
      path.join(__dirname, 'client', 'dist'),
      distClientDir,
      { recursive: true }
    );
    
    console.log('Build process completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
build();