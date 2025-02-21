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

    // Check if appointment exists first
    const appointmentDoc = await db.collection('appointments').doc(appointmentId).get();
    if (!appointmentDoc.exists) {
      return res.status(404).json({
        error: 'Appointment not found',
        message: `Appointment with ID ${appointmentId} does not exist`
      });
    }

    // Check if bill already exists for this appointment
    const existingBillsQuery = await db.collection('bills')
      .where('appointmentId', '==', appointmentId)
      .get();

    if (!existingBillsQuery.empty) {
      const existingBill = existingBillsQuery.docs[0].data();
      return res.status(400).json({
        error: 'Bill already exists',
        message: 'A bill has already been generated for this appointment',
        billId: existingBillsQuery.docs[0].id
      });
    }

    const bill = await billingService.generateBill(appointmentId);
    console.log('[BILLING] Generated bill:', { appointmentId, billId: bill.id });
    res.json(bill);
  } catch (error) {
    console.error('[BILLING] Error generating bill:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
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