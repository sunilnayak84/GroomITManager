import { Router, Request, Response, NextFunction } from 'express';
import { admin } from './firebase';
import * as Express from 'express';
import { staffManagementRouter } from './api/staff-management';
import { authenticateFirebase } from './middleware/auth';
import { billingRouter } from './api/billing-routes';
import { notificationsRouter } from './api/notifications-routes';
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
  
  // IMPORTANT: Register notification routes BEFORE setting up the authentication middleware
  // This allows testing WebSocket functionality without authentication
  logger.info('[ROUTES] Registering notification routes');
  app.use('/api/notifications', notificationsRouter);

  // All other API routes require authentication
  app.use('/api', authenticateFirebase);

  // Register general API routes
  logger.info('[ROUTES] Registering general API routes');
  app.use('/api', router);

  // Register staff management routes
  logger.info('[ROUTES] Registering staff management routes');
  app.use('/api/staff', staffManagementRouter);
  
  // Register customer routes
  logger.info('[ROUTES] Registering customer routes');
  app.use('/api/customers/:id', authenticateFirebase, async (req: Request, res: Response) => {
    try {
      const customerId = req.params.id;
      if (!customerId) {
        return res.status(400).json({ error: 'Bad Request', message: 'Customer ID is required' });
      }
      
      logger.info('[CUSTOMERS] Fetching customer by ID:', { customerId });
      const customerDoc = await admin.firestore().collection('customers').doc(customerId).get();
      
      if (!customerDoc.exists) {
        logger.warn('[CUSTOMERS] Customer not found:', { customerId });
        return res.status(404).json({ error: 'Not Found', message: 'Customer not found' });
      }
      
      const customerData = customerDoc.data();
      logger.info('[CUSTOMERS] Customer found:', { customerId });
      return res.json({ id: customerDoc.id, ...customerData });
    } catch (error) {
      logger.error('[CUSTOMERS] Error fetching customer:', error);
      return res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // Debug routes
  logger.info('[ROUTES] Registering debug routes');
  app.use('/api/debug', authenticateFirebase, async (req: Request, res: Response) => {
    try {
      if (req.path.startsWith('/appointment/')) {
        const appointmentId = req.path.replace('/appointment/', '');
        if (!appointmentId) {
          return res.status(400).json({ error: 'Bad Request', message: 'Appointment ID is required' });
        }
        
        // Import the debug service
        const DebugService = await import('./api/debug-service');
        const debugInfo = await DebugService.default.debugAppointment(appointmentId);
        return res.json(debugInfo);
      }
      
      return res.status(404).json({ error: 'Not Found', message: 'Debug endpoint not found' });
    } catch (error) {
      logger.error('[DEBUG] Error in debug route:', error);
      return res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // API 404 handler
  app.use('/api/*', (req, res) => {
    logger.warn(`API route not found: ${req.method} ${req.path}`);
    res.status(404).json({
      error: 'Not Found',
      message: `API route ${req.method} ${req.path} not found`
    });
  });
}