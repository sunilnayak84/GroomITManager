import Razorpay from 'razorpay';
import { admin } from '../firebase';
import crypto from 'crypto';

export class RazorpayService {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!
    });
  }

  async createOrder(appointmentId: string): Promise<any> {
    try {
      console.log('[RAZORPAY] Starting order creation for appointment:', appointmentId);

      // Get appointment details from Firestore
      const appointmentDoc = await admin.firestore()
        .collection('appointments')
        .doc(appointmentId)
        .get();

      if (!appointmentDoc.exists) {
        console.error('[RAZORPAY] Appointment not found:', appointmentId);
        throw new Error('Appointment not found');
      }

      const appointmentData = appointmentDoc.data();
      if (!appointmentData) {
        console.error('[RAZORPAY] Appointment data is empty:', appointmentId);
        throw new Error('Appointment data is empty');
      }

      console.log('[RAZORPAY] Processing appointment data:', {
        id: appointmentId,
        services: appointmentData.service,
        customer: appointmentData.customer
      });

      // Calculate total amount from services
      const amount = appointmentData.service.reduce((total: number, service: any) => 
        total + (service.price || 0), 0);

      if (amount <= 0) {
        console.error('[RAZORPAY] Invalid amount calculated:', amount);
        throw new Error('Invalid amount for payment');
      }

      console.log('[RAZORPAY] Calculated amount:', amount);

      // Create Razorpay order
      const order = await this.razorpay.orders.create({
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        receipt: `receipt_${appointmentId}`,
        notes: {
          appointmentId,
          customerName: `${appointmentData.customer.firstName} ${appointmentData.customer.lastName}`,
          services: appointmentData.service.map((s: any) => s.name).join(', ')
        }
      });

      console.log('[RAZORPAY] Order created successfully:', order);

      // Store order details in Firestore
      await admin.firestore()
        .collection('payments')
        .doc(order.id)
        .set({
          orderId: order.id,
          appointmentId,
          amount: amount * 100,
          status: 'created',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          customer: appointmentData.customer,
          services: appointmentData.service
        });

      return {
        orderId: order.id,
        amount: amount * 100,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID
      };
    } catch (error) {
      console.error('[RAZORPAY] Error creating order:', error);
      throw error;
    }
  }

  verifyPayment(paymentId: string, orderId: string, signature: string): boolean {
    try {
      // Generate signature verification string
      const text = orderId + "|" + paymentId;

      // Create HMAC SHA256 hash
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!);
      hmac.update(text);
      const generated_signature = hmac.digest('hex');

      // Compare signatures
      const isValid = generated_signature === signature;

      if (!isValid) {
        throw new Error('Invalid payment signature');
      }

      return true;
    } catch (error) {
      console.error('[RAZORPAY] Payment verification failed:', error);
      throw error;
    }
  }

  async updatePaymentStatus(orderId: string, paymentId: string, signature: string): Promise<void> {
    try {
      await admin.firestore()
        .collection('payments')
        .doc(orderId)
        .update({
          paymentId,
          status: 'completed',
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
          signature
        });
    } catch (error) {
      console.error('[RAZORPAY] Error updating payment status:', error);
      throw error;
    }
  }
}