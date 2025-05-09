// Deployment entry point for Replit
// This file ensures the correct production server is loaded
process.env.NODE_ENV = 'production';

// Use the simple deployment file that focuses just on serving static files
import('./simple-deploy.js').catch(err => {
  console.error('Failed to start simple deployment server:', err);
  console.error('Error details:', err.stack);
  process.exit(1);
});
