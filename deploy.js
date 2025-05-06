
const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting deployment process...');

try {
  // Build the client application
  console.log('📦 Building client application...');
  execSync('cd client && npm run build', { stdio: 'inherit' });
  console.log('✅ Client build complete');

  // Login to Firebase (if not already logged in)
  try {
    console.log('🔑 Checking Firebase login status...');
    execSync('firebase projects:list', { stdio: 'inherit' });
  } catch (error) {
    console.log('🔑 Please log in to Firebase:');
    execSync('firebase login', { stdio: 'inherit' });
  }

  // Deploy to Firebase
  console.log('🚀 Deploying to Firebase...');
  execSync('firebase deploy --only hosting', { stdio: 'inherit' });

  console.log('✅ Deployment completed successfully!');
  console.log('Your app is now live on Firebase Hosting.');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
