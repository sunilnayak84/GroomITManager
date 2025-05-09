// Deployment entry point for Replit
// This file ensures the correct production server is loaded
process.env.NODE_ENV = 'production';

// Import the deployment-specific server implementation
import('./replit_deployment.js').catch(err => {
  console.error('Failed to start deployment server:', err);
  process.exit(1);
});
