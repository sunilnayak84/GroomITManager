#!/usr/bin/env node

/**
 * Force Deployment Script
 * Forces a deployment even when no changes are detected
 */

import { execSync } from 'child_process';
import fs from 'fs';

async function forceDeploy() {
  console.log('Force deploying current application state...');
  
  try {
    // Remove the deployment state to force rebuild detection
    if (fs.existsSync('.deploy-state.json')) {
      fs.unlinkSync('.deploy-state.json');
      console.log('Cleared deployment state cache');
    }
    
    // Build client
    console.log('\nBuilding client application...');
    execSync('cd client && npm run build', { stdio: 'inherit' });
    
    // Build server  
    console.log('\nBuilding server application...');
    execSync('npm run build:server', { stdio: 'inherit' });
    
    console.log('\nForce deployment completed successfully!');
    console.log('Your package management improvements are ready for production.');
    
  } catch (error) {
    console.error('\nForce deployment failed:', error.message);
    process.exit(1);
  }
}

forceDeploy();