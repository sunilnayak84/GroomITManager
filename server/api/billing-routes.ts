import { Router } from 'express';
import { BillingService } from './billing-service';
import { logger } from '../utils/logger';
import { authenticateFirebase } from '../middleware/auth';

const billingRouter = Router();
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
    const bills = await billingService.getAllBills();
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

// Generate bill for appointment
billingRouter.post('/generate/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    logger.info('[BILLING] Starting bill generation for appointment:', appointmentId);

    if (!appointmentId) {
      logger.warn('[BILLING] Missing appointment ID in request');
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Appointment ID is required'
      });
    }

    const bill = await billingService.generateBill(appointmentId);
    logger.info('[BILLING] Bill generated successfully:', { billId: bill.id });
    res.json(bill);
  } catch (error) {
    logger.error('[BILLING] Error generating bill:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to generate bill'
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

export { billingRouter };