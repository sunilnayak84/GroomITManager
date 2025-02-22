import Razorpay from 'razorpay';
import { admin } from '../firebase';
import { logger } from '../utils/logger';

// Initialize Razorpay with environment variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

export interface BillItem {
  serviceName: string;
  price: number;
  quantity: number;
}

export interface Bill {
  id?: string;
  appointmentId: string;
  customerId: string;
  items: BillItem[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'failed';
  paymentId?: string;
  paymentLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class BillingService {
  private async getAppointmentDetails(appointmentId: string) {
    logger.info('[BILLING] Fetching appointment details:', appointmentId);

    const appointmentDoc = await admin.firestore()
      .collection('appointments')
      .doc(appointmentId)
      .get();

    if (!appointmentDoc.exists) {
      throw new Error(`Appointment ${appointmentId} not found`);
    }

    const appointment = appointmentDoc.data();
    if (!appointment) {
      throw new Error('Appointment data is missing');
    }

    return { doc: appointmentDoc, data: appointment };
  }

  private async getCustomerDetails(customerId: string) {
    logger.info('[BILLING] Fetching customer details:', customerId);

    const customerDoc = await admin.firestore()
      .collection('customers')
      .doc(customerId)
      .get();

    if (!customerDoc.exists) {
      throw new Error('Customer not found');
    }

    return customerDoc.data()!;
  }

  private calculateTotal(items: BillItem[]): number {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  async generateBill(appointmentId: string): Promise<Bill> {
    try {
      logger.info('[BILLING] Starting bill generation for appointment:', appointmentId);

      // Get appointment details
      const { doc: appointmentDoc, data: appointment } = await this.getAppointmentDetails(appointmentId);

      // Get customer details
      const customer = await this.getCustomerDetails(appointment.customerId);

      // Process services
      const services = appointment.services || [];
      if (!Array.isArray(services) || services.length === 0) {
        throw new Error('No services found in appointment');
      }

      // Create bill items
      const items = services.map(service => ({
        serviceName: service.name,
        price: service.price,
        quantity: 1
      }));

      const totalAmount = this.calculateTotal(items);
      logger.info('[BILLING] Calculated total amount:', totalAmount);

      // Create bill object
      const bill: Bill = {
        appointmentId,
        customerId: appointment.customerId,
        items,
        totalAmount,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      try {
        // Create Razorpay payment link
        logger.info('[BILLING] Creating Razorpay payment link');

        const callbackUrl = `${process.env.FRONTEND_URL || ''}/billing?appointmentId=${appointmentId}`.replace(/\/+$/, '');

        const paymentLink = await razorpay.paymentLink.create({
          amount: totalAmount * 100, // Convert to paise
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
          billStatus: 'pending'
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

      return isValid;
    } catch (error) {
      logger.error('[BILLING] Payment verification failed:', error);
      return false;
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