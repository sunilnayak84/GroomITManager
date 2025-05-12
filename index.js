/**
 * MAIN DEPLOYMENT ENTRY POINT
 * 
 * This is the primary entry point that Replit uses for deployment.
 * It directs to server.js which prioritizes the frontend.
 */

// Set environment to production
process.env.NODE_ENV = 'production';

console.log('========================');
console.log('DEPLOYMENT ENTRY POINT');
console.log('========================');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT || 3000);

// Use the optimized server.js deployment file
import './server.js';