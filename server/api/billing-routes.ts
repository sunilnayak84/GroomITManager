
import { Router } from 'express';
import { admin } from '../firebase';
import { authenticateFirebase } from '../middleware/auth';

const billingRouter = Router();

// Debug middleware
billingRouter.use((req, res, next) => {
  console.log('[BILLING] Incoming request:', {
    method: req.method,
    originalUrl: req.originalUrl,
    path: req.path,
    params: req.params,
    headers: req.headers,
    route: req.route,
    body: req.body
  });
  next();
});

// Generate bill route
billingRouter.post('/generate/:appointmentId', async (req, res) => {
  try {
    console.log('[BILLING] Generating bill for appointment:', req.params.appointmentId);

    const appointmentId = req.params.appointmentId;
    const firestore = admin.firestore();

    // Get appointment data
    const appointmentDoc = await firestore.collection('appointments').doc(appointmentId).get();
    if (!appointmentDoc.exists) {
      throw new Error('Appointment not found');
    }

    const appointmentData = appointmentDoc.data();
    console.log('[BILLING] Appointment data:', appointmentData);

    // Generate bill logic here
    const bill = {
      appointmentId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending',
      amount: appointmentData?.totalAmount || 0,
      customerName: appointmentData?.customerName,
      services: appointmentData?.services || []
    };

    // Save bill
    const billRef = await firestore.collection('bills').add(bill);
    console.log('[BILLING] Bill created:', billRef.id);

    res.json({ id: billRef.id, ...bill });
  } catch (error) {
    console.error('[BILLING] Error in bill generation:', {
      error: error instanceof Error ? error.message : error,
      appointmentId: req.params.appointmentId,
      stack: error instanceof Error ? error.stack : undefined,
      route: req.route,
      path: req.path,
      method: req.method,
      originalUrl: req.originalUrl
    });

    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: 'Failed to generate bill',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { billingRouter };
