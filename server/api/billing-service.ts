import Razorpay from 'razorpay';
import { admin } from '../firebase';

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
  qrCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const db = admin.firestore();

export class BillingService {
  async generateBill(appointmentId: string): Promise<Bill> {
    console.log('[BILLING] Starting bill generation for appointment:', appointmentId);

    const appointmentDoc = await db.collection('appointments').doc(appointmentId).get();
    if (!appointmentDoc.exists) {
      throw new Error(`Appointment with ID ${appointmentId} not found`);
    }

    const appointment = appointmentDoc.data();
    if (!appointment) {
      throw new Error('Appointment data is missing');
    }

    console.log('[BILLING] Appointment data:', appointment);

    if (appointment.status !== 'completed') {
      throw new Error('Cannot generate bill for uncompleted appointment');
    }

    // Get customer details for Razorpay
    const customerDoc = await db.collection('customers').doc(appointment.customerId).get();
    if (!customerDoc.exists) {
      throw new Error('Customer not found');
    }
    const customer = customerDoc.data();
    console.log('[BILLING] Customer data:', customer);

    // Extract services and calculate total
    // Check both 'service' and 'services' fields
    const services = appointment.service || appointment.services || [];
    console.log('[BILLING] Services found:', services);

    if (!Array.isArray(services) || services.length === 0) {
      throw new Error('No services found in appointment');
    }

    const items = services.map((service: any) => ({
      serviceName: service.name,
      price: service.price,
      quantity: 1
    }));

    const totalAmount = items.reduce((sum: number, item: BillItem) => sum + (item.price * item.quantity), 0);
    console.log('[BILLING] Calculated total amount:', totalAmount);

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
      console.log('[BILLING] Creating Razorpay payment link');
      const paymentLink = await razorpay.paymentLink.create({
        amount: totalAmount * 100, // Converting to paise
        currency: "INR",
        description: `Bill for grooming services - Appointment ${appointmentId}`,
        customer: {
          name: `${customer?.firstName} ${customer?.lastName}`,
          email: customer?.email,
          contact: customer?.phone
        },
        callback_url: `${process.env.FRONTEND_URL}/billing?appointmentId=${appointmentId}`,
        callback_method: "get"
      });

      console.log('[BILLING] Razorpay payment link created:', paymentLink.short_url);
      bill.paymentLink = paymentLink.short_url;

      // Save bill to Firestore
      const billRef = await db.collection('bills').add(bill);
      console.log('[BILLING] Bill saved to Firestore:', billRef.id);

      // Update appointment with billId
      await appointmentDoc.ref.update({ 
        billId: billRef.id,
        billStatus: 'pending'
      });
      console.log('[BILLING] Appointment updated with bill reference');

      return { ...bill, id: billRef.id };
    } catch (error) {
      console.error('[BILLING] Error in bill generation:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create payment link');
    }
  }

  async verifyPayment(paymentId: string) {
    try {
      const payment = await razorpay.payments.fetch(paymentId);
      return payment.status === 'captured';
    } catch (error) {
      console.error('Payment verification failed:', error);
      return false;
    }
  }
}