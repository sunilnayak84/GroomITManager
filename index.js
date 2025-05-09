// This is the root entry point for Replit Deployments
// It will be used if no other entry point is specified

// Set to production mode
process.env.NODE_ENV = 'production';

// Import the production server
import('./server.js').catch(err => {
  console.error('Failed to start production server:', err);
  process.exit(1);
});