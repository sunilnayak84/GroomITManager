/**
 * Public access middleware for testing WebSocket functionality
 * 
 * This middleware allows public access to specific endpoints while still
 * logging the request details.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function allowPublicAccess(req: Request, res: Response, next: NextFunction) {
  // Skip authentication for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Log the public access request
  logger.info(`[PUBLIC_ACCESS] Request allowed without authentication:`, {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Set a guest user property on the request
  req.user = {
    id: 'guest',
    uid: 'guest',
    email: 'guest@example.com',
    name: 'Guest User',
    displayName: 'Guest User',
    role: 'guest' as any,
    permissions: ['view_only']
  };

  next();
}