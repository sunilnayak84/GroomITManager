import { Router } from 'express';
import { admin } from '../firebase';
import { BillingService } from './billing-service';

const billingRouter = Router();
const billingService = new BillingService();

// Debug middleware
billingRouter.use((req, res, next) => {
  console.log('[BILLING] Request:', {
    method: req.method,
    path: req.path,
    params: req.params,
    body: req.body,
    originalUrl: req.originalUrl
  });
  next();
});

// Generate bill route
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
    console.log('[BILLING] Bill generated successfully:', {
      billId: bill.id,
      appointmentId: bill.appointmentId,
      status: bill.status
    });

    res.json(bill);
  } catch (error: any) { // Explicitly type error as any for proper error handling
    console.error('[BILLING] Error:', error);
    const statusCode = error?.message?.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
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