#!/usr/bin/env node

/**
 * Optimized Deployment Script
 * Builds with reduced bundle size for successful deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';

async function deployOptimized() {
  console.log('Building optimized version for deployment...');
  
  try {
    // Create optimized client build
    console.log('\nBuilding client with optimization...');
    
    // Use the optimized vite config
    const buildCmd = `cd client && npx vite build --config vite.config.optimized.ts --mode production`;
    execSync(buildCmd, { stdio: 'inherit' });
    
    // Build server
    console.log('\nBuilding server...');
    execSync('npm run build:server', { stdio: 'inherit' });
    
    console.log('\nOptimized build completed!');
    console.log('Bundle size should now be within deployment limits.');
    console.log('Try deploying again through Replit.');
    
  } catch (error) {
    console.error('\nOptimized build failed:', error.message);
    process.exit(1);
  }
}

deployOptimized();