
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🚀 Starting deployment process...');

async function deploy() {
  try {
    // Build the client application
    console.log('📦 Building client application...');
    await execAsync('cd client && npm run build', { stdio: 'inherit' });
    console.log('✅ Client build complete');

    // Login to Firebase (if not already logged in)
    try {
      console.log('🔑 Checking Firebase login status...');
      await execAsync('firebase projects:list', { stdio: 'inherit' });
    } catch (error) {
      console.log('🔑 Please log in to Firebase:');
      await execAsync('firebase login', { stdio: 'inherit' });
    }

    // Deploy to Firebase
    console.log('🚀 Deploying to Firebase...');
    await execAsync('firebase deploy --only hosting', { stdio: 'inherit' });

    console.log('✅ Deployment completed successfully!');
    console.log('Your app is now live on Firebase Hosting.');
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deploy();
