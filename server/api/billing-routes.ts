import { Router } from 'express';
import { BillingService } from './billing-service';
import { logger } from '../utils/logger';
import { authenticateFirebase } from '../middleware/auth';

const billingRouter = Router();

// Apply authentication middleware to all billing routes
billingRouter.use(authenticateFirebase);
const billingService = new BillingService();

// Add authentication middleware to all billing routes
billingRouter.use(authenticateFirebase);

// Add health check endpoint
billingRouter.get('/health', (req, res) => {
  logger.info('[BILLING] Health check requested');
  res.json({ status: 'ok', service: 'billing' });
});

// Log all billing requests with detailed information
billingRouter.use((req, res, next) => {
  logger.info('[BILLING] Request:', {
    method: req.method,
    path: req.path,
    params: req.params,
    query: req.query,
    body: req.body,
    headers: {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      'content-type': req.headers['content-type']
    }
  });
  next();
});

// Get all bills
billingRouter.get('/bills', async (req, res) => {
  try {
    logger.info('[BILLING] Fetching all bills');
    let bills = await billingService.getAllBills();
    // Convert date fields and ensure customer name is included
    bills = bills.map(bill => ({
      ...bill,
      customerName: bill.customerName || '',
      createdAt: bill.createdAt?.toDate ? bill.createdAt.toDate() : bill.createdAt,
      updatedAt: bill.updatedAt?.toDate ? bill.updatedAt.toDate() : bill.updatedAt
    }));
    logger.info('[BILLING] Successfully fetched bills:', { count: bills.length });
    res.json(bills);
  } catch (error) {
    logger.error('[BILLING] Error fetching bills:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to fetch bills'
    });
  }
});

// Get bill by ID
billingRouter.get('/bill/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.uid;

    logger.info('Fetching bill with ID:', { billId: id, user: userId });
    logger.info('[BILLING] Fetching bill:');

    const bill = await billingService.getBillById(id);

    if (!bill) {
      logger.warn('[BILLING] Bill not found:', { billId: id });
      return res.status(404).json({
        error: 'Not Found',
        message: `Bill with ID ${id} not found`
      });
    }

    // Convert date fields if necessary and ensure customer name is included
    if (bill.createdAt?.toDate) {
      bill.createdAt = bill.createdAt.toDate();
    }
    if (bill.updatedAt?.toDate) {
      bill.updatedAt = bill.updatedAt.toDate();
    }

    // Ensure customer name is available
    bill.customerName = bill.customerName || '';


    logger.info('[BILLING] Successfully fetched bill:', { billId: id });
    res.json(bill);
  } catch (error) {
    logger.error('[BILLING] Error fetching bill:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to fetch bill'
    });
  }
});

// Get bill by ID
billingRouter.get('/bills/:billId', async (req, res) => {
  try {
    const { billId } = req.params;
    logger.info('[BILLING] Fetching bill by ID:', billId);

    const bill = await billingService.getBillById(billId);

    if (!bill) {
      logger.warn('[BILLING] Bill not found:', billId);
      return res.status(404).json({
        error: 'Not Found',
        message: 'Bill not found'
      });
    }

    logger.info('[BILLING] Successfully fetched bill:', billId);
    res.json(bill);
  } catch (error) {
    logger.error('[BILLING] Error fetching bill by ID:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to fetch bill'
    });
  }
});

// Generate bill for appointment
billingRouter.post('/generate/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    logger.info('[BILLING] Starting bill generation for appointment:', appointmentId);

    if (!appointmentId || typeof appointmentId !== 'string' || appointmentId.trim() === '') {
      logger.warn('[BILLING] Missing or invalid appointment ID in request');
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid appointment ID is required'
      });
    }

    const bill = await billingService.generateBill(appointmentId.trim());
    logger.info('[BILLING] Bill generated successfully:', { billId: bill.id });
    res.json(bill);
  } catch (error) {
    logger.error('[BILLING] Error generating bill:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate bill';
    const statusCode = errorMessage.includes('not found') ? 404 : 
                      errorMessage.includes('Invalid') ? 400 : 500;

    res.status(statusCode).json({
      error: statusCode === 404 ? 'Not Found' : 
            statusCode === 400 ? 'Bad Request' : 'Internal Server Error',
      message: errorMessage
    });
  }
});

// Verify payment
billingRouter.post('/verify-payment', async (req, res) => {
  try {
    const { paymentId } = req.body;
    logger.info('[BILLING] Verifying payment:', paymentId);

    if (!paymentId) {
      logger.warn('[BILLING] Missing payment ID in request');
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Payment ID is required'
      });
    }

    const isValid = await billingService.verifyPayment(paymentId);
    logger.info('[BILLING] Payment verification result:', { paymentId, isValid });
    res.json({ success: isValid });
  } catch (error) {
    logger.error('[BILLING] Payment verification failed:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to verify payment'
    });
  }
});

// Get bill by ID
billingRouter.get('/bill/:id', async (req, res) => {
  try {
    const billId = req.params.id;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    logger.info(`Fetching bill with ID: ${billId}`, { 
      user: userId,
      billId
    });

    const billingService = new BillingService();
    const bill = await billingService.getBillById(billId);

    if (!bill) {
      logger.warn(`Bill not found with ID: ${billId}`, {
        user: userId,
        billId
      });
      return res.status(404).json({ error: 'Bill not found' });
    }

    return res.json(bill);
  } catch (error) {
    logger.error('Error fetching bill by ID', { 
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    return res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

export { billingRouter };