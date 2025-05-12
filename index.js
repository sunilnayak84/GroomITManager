/**
 * MAIN DEPLOYMENT ENTRY POINT
 * 
 * This is the primary entry point that Replit uses for deployment.
 * We are now directly using frontend-only server to guarantee the frontend is served.
 */

// Set environment to production
process.env.NODE_ENV = 'production';

console.log('========================');
console.log('STARTING DEPLOYMENT');
console.log('========================');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT || 3000);
console.log('Using frontend-only server');

// Use the frontend-only server that bypasses any backend API
import './serve-frontend.js';