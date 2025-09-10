import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Set up middleware for production serving of static files with frontend prioritization
 * This version places the frontend routes BEFORE the API routes to ensure
 * the frontend is given priority in the routing hierarchy.
 */
export function setupFrontendFirstMiddleware(app: Express): void {
  // Possible client build paths in order of priority
  const possibleClientPaths = [
    path.join(__dirname, '../client/dist'),
    path.join(__dirname, '../dist/client'),
    path.join(__dirname, '../../client/dist'),
    path.join(process.cwd(), 'client/dist'),
    path.join(process.cwd(), 'dist/client')
  ];

  // Find the first valid client build path
  let clientBuildPath = '';
  for (const candidatePath of possibleClientPaths) {
    try {
      if (fs.existsSync(candidatePath) && fs.existsSync(path.join(candidatePath, 'index.html'))) {
        clientBuildPath = candidatePath;
        break;
      }
    } catch (error) {
      // Continue checking other paths
    }
  }

  if (!clientBuildPath) {
    logger.error('No valid client build path found. Static file serving disabled.');
    throw new Error('Frontend build not found. Cannot continue with frontend-first deployment.');
  }

  logger.info(`FRONTEND-FIRST MODE: Setting up production static file serving from: ${clientBuildPath}`);

  // Special API health check endpoint that bypasses frontend routing
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', mode: 'frontend-first', timestamp: new Date().toISOString() });
  });

  // Middleware to serve static files
  app.use(express.static(clientBuildPath, {
    // Use a longer max-age for static assets to improve performance
    maxAge: '1h'
  }));

  // CRITICAL: We need to add a catch-all route ONLY for non-API routes
  // This needs to happen BEFORE API routes are registered
  app.get(/^(?!\/api\/).*$/, (req: Request, res: Response) => {
    logger.info(`Frontend-first routing: Serving index.html for: ${req.path}`);
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });

  // At this point, only /api/* routes will make it past this middleware
  // and be handled by the API route handlers

  logger.info('Frontend-first middleware setup complete - frontend routes will have priority over API routes');
}