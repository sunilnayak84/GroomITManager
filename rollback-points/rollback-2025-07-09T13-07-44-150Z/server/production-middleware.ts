import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Set up middleware for production serving of static files
 */
export function setupProductionMiddleware(app: Express): void {
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
    return;
  }

  logger.info(`Setting up production static file serving from: ${clientBuildPath}`);

  // Middleware to serve static files
  app.use(express.static(clientBuildPath));

  // Middleware to handle client-side routing
  app.use('*', (req: Request, res: Response, next: NextFunction) => {
    // Skip API routes
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }
    
    // Send the index.html for all other routes to support client-side routing
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}