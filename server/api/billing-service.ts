
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

export class BillingService {
  async generateBillFromAppointment(appointmentId: string): Promise<Bill> {
    const appointmentDoc = await db.collection('appointments').doc(appointmentId).get();
    const appointment = appointmentDoc.data();
    
    if (!appointment || appointment.status !== 'completed') {
      throw new Error('Appointment not found or not completed');
    }

    const bill: Bill = {
      appointmentId,
      customerId: appointment.customerId,
      items: appointment.services.map((service: any) => ({
        serviceName: service.name,
        price: service.price,
        quantity: 1
      })),
      totalAmount: appointment.services.reduce((sum: number, service: any) => sum + service.price, 0),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const billRef = await db.collection('bills').add(bill);
    await appointmentDoc.ref.update({ billId: billRef.id });

    return { id: billRef.id, ...bill };
  }
  async generateBill(appointmentId: string): Promise<Bill> {
    const firestore = admin.firestore();
    const appointmentDoc = await firestore.collection('appointments').doc(appointmentId).get();
    const appointment = appointmentDoc.data();

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const items = appointment.services.map((service: any) => ({
      serviceName: service.name,
      price: service.price,
      quantity: 1
    }));

    const totalAmount = items.reduce((sum: number, item: BillItem) => sum + (item.price * item.quantity), 0);

    const bill: Bill = {
      appointmentId,
      customerId: appointment.customerId,
      items,
      totalAmount,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create payment link
    const paymentLink = await razorpay.paymentLink.create({
      amount: totalAmount * 100, // Converting to paise
      currency: "INR",
      description: `Bill for appointment ${appointmentId}`,
      customer: {
        name: appointment.customerName,
        email: appointment.customerEmail,
        contact: appointment.customerPhone
      },
      callback_url: `${process.env.FRONTEND_URL}/payment-success`,
      callback_method: "get"
    });

    bill.paymentLink = paymentLink.short_url;
    
    // Store bill in Firestore
    await firestore.collection('bills').doc(appointmentId).set(bill);

    return bill;
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
