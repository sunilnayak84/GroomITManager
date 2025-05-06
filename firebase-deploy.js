
const { execSync } = require('child_process');

console.log('🔥 Firebase Deployment Helper 🔥');
console.log('==============================\n');

try {
  // Step 1: Build the client application
  console.log('📦 Step 1: Building client application...');
  execSync('cd client && npm run build', { stdio: 'inherit' });
  console.log('✅ Client build completed\n');

  // Step 2: Login to Firebase if needed
  console.log('🔑 Step 2: Checking Firebase login status...');
  try {
    const loginStatus = execSync('firebase projects:list', { stdio: 'pipe' }).toString();
    console.log('✅ Already logged into Firebase\n');
  } catch (error) {
    console.log('⚠️ Need to login to Firebase');
    execSync('firebase login', { stdio: 'inherit' });
    console.log('✅ Firebase login completed\n');
  }

  // Step 3: Deploy to Firebase Hosting
  console.log('🚀 Step 3: Deploying to Firebase Hosting...');
  execSync('firebase deploy --only hosting', { stdio: 'inherit' });
  
  console.log('\n✅ Deployment completed successfully!');
  console.log('Your app is now live at:');
  console.log('  📱 https://replit-5ac6a.web.app');
  console.log('  📱 https://replit-5ac6a.firebaseapp.com');
} catch (error) {
  console.error('\n❌ Deployment failed:', error.message);
  process.exit(1);
}
