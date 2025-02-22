import { Router } from 'express';
import { admin } from '../firebase';
import Razorpay from 'razorpay';
import { BillingService } from './billing-service';

const billingRouter = Router();
const billingService = new BillingService();

// Debug middleware
billingRouter.use((req, res, next) => {
  console.log('[BILLING] Request:', {
    method: req.method,
    path: req.path,
    params: req.params
  });
  next();
});

// Generate bill route
billingRouter.post('/generate/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    if (!appointmentId) {
      return res.status(400).json({ error: 'Appointment ID is required' });
    }
    console.log('[BILLING] Generating bill for appointment:', appointmentId);
    console.log('[BILLING] Generating bill for appointment:', appointmentId);

    const bill = await billingService.generateBill(appointmentId);
    res.json(bill);
  } catch (error) {
    console.error('[BILLING] Error:', error);
    res.status(500).json({
      error: 'Failed to generate bill',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get bill route
billingRouter.get('/bills/:billId', async (req, res) => {
  try {
    const { billId } = req.params;
    const billDoc = await admin.firestore().collection('bills').doc(billId).get();

    if (!billDoc.exists) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    res.json({ id: billDoc.id, ...billDoc.data() });
  } catch (error) {
    console.error('[BILLING] Error fetching bill:', error);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

export { billingRouter };