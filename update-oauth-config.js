
const { execSync } = require('child_process');
const readline = require('readline');
const open = require('open');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('======= Firebase OAuth Redirect URI Configuration Helper =======');
console.log('\nThis script will help you fix the redirect_uri_mismatch error');
console.log('\nFollow these steps:');

console.log('\n1. Opening Google Cloud Console in your browser...');

// Open the Google Cloud Console OAuth consent screen
const oauthConsentUrl = 'https://console.cloud.google.com/apis/credentials/consent';
open(oauthConsentUrl);

console.log('\n2. In the opened browser:');
console.log('   - Make sure you\'re in the correct project (replit-5ac6a)');
console.log('   - Navigate to the "Credentials" section in the sidebar');
console.log('   - Find and edit your OAuth 2.0 Client ID');
console.log('   - Add the following Authorized redirect URIs:');
console.log('     • https://replit-5ac6a.firebaseapp.com/__/auth/handler');
console.log('     • https://<your-replit-domain>/__/auth/handler');
console.log('     • http://localhost:9005');

rl.question('\nHave you added the redirect URIs? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    console.log('\nGreat! Now let\'s deploy your app to Firebase...');
    
    try {
      // Run the deployment
      console.log('\nDeploying to Firebase...');
      execSync('firebase deploy --only hosting', { stdio: 'inherit' });
      
      console.log('\n✅ Deployment completed!');
      console.log('\nYour app should now be accessible at:');
      console.log('https://replit-5ac6a.web.app');
      console.log('https://replit-5ac6a.firebaseapp.com');
    } catch (error) {
      console.error('\n❌ Deployment failed:', error.message);
    }
  } else {
    console.log('\nPlease complete the OAuth configuration before deploying.');
  }
  
  rl.close();
});
