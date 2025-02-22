import { Router } from 'express';
import { RazorpayService } from './razorpay-service';
import { admin } from '../firebase';
import { authenticateFirebase } from '../middleware/auth';

const billingRouter = Router();
const razorpayService = new RazorpayService();

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

// Create payment order
billingRouter.post('/generate/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    console.log('[BILLING] Creating payment order for appointment:', appointmentId);

    if (!appointmentId) {
      return res.status(400).json({ 
        error: 'Bad Request',
        message: 'Appointment ID is required' 
      });
    }

    // First verify the appointment exists
    const appointmentRef = admin.firestore().collection('appointments').doc(appointmentId);
    const appointmentDoc = await appointmentRef.get();

    if (!appointmentDoc.exists) {
      console.log('[BILLING] Appointment not found:', appointmentId);
      return res.status(404).json({
        error: 'Not Found',
        message: 'Appointment not found'
      });
    }

    console.log('[BILLING] Found appointment:', appointmentDoc.data());

    const orderDetails = await razorpayService.createOrder(appointmentId);
    console.log('[BILLING] Payment order created:', orderDetails);

    res.json(orderDetails);
  } catch (error: any) {
    console.error('[BILLING] Error creating payment order:', error);
    const statusCode = error?.message?.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Verify payment
billingRouter.post('/verify-payment', async (req, res) => {
  try {
    const { paymentId, orderId, signature } = req.body;
    console.log('[BILLING] Verifying payment:', { paymentId, orderId });

    if (!paymentId || !orderId || !signature) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Payment details are incomplete'
      });
    }

    const isValid = razorpayService.verifyPayment(paymentId, orderId, signature);
    if (isValid) {
      await razorpayService.updatePaymentStatus(orderId, paymentId, signature);
    }
    console.log('[BILLING] Payment verification result:', { isValid, orderId });

    res.json({ success: true });
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