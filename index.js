/**
 * MAIN DEPLOYMENT ENTRY POINT
 * 
 * This is the primary entry point that Replit uses for deployment.
 * For better reliability, we're using a standalone deployment server.
 */

console.log('Starting GroomIT Manager deployment...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

// Use the standalone deployment server instead of replit_deployment.js
import './deploy.js';