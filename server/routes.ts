import { Router, Request, Response, NextFunction } from 'express';
import { admin } from './firebase';
import * as Express from 'express';
import { staffManagementRouter } from './api/staff-management';
import { authenticateFirebase } from './middleware/auth';
import { billingRouter } from './api/billing-routes';
import { authRouter } from './api/auth-routes';
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

  // Debug routes (without auth for fixing)
  logger.info('[ROUTES] Registering debug routes');
  app.use('/api/debug', async (req: Request, res: Response) => {
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
      
      if (req.path === '/users' && req.method === 'GET') {
        // Get all users
        const usersSnapshot = await admin.firestore().collection('users').get();
        const users = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        return res.json(users);
      }
      
      if (req.path === '/fix-test-groomer' && req.method === 'POST') {
        // Fix Test Groomer by updating it to Siddharth's correct name
        const testGroomerSnapshot = await admin.firestore().collection('users')
          .where('uid', '==', 'bEWrvBuCjcaS81IPqzBpApXnRyy1').get();
        
        if (testGroomerSnapshot.empty) {
          return res.status(404).json({ error: 'Test Groomer user not found' });
        }
        
        const testGroomerDoc = testGroomerSnapshot.docs[0];
        const testGroomerData = testGroomerDoc.data();
        
        logger.info('[DEBUG] Current Test Groomer data:', {
          id: testGroomerDoc.id,
          name: testGroomerData.name,
          displayName: testGroomerData.displayName,
          email: testGroomerData.email
        });
        
        // Update to Siddharth's correct name
        const correctName = 'Siddharth Basodiya';
        const correctEmail = 'siddharth@groomery.in';
        await admin.firestore().collection('users').doc(testGroomerDoc.id).update({
          name: correctName,
          displayName: correctName,
          email: correctEmail,
          isGroomer: true,
          role: 'staff',
          specialties: ['groomer'],
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          fixApplied: true,
          fixDate: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return res.json({
          success: true,
          message: 'Test Groomer updated to Siddharth Basodiya successfully',
          before: {
            name: testGroomerData.name,
            displayName: testGroomerData.displayName,
            email: testGroomerData.email
          },
          after: {
            name: correctName,
            displayName: correctName,
            email: correctEmail
          }
        });
      }
      
      if (req.path === '/fix-siddharth' && req.method === 'POST') {
        // Fix Siddharth's name
        const usersSnapshot = await admin.firestore().collection('users')
          .where('email', '==', 'siddharth@groomery.in').get();
        
        if (usersSnapshot.empty) {
          return res.status(404).json({ error: 'Siddharth not found' });
        }
        
        const siddharthDoc = usersSnapshot.docs[0];
        const siddharthData = siddharthDoc.data();
        
        logger.info('[DEBUG] Current Siddharth data:', {
          id: siddharthDoc.id,
          name: siddharthData.name,
          displayName: siddharthData.displayName,
          email: siddharthData.email
        });
        
        // Update to correct name
        const correctName = 'Siddharth Basodiya';
        await admin.firestore().collection('users').doc(siddharthDoc.id).update({
          name: correctName,
          displayName: correctName,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return res.json({
          success: true,
          message: 'Siddharth name updated successfully',
          before: {
            name: siddharthData.name,
            displayName: siddharthData.displayName
          },
          after: {
            name: correctName,
            displayName: correctName
          }
        });
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

  // All other API routes require authentication
  app.use('/api', authenticateFirebase);

  // Register general API routes
  logger.info('[ROUTES] Registering general API routes');
  app.use('/api', router);

  // Register authentication routes
  logger.info('[ROUTES] Registering authentication routes');
  app.use('/api/auth', authRouter);

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


  // API 404 handler
  app.use('/api/*', (req, res) => {
    logger.warn(`API route not found: ${req.method} ${req.path}`);
    res.status(404).json({
      error: 'Not Found',
      message: `API route ${req.method} ${req.path} not found`
    });
  });
}