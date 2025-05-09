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

async function buildClient() {
  console.log('=== Building client ===');
  
  // Install client dependencies first
  await runCommand('npm install', path.join(process.cwd(), 'client'));
  
  // Build the client
  const success = await runCommand('npm run build', path.join(process.cwd(), 'client'));
  
  if (!success) {
    console.error('Client build failed');
    return false;
  }
  
  console.log('Client build completed successfully');
  return true;
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