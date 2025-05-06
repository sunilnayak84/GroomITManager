
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🚀 Starting deployment process...');

async function deploy() {
  try {
    // Build the client application
    console.log('📦 Building client application...');
    const clientBuild = await execAsync('cd client && npm run build');
    console.log(clientBuild.stdout);
    console.log('✅ Client build complete');

    // Deploy to Firebase Hosting
    console.log('🚀 Deploying to Firebase Hosting...');
    const deployResult = await execAsync('firebase deploy --only hosting', {
      env: { ...process.env, FIREBASE_TOKEN: process.env.FIREBASE_TOKEN }
    });
    console.log(deployResult.stdout);

    console.log('✅ Deployment completed successfully!');
    console.log('Your app is now live on Firebase Hosting:');
    console.log('https://replit-5ac6a.web.app');
    console.log('https://replit-5ac6a.firebaseapp.com');
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deploy();
