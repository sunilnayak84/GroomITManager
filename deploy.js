
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

    // Check Firebase project
    try {
      console.log('🔍 Checking Firebase project...');
      const projectList = await execAsync('firebase projects:list');
      console.log('Current Firebase projects:');
      console.log(projectList.stdout);
    } catch (error) {
      console.log('🔑 Please log in to Firebase:');
      await execAsync('firebase login', { stdio: 'inherit' });
    }

    // Deploy to Firebase Hosting
    console.log('🚀 Deploying to Firebase Hosting...');
    const deployResult = await execAsync('firebase deploy --only hosting');
    console.log(deployResult.stdout);

    console.log('✅ Deployment completed successfully!');
    console.log('Your app is now live on Firebase Hosting.');
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deploy();
