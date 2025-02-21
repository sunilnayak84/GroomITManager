import { Router } from 'express';
import { admin } from '../firebase';
import { authenticateFirebase } from '../middleware/auth';
import { BillingService } from './billing-service';

const router = Router();
const db = admin.firestore();
const billingService = new BillingService();

// Log all billing-related requests
router.use((req, res, next) => {
  console.log('[BILLING] Incoming request:', {
    method: req.method,
    path: req.path,
    params: req.params,
    body: req.body
  });
  next();
});

router.post('/bills/:appointmentId', authenticateFirebase, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    console.log('[BILLING] Starting bill generation for appointment:', appointmentId);

    // Check if appointment exists first
    const appointmentDoc = await db.collection('appointments').doc(appointmentId).get();
    if (!appointmentDoc.exists) {
      console.log('[BILLING] Appointment not found:', appointmentId);
      return res.status(404).json({
        error: 'Appointment not found',
        message: `Appointment with ID ${appointmentId} does not exist`
      });
    }

    const bill = await billingService.generateBill(appointmentId);
    console.log('[BILLING] Generated bill successfully:', { appointmentId, billId: bill.id });
    res.json(bill);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BILLING] Error generating bill:', { 
      error: error instanceof Error ? error.message : error,
      appointmentId: req.params.appointmentId,
      stack: error instanceof Error ? error.stack : undefined
    });
    const statusCode = errorMessage.includes('not found') ? 404 : 
                      errorMessage.includes('uncompleted') ? 400 : 500;
    res.status(statusCode).json({
      error: 'Failed to generate bill',
      message: errorMessage
    });
  }
});

router.get('/bills', authenticateFirebase, async (req, res) => {
  try {
    const billsRef = db.collection('bills');
    const snapshot = await billsRef.get();
    const bills = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(bills);
  } catch (error) {
    console.error('[BILLING] Error fetching bills:', error);
    res.status(500).json({
      error: 'Failed to fetch bills',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/payments/verify/:paymentId', authenticateFirebase, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const isValid = await billingService.verifyPayment(paymentId);
    res.json({ valid: isValid });
  } catch (error) {
    console.error('[BILLING] Error verifying payment:', error);
    res.status(500).json({
      error: 'Failed to verify payment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export const billingRouter = router;