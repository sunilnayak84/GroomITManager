
// PRODUCTION DEPLOYMENT ENTRY POINT
// This runs a reliable production server for Replit deployments

console.log('GroomIT Manager starting production server...');

// Use dynamic import for ES module compatibility
import('./simple-production-server.js').catch(err => {
  console.error('Failed to start production server:', err);
  process.exit(1);
});
