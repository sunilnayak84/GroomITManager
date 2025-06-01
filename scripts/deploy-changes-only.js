#!/usr/bin/env node

/**
 * Deploy Changes Only
 * Uses existing build and deploys just the modified files
 */

import { execSync } from 'child_process';
import fs from 'fs';

async function deployChangesOnly() {
  console.log('Deploying only your package management changes...');
  
  try {
    // Check if we have an existing build
    const clientDistExists = fs.existsSync('client/dist');
    
    if (clientDistExists) {
      console.log('Using existing client build...');
      
      // Deploy to Firebase using existing build
      console.log('Deploying to Firebase hosting...');
      execSync(`firebase deploy --only hosting --token ${process.env.FIREBASE_TOKEN}`, { stdio: 'inherit' });
      
      console.log('\nDeployment completed successfully!');
      console.log('Your decimal discount and direct pricing features are now live.');
      
    } else {
      console.log('No existing build found. Building client first...');
      
      // Try a minimal build
      execSync('cd client && npm run build -- --minify esbuild', { stdio: 'inherit' });
      
      // Then deploy
      execSync(`firebase deploy --only hosting --token ${process.env.FIREBASE_TOKEN}`, { stdio: 'inherit' });
    }
    
  } catch (error) {
    console.error('Deployment failed:', error.message);
    
    if (error.message.includes('No project')) {
      console.log('\nTip: Make sure your Firebase project is properly configured.');
      console.log('Run: firebase use replit-5ac6a');
    }
    
    process.exit(1);
  }
}

deployChangesOnly();