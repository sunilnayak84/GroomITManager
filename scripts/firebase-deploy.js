#!/usr/bin/env node

/**
 * Firebase Deployment Script
 * Deploys your application using Firebase hosting and functions
 */

import { execSync } from 'child_process';

async function firebaseDeploy() {
  console.log('Starting Firebase deployment...');
  
  try {
    // Build the client application
    console.log('\nBuilding client application...');
    execSync('cd client && npm run build', { stdio: 'inherit' });
    
    // Deploy to Firebase using the token
    console.log('\nDeploying to Firebase...');
    const deployCmd = process.env.FIREBASE_TOKEN 
      ? `firebase deploy --token ${process.env.FIREBASE_TOKEN}`
      : 'firebase deploy';
    
    execSync(deployCmd, { stdio: 'inherit' });
    
    console.log('\nFirebase deployment completed successfully!');
    console.log('Your package management improvements are now live.');
    
  } catch (error) {
    console.error('\nFirebase deployment failed:', error.message);
    
    if (error.message.includes('authentication')) {
      console.log('\nAuthentication issue detected.');
      console.log('Please ensure your Firebase token is properly configured.');
    }
    
    if (error.message.includes('project')) {
      console.log('\nProject configuration issue detected.');
      console.log('Please verify your Firebase project settings.');
    }
    
    process.exit(1);
  }
}

firebaseDeploy();