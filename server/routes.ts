import { Router, Request, Response, NextFunction } from 'express';
import { admin } from './firebase';
import * as Express from 'express';
import { staffManagementRouter } from './api/staff-management';
import { authenticateFirebase, requireRole } from './middleware/auth';
import { billingRouter } from './api/billing-routes';

const router = Router();

// Register API routes
export function registerRoutes(app: Express.Application) {
  // Debug middleware for all API requests
  app.use((req, res, next) => {
    console.log('[API] Incoming request:', {
      method: req.method,
      path: req.path,
      url: req.url,
      baseUrl: req.baseUrl,
      originalUrl: req.originalUrl,
      params: req.params,
      route: req.route,
      headers: {
        authorization: req.headers.authorization ? 'Present' : 'Missing',
        'content-type': req.headers['content-type']
      }
    });
    next();
  });

  // Register billing routes first with authentication
  console.log('[ROUTES] Registering billing routes...');
  app.use('/api/billing', (req, res, next) => {
    console.log('[BILLING MIDDLEWARE] Request intercepted:', {
      method: req.method,
      path: req.path,
      url: req.url,
      originalUrl: req.originalUrl,
      params: req.params,
      headers: {
        authorization: req.headers.authorization ? 'Present' : 'Missing'
      }
    });
    next();
  }, authenticateFirebase, billingRouter);

  // Then register other API routes
  app.use('/api', router);

  // Debug 404 handler for API routes
  app.use('/api/*', (req, res) => {
    console.log('[API] 404 Not Found:', {
      method: req.method,
      url: req.url,
      path: req.path,
      originalUrl: req.originalUrl
    });
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.originalUrl} not found`
    });
  });
}