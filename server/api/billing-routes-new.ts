import { Router } from 'express';
import { billingService } from './billing-service-new.js';
import { BillCreateInputSchema, BillStatusSchema } from '../types/billing.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /api/billing/bills
 * Get all bills with optional filtering
 */
router.get('/bills', async (req, res) => {
  try {
    logger.info('[BILLING_ROUTES] GET /bills', { 
      query: req.query, 
      user: req.user?.email 
    });

    const { status, customerId, fromDate, toDate } = req.query;

    // Validate filters
    const filters: any = {};
    
    if (status && typeof status === 'string') {
      const statusResult = BillStatusSchema.safeParse(status);
      if (statusResult.success) {
        filters.status = statusResult.data;
      }
    }

    if (customerId && typeof customerId === 'string') {
      filters.customerId = customerId;
    }

    if (fromDate && typeof fromDate === 'string') {
      const date = new Date(fromDate);
      if (!isNaN(date.getTime())) {
        filters.fromDate = date;
      }
    }

    if (toDate && typeof toDate === 'string') {
      const date = new Date(toDate);
      if (!isNaN(date.getTime())) {
        filters.toDate = date;
      }
    }

    const bills = await billingService.getAllBills(filters);
    
    logger.info(`[BILLING_ROUTES] Successfully retrieved ${bills.length} bills`);
    res.json(bills);

  } catch (error) {
    logger.error('[BILLING_ROUTES] Error fetching bills:', error);
    res.status(500).json({ 
      error: 'Failed to fetch bills',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/billing/bills/:billId
 * Get a specific bill by ID
 */
router.get('/bills/:billId', async (req, res) => {
  try {
    const { billId } = req.params;
    
    logger.info(`[BILLING_ROUTES] GET /bills/${billId}`, { 
      user: req.user?.email 
    });

    const bill = await billingService.getBillById(billId);
    
    if (!bill) {
      logger.warn(`[BILLING_ROUTES] Bill not found: ${billId}`);
      return res.status(404).json({ 
        error: 'Bill not found',
        billId 
      });
    }

    logger.info(`[BILLING_ROUTES] Successfully retrieved bill: ${billId}`);
    res.json(bill);

  } catch (error) {
    logger.error(`[BILLING_ROUTES] Error fetching bill ${req.params.billId}:`, error);
    res.status(500).json({ 
      error: 'Failed to fetch bill',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/billing/generate/:appointmentId
 * Generate a new bill from appointment (legacy endpoint for compatibility)
 */
router.post('/generate/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    logger.info(`[BILLING_ROUTES] POST /generate/${appointmentId}`, { 
      body: req.body, 
      user: req.user?.email 
    });

    // Create bill input with the appointment ID
    const billInput = {
      appointmentId,
      ...req.body
    };

    // Validate input
    const inputResult = BillCreateInputSchema.safeParse(billInput);
    if (!inputResult.success) {
      logger.warn('[BILLING_ROUTES] Invalid bill generation input:', inputResult.error);
      return res.status(400).json({ 
        error: 'Invalid input',
        details: inputResult.error.issues
      });
    }

    const input = inputResult.data;
    const userId = req.user?.uid || req.user?.email || 'unknown';

    // Create the bill
    const bill = await billingService.createBillFromAppointment(
      appointmentId,
      input,
      userId
    );

    logger.info(`[BILLING_ROUTES] Successfully generated bill from appointment: ${appointmentId} -> ${bill.id}`);
    res.status(201).json(bill);

  } catch (error) {
    logger.error(`[BILLING_ROUTES] Error generating bill from appointment ${req.params.appointmentId}:`, error);
    res.status(500).json({ 
      error: 'Failed to generate bill',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/billing/bills
 * Create a new bill from appointment
 */
router.post('/bills', async (req, res) => {
  try {
    logger.info('[BILLING_ROUTES] POST /bills', { 
      body: req.body, 
      user: req.user?.email 
    });

    // Validate input
    const inputResult = BillCreateInputSchema.safeParse(req.body);
    if (!inputResult.success) {
      logger.warn('[BILLING_ROUTES] Invalid bill creation input:', inputResult.error);
      return res.status(400).json({ 
        error: 'Invalid input',
        details: inputResult.error.issues
      });
    }

    const input = inputResult.data;
    const createdBy = req.user?.email || req.user?.uid || 'system';

    const bill = await billingService.createBillFromAppointment(
      input.appointmentId,
      input,
      createdBy
    );

    logger.info(`[BILLING_ROUTES] Successfully created bill: ${bill.id}`);
    res.status(201).json(bill);

  } catch (error) {
    logger.error('[BILLING_ROUTES] Error creating bill:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Resource not found',
        message: error.message
      });
    }

    res.status(500).json({ 
      error: 'Failed to create bill',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PATCH /api/billing/bills/:billId
 * Update an existing bill
 */
router.patch('/bills/:billId', async (req, res) => {
  try {
    const { billId } = req.params;
    
    logger.info(`[BILLING_ROUTES] PATCH /bills/${billId}`, { 
      body: req.body,
      bodyKeys: Object.keys(req.body),
      discountData: req.body.discount,
      user: req.user?.email 
    });

    const updatedBy = req.user?.email || req.user?.uid || 'system';
    
    const bill = await billingService.updateBill(billId, req.body, updatedBy);
    
    logger.info(`[BILLING_ROUTES] Successfully updated bill: ${billId}`);
    res.json(bill);

  } catch (error) {
    logger.error(`[BILLING_ROUTES] Error updating bill ${req.params.billId}:`, error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Bill not found',
        billId: req.params.billId
      });
    }

    res.status(500).json({ 
      error: 'Failed to update bill',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PATCH /api/billing/bills/:billId/status
 * Update bill status (for payments, cancellations, etc.)
 */
router.patch('/bills/:billId/status', async (req, res) => {
  try {
    const { billId } = req.params;
    const { status, paymentId, paymentMethod, paymentDate } = req.body;
    
    logger.info(`[BILLING_ROUTES] PATCH /bills/${billId}/status`, { 
      status,
      user: req.user?.email 
    });

    // Validate status
    const statusResult = BillStatusSchema.safeParse(status);
    if (!statusResult.success) {
      return res.status(400).json({ 
        error: 'Invalid status',
        details: statusResult.error.issues
      });
    }

    const updatedBy = req.user?.email || req.user?.uid || 'system';
    
    // Only include payment details that are defined
    const paymentDetails: any = {};
    if (paymentId !== undefined) paymentDetails.paymentId = paymentId;
    if (paymentMethod !== undefined) paymentDetails.paymentMethod = paymentMethod;
    if (paymentDate !== undefined) paymentDetails.paymentDate = new Date(paymentDate);

    const bill = await billingService.updateBillStatus(
      billId,
      statusResult.data,
      updatedBy,
      paymentDetails
    );
    
    logger.info(`[BILLING_ROUTES] Successfully updated bill status: ${billId} -> ${status}`);
    res.json(bill);

  } catch (error) {
    logger.error(`[BILLING_ROUTES] Error updating bill status ${req.params.billId}:`, error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ 
        error: 'Bill not found',
        billId: req.params.billId
      });
    }

    res.status(500).json({ 
      error: 'Failed to update bill status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/billing/customers/:customerId/bills
 * Get all bills for a specific customer
 */
router.get('/customers/:customerId/bills', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    logger.info(`[BILLING_ROUTES] GET /customers/${customerId}/bills`, { 
      user: req.user?.email 
    });

    const bills = await billingService.getBillsByCustomer(customerId);
    
    logger.info(`[BILLING_ROUTES] Successfully retrieved ${bills.length} bills for customer: ${customerId}`);
    res.json(bills);

  } catch (error) {
    logger.error(`[BILLING_ROUTES] Error fetching bills for customer ${req.params.customerId}:`, error);
    res.status(500).json({ 
      error: 'Failed to fetch customer bills',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/billing/appointments/:appointmentId/bills
 * Get all bills for a specific appointment
 */
router.get('/appointments/:appointmentId/bills', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    logger.info(`[BILLING_ROUTES] GET /appointments/${appointmentId}/bills`, { 
      user: req.user?.email 
    });

    const bills = await billingService.getBillsByAppointment(appointmentId);
    
    logger.info(`[BILLING_ROUTES] Successfully retrieved ${bills.length} bills for appointment: ${appointmentId}`);
    res.json(bills);

  } catch (error) {
    logger.error(`[BILLING_ROUTES] Error fetching bills for appointment ${req.params.appointmentId}:`, error);
    res.status(500).json({ 
      error: 'Failed to fetch appointment bills',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/billing/fix-appointment-links
 * Fix appointment-bill relationships (utility endpoint)
 */
router.post('/fix-appointment-links', async (req, res) => {
  try {
    const user = req.user as any;

    logger.info('[BILLING_ROUTES] POST /fix-appointment-links', {
      timestamp: new Date().toISOString(),
      user: user.email
    });

    const result = await billingService.fixAppointmentBillLinks();

    logger.info('[BILLING_ROUTES] Successfully fixed appointment-bill links', {
      result,
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Successfully fixed appointment-bill links', ...result });
  } catch (error) {
    logger.error('[BILLING_ROUTES] Error fixing appointment-bill links:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fix appointment-bill links';
    res.status(500).json({ 
      message: 'Failed to fix appointment-bill links',
      error: errorMessage 
    });
  }
});

/**
 * POST /api/billing/bills/:billId/payment
 * Record payment for a bill
 */
router.post('/bills/:billId/payment', async (req, res) => {
  try {
    const { billId } = req.params;
    const { method, amount, transactionId, notes, status } = req.body;
    
    logger.info(`[BILLING_ROUTES] POST /bills/${billId}/payment`, { 
      method, 
      amount, 
      user: req.user?.email 
    });

    // Validate required fields
    if (!method || !amount) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Payment method and amount are required'
      });
    }

    // Record the payment
    const result = await billingService.recordPayment(billId, {
      method,
      amount: parseFloat(amount),
      transactionId: transactionId || undefined,
      notes: notes || undefined,
      status: status || 'SUCCESS',
      paidAt: new Date(),
    });

    logger.info(`[BILLING_ROUTES] Payment recorded successfully for bill: ${billId}`);
    res.json(result);

  } catch (error) {
    logger.error(`[BILLING_ROUTES] Error recording payment for bill ${req.params.billId}:`, error);
    res.status(500).json({ 
      error: 'Failed to record payment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;