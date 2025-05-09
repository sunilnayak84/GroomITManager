// Deployment entry point for Replit
// This file ensures the correct production server is loaded
process.env.NODE_ENV = 'production';

// Add global error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION - Application will attempt to continue!');
  console.error('Error details:', err);
  console.error('Stack trace:', err.stack);
  // Not exiting the process to allow for recovery
});

// Add global error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED PROMISE REJECTION - Application will attempt to continue!');
  console.error('Reason:', reason);
  // Not exiting the process to allow for recovery
});

console.log('Starting production server on port', process.env.PORT || 5000);
console.log('Environment:', process.env.NODE_ENV);

// Use the simple deployment file that focuses just on serving static files
import('./simple-deploy.js').catch(err => {
  console.error('Failed to start simple deployment server:', err);
  console.error('Error details:', err.stack);
  process.exit(1);
});
