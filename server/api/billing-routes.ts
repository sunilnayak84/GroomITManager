import { Router } from 'express';
import { auth } from 'firebase-admin';
import { db } from '../firebase';
import { authenticateFirebase, requireRole } from '../middleware/auth';
import { BillingService } from './billing-service';

const router = Router();
const billingService = new BillingService();

router.post('/api/billing/bills/:appointmentId', authenticateFirebase, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const bill = await billingService.generateBillFromAppointment(appointmentId);
    res.json(bill);
  } catch (error) {
    console.error('[BILLING] Error generating bill:', error);
    res.status(500).json({
      error: 'Failed to generate bill',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/api/billing/bills', authenticateFirebase, async (req, res) => {
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

router.post('/api/billing/payments/verify/:paymentId', authenticateFirebase, async (req, res) => {
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