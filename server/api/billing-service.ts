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

interface ServiceData {
  id: string;
  name: string;
  description?: string;
  price: number;
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
      logger.debug('[BILLING] Full appointment data:', {
        appointmentData: appointment,
        customerId: appointment.customerId,
        customerRef: appointment.customer,
        customerDetails: appointment.customerDetails,
        services: appointment.services,
        petDetails: appointment.pet,
        petRef: appointment.petRef
      });

      // Check for customer reference - try all possible paths
      let customerId = null;
      
      // Log raw customer data for debugging
      logger.info('[BILLING] Raw customer data in appointment:', {
        customerId: appointment.customerId,
        customer: appointment.customer,
        customerDetails: appointment.customerDetails,
        customerRef: appointment.customerRef,
        pet: appointment.pet,
        petRef: appointment.petRef
      });
      
      if (appointment.customerId) {
        customerId = appointment.customerId;
        logger.info('[BILLING] Found customerId directly:', customerId);
      } else if (appointment.customer?.id) {
        customerId = appointment.customer.id;
        logger.info('[BILLING] Found customerId in customer.id:', customerId);
      } else if (typeof appointment.customer === 'string') {
        customerId = appointment.customer;
        logger.info('[BILLING] Found customerId as string in customer field:', customerId);
      } else if (appointment.customerDetails?.id) {
        customerId = appointment.customerDetails.id;
        logger.info('[BILLING] Found customerId in customerDetails.id:', customerId);
      } else if (appointment.customerRef?.id) {
        customerId = appointment.customerRef.id;
        logger.info('[BILLING] Found customerId in customerRef.id:', customerId);
      } else if (appointment.pet?.owner?.id) {
        customerId = appointment.pet.owner.id;
        logger.info('[BILLING] Found customerId in pet.owner.id:', customerId);
      } else if (appointment.petRef?.owner?.id) {
        customerId = appointment.petRef.owner.id;
        logger.info('[BILLING] Found customerId in petRef.owner.id:', customerId);
      } else if (appointment.pet?.owner && typeof appointment.pet.owner === 'string') {
        customerId = appointment.pet.owner;
        logger.info('[BILLING] Found customerId as string in pet.owner:', customerId);
      }

      if (!customerId) {
        logger.error('[BILLING] Customer reference not found in appointment:', {
          appointmentId,
          appointmentData: JSON.stringify(appointment, null, 2),
          customerId: appointment.customerId,
          customerObj: appointment.customer,
          customerDetails: appointment.customerDetails,
          customerRef: appointment.customerRef,
          petOwner: appointment.pet?.owner,
          petRefOwner: appointment.petRef?.owner
        });
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
      const services: ServiceData[] = [];
      if (appointment.services && Array.isArray(appointment.services)) {
        for (const serviceRef of appointment.services) {
          let serviceId;
          // Handle both string IDs and reference objects
          if (typeof serviceRef === 'string') {
            serviceId = serviceRef;
          } else if (serviceRef?.id) {
            serviceId = serviceRef.id;
          } else {
            logger.warn('[BILLING] Invalid service reference:', serviceRef);
            continue;
          }

          try {
            const serviceDoc = await admin.firestore()
              .collection('services')
              .doc(serviceId.trim())
              .get();

            if (!serviceDoc.exists) {
              logger.warn(`[BILLING] Service ${serviceId} not found`);
              continue;
            }

            const serviceData = serviceDoc.data();
            if (!serviceData) {
              logger.warn(`[BILLING] Service ${serviceId} has no data`);
              continue;
            }

            services.push({
              id: serviceDoc.id,
              name: serviceData.name || 'Unknown Service',
              description: serviceData.description || '',
              price: serviceData.price || 0
            });
          } catch (error) {
            logger.error(`[BILLING] Error fetching service ${serviceId}:`, error);
            continue;
          }
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
      logger.error('[BILLING] Error in getAppointmentDetails:', error);
      throw error;
    }
  }

  async generateBill(appointmentId: string): Promise<Bill> {
    try {
      logger.info('[BILLING] Generating bill for appointment:', appointmentId);

      // Get appointment details
      const { appointment, customer, services } = await this.getAppointmentDetails(appointmentId);


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
        customerId: customer.id, //Using customer.id directly as it's already validated in getAppointmentDetails
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
        await appointment.doc.ref.update({
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

  private async getCustomerDetails(customerId: string) {
    try {
      logger.info('[BILLING] Fetching customer details:', customerId);
      const customerDoc = await admin.firestore()
        .collection('customers')
        .doc(customerId)
        .get();

      if (!customerDoc.exists) {
        logger.error('[BILLING] Customer not found:', customerId);
        throw new Error('Customer not found');
      }

      const customerData = customerDoc.data();
      logger.info('[BILLING] Customer data retrieved:', { 
        customerId, 
        hasName: !!customerData?.name,
        hasEmail: !!customerData?.email,
        hasPhone: !!customerData?.phone 
      });
      return customerData;
    } catch (error) {
      logger.error('[BILLING] Error fetching customer details:', error);
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