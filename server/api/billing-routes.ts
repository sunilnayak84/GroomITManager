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
    console.log('[BILLING] Generating bill for appointment:', appointmentId);

    // Check if appointment exists first
    const appointmentDoc = await db.collection('appointments').doc(appointmentId).get();
    if (!appointmentDoc.exists) {
      console.log('[BILLING] Appointment not found:', appointmentId);
      return res.status(404).json({
        error: 'Appointment not found',
        message: `Appointment with ID ${appointmentId} does not exist`
      });
    }

    const appointmentData = appointmentDoc.data();
    console.log('[BILLING] Appointment data:', appointmentData);

    // Check if bill already exists for this appointment
    const existingBillsQuery = await db.collection('bills')
      .where('appointmentId', '==', appointmentId)
      .get();

    if (!existingBillsQuery.empty) {
      const existingBill = existingBillsQuery.docs[0].data();
      console.log('[BILLING] Bill already exists:', existingBillsQuery.docs[0].id);
      return res.status(400).json({
        error: 'Bill already exists',
        message: 'A bill has already been generated for this appointment',
        billId: existingBillsQuery.docs[0].id
      });
    }

    const bill = await billingService.generateBill(appointmentId);
    console.log('[BILLING] Generated bill successfully:', { appointmentId, billId: bill.id });
    res.json(bill);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BILLING] Error generating bill:', { error: errorMessage, appointmentId: req.params.appointmentId });

    // Determine status code based on error message
    const statusCode = errorMessage.includes('not found') ? 404 : 
                      errorMessage.includes('uncompleted') ? 400 : 500;

    res.status(statusCode).json({
      error: 'Failed to generate bill',
      message: errorMessage
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