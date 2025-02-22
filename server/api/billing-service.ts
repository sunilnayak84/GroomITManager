import Razorpay from 'razorpay';
import { admin } from '../firebase';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

export type BillStatus = 'DRAFT' | 'PENDING_PAYMENT' | 'PAID' | 'FAILED';

interface BillItem {
  id: string;
  serviceName: string;
  description?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface Bill {
  id?: string;
  appointmentId: string;
  customerId: string;
  items: BillItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  status: BillStatus;
  paymentId?: string;
  paymentLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TAX_RATE = 0.18; // 18% GST

export class BillingService {
  private async getAppointmentDetails(appointmentId: string) {
    try {
      // Validate appointmentId
      if (!appointmentId || typeof appointmentId !== 'string' || appointmentId.trim() === '') {
        logger.error('[BILLING] Invalid appointment ID:', appointmentId);
        throw new Error('Invalid appointment ID');
      }

      logger.info('[BILLING] Fetching appointment details:', appointmentId);

      // Get appointment with customer data
      const appointmentDoc = await admin.firestore()
        .collection('appointments')
        .doc(appointmentId.trim())
        .get();

      if (!appointmentDoc.exists) {
        logger.error(`[BILLING] Appointment ${appointmentId} not found`);
        throw new Error(`Appointment ${appointmentId} not found`);
      }

      const appointment = appointmentDoc.data();
      if (!appointment) {
        logger.error('[BILLING] Appointment data is missing');
        throw new Error('Appointment data is missing');
      }

      // Log appointment data for debugging
      logger.info('[BILLING] Retrieved appointment data:', JSON.stringify(appointment, null, 2));

      // Check for customer reference
      const customerId = appointment.customer?.id || appointment.customerId;
      if (!customerId) {
        logger.error('[BILLING] Customer reference is missing in appointment:', appointment);
        throw new Error('Customer reference is missing in appointment');
      }

      // Get customer details
      const customerDoc = await admin.firestore()
        .collection('customers')
        .doc(customerId.toString())
        .get();

      if (!customerDoc.exists) {
        logger.error(`[BILLING] Customer ${customerId} not found`);
        throw new Error('Customer not found');
      }

      const customer = customerDoc.data()!;

      // Get service details
      const services = [];
      if (appointment.services && Array.isArray(appointment.services)) {
        for (const serviceId of appointment.services) {
          if (!serviceId || typeof serviceId !== 'string') {
            logger.warn(`[BILLING] Invalid service ID: ${serviceId}`);
            continue;
          }

          const serviceDoc = await admin.firestore()
            .collection('services')
            .doc(serviceId.trim())
            .get();

          if (!serviceDoc.exists) {
            logger.warn(`[BILLING] Service ${serviceId} not found`);
            continue;
          }

          services.push({ id: serviceDoc.id, ...serviceDoc.data() });
        }
      }

      if (services.length === 0) {
        logger.warn(`[BILLING] No valid services found for appointment ${appointmentId}`);
      }

      return {
        appointment,
        customer,
        services,
        doc: appointmentDoc
      };
    } catch (error) {
      logger.error('[BILLING] Error fetching appointment details:', error);
      throw error;
    }
  }

  async generateBill(appointmentId: string): Promise<Bill> {
    try {
      logger.info('[BILLING] Starting bill generation for appointment:', appointmentId);

      // Get all required details
      const { appointment, customer, services, doc: appointmentDoc } = await this.getAppointmentDetails(appointmentId);

      // Create bill items from services
      const items: BillItem[] = services.map(service => ({
        id: service.id,
        serviceName: service.name,
        description: service.description,
        price: service.price,
        quantity: 1,
        subtotal: service.price
      }));

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      const tax = subtotal * TAX_RATE;
      const totalAmount = subtotal + tax;

      // Create bill object
      const bill: Bill = {
        appointmentId,
        customerId: customer.id,
        items,
        subtotal,
        tax,
        totalAmount,
        status: 'PENDING_PAYMENT',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      try {
        // Create Razorpay payment link
        logger.info('[BILLING] Creating Razorpay payment link');

        const callbackUrl = `${process.env.FRONTEND_URL || ''}/billing/verification?appointmentId=${appointmentId}`.replace(/\/+$/, '');

        const paymentLink = await razorpay.paymentLink.create({
          amount: Math.round(totalAmount * 100), // Convert to paise
          currency: "INR",
          description: `Pet grooming services - Appointment ${appointmentId}`,
          customer: {
            name: customer.name || `${customer.firstName} ${customer.lastName}`,
            email: customer.email,
            contact: customer.phone
          },
          callback_url: callbackUrl,
          callback_method: "get"
        });

        logger.info('[BILLING] Payment link created:', paymentLink);
        bill.paymentLink = paymentLink.short_url;

        // Save bill to Firestore
        const billRef = await admin.firestore()
          .collection('bills')
          .add(bill);

        logger.info('[BILLING] Bill saved:', billRef.id);

        // Update appointment with bill reference
        await appointmentDoc.ref.update({
          billId: billRef.id,
          billStatus: 'PENDING_PAYMENT'
        });

        return { ...bill, id: billRef.id };
      } catch (error) {
        logger.error('[BILLING] Error in payment processing:', error);
        throw new Error(error instanceof Error ? error.message : 'Payment processing failed');
      }
    } catch (error) {
      logger.error('[BILLING] Bill generation failed:', error);
      throw error;
    }
  }

  async verifyPayment(paymentId: string): Promise<boolean> {
    try {
      logger.info('[BILLING] Verifying payment:', paymentId);
      const payment = await razorpay.payments.fetch(paymentId);

      const isValid = payment.status === 'captured';
      logger.info('[BILLING] Payment verification result:', { paymentId, status: payment.status, isValid });

      if (isValid) {
        // Update bill status
        const billsRef = admin.firestore().collection('bills');
        const billQuery = await billsRef.where('paymentId', '==', paymentId).get();

        if (!billQuery.empty) {
          const billDoc = billQuery.docs[0];
          await billDoc.ref.update({
            status: 'PAID',
            updatedAt: new Date()
          });

          // Update appointment status
          const appointmentRef = admin.firestore()
            .collection('appointments')
            .doc(billDoc.data().appointmentId);

          await appointmentRef.update({
            billStatus: 'PAID',
            paymentStatus: 'COMPLETED'
          });
        }
      }

      return isValid;
    } catch (error) {
      logger.error('[BILLING] Payment verification failed:', error);
      return false;
    }
  }

  async getAllBills(): Promise<Bill[]> {
    try {
      logger.info('[BILLING] Fetching all bills');

      const billsSnapshot = await admin.firestore()
        .collection('bills')
        .orderBy('createdAt', 'desc')
        .get();

      return billsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Bill
      }));
    } catch (error) {
      logger.error('[BILLING] Error fetching bills:', error);
      throw error;
    }
  }

  async getBill(billId: string): Promise<Bill | null> {
    try {
      logger.info('[BILLING] Fetching bill:', billId);

      const billDoc = await admin.firestore()
        .collection('bills')
        .doc(billId)
        .get();

      if (!billDoc.exists) {
        return null;
      }

      return { id: billDoc.id, ...billDoc.data() as Bill };
    } catch (error) {
      logger.error('[BILLING] Error fetching bill:', error);
      throw error;
    }
  }
}