import { Router, Request, Response, NextFunction } from 'express';
import { admin } from './firebase';
import * as Express from 'express';
import { staffManagementRouter } from './api/staff-management';
import { authenticateFirebase } from './middleware/auth';
import { billingRouter } from './api/billing-routes';
import { logger } from './utils/logger';

const router = Router();

// Register API routes
export async function registerRoutes(app: Express.Application) {
  // API request logging middleware first
  app.use('/api', (req, res, next) => {
    logger.info('[API] Request:', {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      headers: {
        authorization: req.headers.authorization ? 'Present' : 'Missing',
        'content-type': req.headers['content-type']
      }
    });
    next();
  });

  // Mount billing routes after logging but before authentication
  logger.info('[ROUTES] Registering billing routes');
  app.use('/api/billing', (req, res, next) => {
    logger.info('[BILLING] Incoming request:', {
      method: req.method,
      path: req.path,
      params: req.params
    });
    next();
  }, billingRouter);

  // All other API routes require authentication
  app.use('/api', authenticateFirebase);

  // Register general API routes
  logger.info('[ROUTES] Registering general API routes');
  app.use('/api', router);

  // Register staff management routes
  logger.info('[ROUTES] Registering staff management routes');
  app.use('/api/staff', staffManagementRouter);

  // API 404 handler
  app.use('/api/*', (req, res) => {
    logger.warn(`API route not found: ${req.method} ${req.path}`);
    res.status(404).json({
      error: 'Not Found',
      message: `API route ${req.method} ${req.path} not found`
    });
  });
}