import { Router } from 'express';
import { BillingService } from './billing-service';
import { admin } from '../firebase';
import { authenticateFirebase } from '../middleware/auth';

const billingRouter = Router();
const billingService = new BillingService();

// Debug middleware to log all billing requests
billingRouter.use((req, res, next) => {
  console.log('[BILLING] Request received:', {
    method: req.method,
    path: req.path,
    params: req.params,
    body: req.body,
    url: req.url,
    originalUrl: req.originalUrl,
    headers: {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      'content-type': req.headers['content-type']
    }
  });
  next();
});

// Generate bill
billingRouter.post('/generate/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    console.log('[BILLING] Generating bill for appointment:', appointmentId);

    if (!appointmentId) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Appointment ID is required' 
      });
    }

    const bill = await billingService.generateBill(appointmentId);
    console.log('[BILLING] Bill generated successfully:', bill);

    res.json(bill);
  } catch (error: any) {
    console.error('[BILLING] Error generating bill:', error);
    const statusCode = error?.message?.includes('not found') ? 404 : 500;
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
    console.log('[BILLING] Verifying payment:', paymentId);

    if (!paymentId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Payment ID is required'
      });
    }

    const isValid = await billingService.verifyPayment(paymentId);
    console.log('[BILLING] Payment verification result:', { isValid, paymentId });

    res.json({ success: isValid });
  } catch (error) {
    console.error('[BILLING] Payment verification failed:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to verify payment'
    });
  }
});

// Get payment details
billingRouter.get('/payment/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('[BILLING] Fetching payment details:', orderId);

    const paymentDoc = await admin.firestore()
      .collection('payments')
      .doc(orderId)
      .get();

    if (!paymentDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Payment not found'
      });
    }

    res.json({
      id: paymentDoc.id,
      ...paymentDoc.data()
    });
  } catch (error) {
    console.error('[BILLING] Error fetching payment:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to fetch payment details'
    });
  }
});

// Get bill route
billingRouter.get('/bills/:billId', async (req, res) => {
  try {
    const { billId } = req.params;
    console.log('[BILLING] Fetching bill:', billId);

    const billDoc = await admin.firestore().collection('bills').doc(billId).get();

    if (!billDoc.exists) {
      return res.status(404).json({ 
        error: 'Not Found',
        message: 'Bill not found' 
      });
    }

    res.json({ id: billDoc.id, ...billDoc.data() });
  } catch (error) {
    console.error('[BILLING] Error fetching bill:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to fetch bill'
    });
  }
});

export { billingRouter };