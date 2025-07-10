
// ULTIMATE DEPLOYMENT ENTRY POINT
// This is the most reliable deployment solution

console.log('GroomIT Manager - Ultimate Deploy Starting...');

// Use the most reliable deployment server
import('./ultimate-deploy.js').catch(err => {
  console.error('Failed to start deployment server:', err);
  process.exit(1);
});
