import { Router } from 'express';
import { BillingService } from './billing-service';
import { logger } from '../utils/logger';

const billingRouter = Router();
const billingService = new BillingService();

// Log all billing requests
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
    const bills = await billingService.getAllBills();
    res.json(bills);
  } catch (error) {
    logger.error('[BILLING] Error fetching bills:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to fetch bills'
    });
  }
});

// Generate bill
billingRouter.post('/generate/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    logger.info('[BILLING] Generating bill for appointment:', appointmentId);

    if (!appointmentId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Appointment ID is required'
      });
    }

    const bill = await billingService.generateBill(appointmentId);
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
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Payment ID is required'
      });
    }

    const isValid = await billingService.verifyPayment(paymentId);
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
billingRouter.get('/bills/:billId', async (req, res) => {
  try {
    const { billId } = req.params;
    logger.info('[BILLING] Fetching bill:', billId);

    const bill = await billingService.getBill(billId);
    if (!bill) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Bill not found'
      });
    }

    res.json(bill);
  } catch (error) {
    logger.error('[BILLING] Error fetching bill:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to fetch bill'
    });
  }
});

export { billingRouter };