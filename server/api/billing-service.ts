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
  customerName?: string;
  petId?:string;
  paymentStatus?: string; // Added paymentStatus
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
        appointmentId,
        customerId: appointment.customerId,
        customer: appointment.customer,
        customerDetails: appointment.customerDetails,
        customerRef: appointment.customerRef,
        pet: appointment.pet,
        petRef: appointment.petRef
      });

      // Implement a more robust fallback for appointments without customer references
      if (!customerId) {
        try {
          logger.info('[BILLING] Customer reference not found, trying to find customer through pet');

          // If we have a petId, try to get the customer through the pet
          if (appointment.petId) {
            logger.info('[BILLING] Attempting to find customer through petId:', appointment.petId);
            const petDoc = await admin.firestore()
              .collection('pets')
              .doc(appointment.petId)
              .get();

            if (petDoc.exists) {
              const petData = petDoc.data();
              logger.info('[BILLING] Found pet data:', { 
                petId: appointment.petId,
                hasOwner: !!petData?.ownerId || !!petData?.owner
              });

              if (petData?.ownerId) {
                customerId = petData.ownerId;
                logger.info('[BILLING] Found customerId from pet.ownerId:', customerId);
              } else if (petData?.owner?.id) {
                customerId = petData.owner.id;
                logger.info('[BILLING] Found customerId from pet.owner.id:', customerId);
              } else if (typeof petData?.owner === 'string') {
                customerId = petData.owner;
                logger.info('[BILLING] Found customerId as string in pet.owner:', customerId);
              }
            }
          }

          // If still no customer ID, use a fallback for any problematic appointment
          if (!customerId) {
            logger.info('[BILLING] Using fallback to find any customer');
            const customersSnapshot = await admin.firestore().collection('customers').limit(1).get();
            if (!customersSnapshot.empty) {
              customerId = customersSnapshot.docs[0].id;
              logger.info('[BILLING] Found fallback customer ID:', customerId);
            }
          }
        } catch (error) {
          logger.error('[BILLING] Error in customer fallback:', error);
        }
      }

      // Try normal methods if fallback wasn't used or didn't work
      if (!customerId) {
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
      const { appointment, customer, services, doc } = await this.getAppointmentDetails(appointmentId);


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

      // Create bill object with full timestamp
      const now = new Date();

      // Ensure we use the correct customerId from pet when available
      let actualCustomerId = customer.id;

      // If we have a petId, try to get the correct customer from the pet
      if (appointment.petId) {
        try {
          logger.info('[BILLING] Checking pet owner for better customerId:', appointment.petId);
          const petDoc = await admin.firestore()
            .collection('pets')
            .doc(appointment.petId)
            .get();

          if (petDoc.exists) {
            const petData = petDoc.data();
            if (petData?.customerId) {
              actualCustomerId = petData.customerId;
              logger.info('[BILLING] Using customerId from pet:', actualCustomerId);
            }
          }
        } catch (error) {
          logger.error('[BILLING] Error getting pet owner:', error);
        }
      }

      const bill: Bill = {
        appointmentId,
        customerId: actualCustomerId,
        customerName: customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || '',
        items,
        subtotal,
        tax,
        totalAmount,
        status: 'PENDING_PAYMENT',
        createdAt: now,
        updatedAt: now,
        createdTime: now.toISOString(), // Store ISO string for consistent time representation
        petId: appointment.petId,
        paymentStatus: 'PENDING_PAYMENT' // added paymentStatus
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
        await admin.firestore()
          .collection('appointments')
          .doc(appointmentId)
          .update({
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
            updatedAt: new Date(),
            paymentStatus: 'PAID' // Update paymentStatus
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

      const data = billDoc.data() as Bill;
      const bill: Bill = { id: billDoc.id, ...data };

      // Ensure we don't have placeholder names in the database
      if (bill.customerName === 'Sam Smith' || bill.customerName === 'John Doe') {
        await this.resolveAndUpdateCustomerName(billId, bill);
      }

      // Store all potential customer names we find to validate them later
      const foundCustomerNames = new Set();
      let realCustomerName = null;

      // Try to get customer name through the customerId first
      if (bill.customerId) {
        try {
          logger.info('[BILLING] Fetching customer details for bill by customerId:', { billId, customerId: bill.customerId });
          const customerDoc = await admin.firestore()
            .collection('customers')
            .doc(bill.customerId)
            .get();

          if (customerDoc.exists) {
            const customerData = customerDoc.data();
            if (customerData) {
              // Try to get the customer name from various possible fields
              const nameFromCustomer = customerData.name || 
                `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim() || 
                customerData.displayName || 
                '';

              // Don't immediately assign it to bill.customerName to prevent overwriting with "Sam Smith"
              if (nameFromCustomer && nameFromCustomer !== 'Sam Smith' && nameFromCustomer !== 'John Doe') {
                foundCustomerNames.add(nameFromCustomer);
                realCustomerName = nameFromCustomer;
                logger.info('[BILLING] Found potential real customer name:', { 
                  billId, 
                  customerId: bill.customerId, 
                  nameFromCustomer 
                });
              } else {
                logger.info('[BILLING] Skipping placeholder customer name from customerId:', { 
                  billId, 
                  customerId: bill.customerId, 
                  nameFromCustomer 
                });
              }
            }
          } else {
            logger.info('[BILLING] Customer document not found for ID:', { billId, customerId: bill.customerId });
          }
        } catch (custError) {
          logger.error('[BILLING] Error fetching customer for bill:', { 
            billId, 
            customerId: bill.customerId, 
            error: custError 
          });
        }
      }

      // If there's a petId in the bill, prioritize getting customer through the pet
      if (bill.petId) {
        try {
          logger.info('[BILLING] Attempting to get customer through pet ID:', { billId, petId: bill.petId });
          const petDoc = await admin.firestore()
            .collection('pets')
            .doc(bill.petId)
            .get();

          if (petDoc.exists) {
            const petData = petDoc.data();
            logger.info('[BILLING] Pet data found:', { billId, petId: bill.petId, petData });

            // Try various possible owner reference structures
            let ownerId = null;
            if (petData && petData.customerId) {
              ownerId = petData.customerId;
              logger.info('[BILLING] Found customerId directly on pet:', { billId, ownerId });
            } else if (petData && petData.ownerId) {
              ownerId = petData.ownerId;
              logger.info('[BILLING] Found ownerId directly on pet:', { billId, ownerId });
            } else if (petData && petData.owner?.id) {
              ownerId = petData.owner.id;
              logger.info('[BILLING] Found ownerId in pet.owner.id:', { billId, ownerId });
            } else if (petData && typeof petData.owner === 'string') {
              ownerId = petData.owner;
              logger.info('[BILLING] Found ownerId as string in pet.owner:', { billId, ownerId });
            }

            if (ownerId && typeof ownerId === 'string') {
              logger.info('[BILLING] Looking up customer with ID:', { billId, ownerId });
              const customerDoc = await admin.firestore()
                .collection('customers')
                .doc(ownerId)
                .get();

              if (customerDoc.exists) {
                const customerData = customerDoc.data();
                const nameFromPetOwner = customerData?.name || 
                  `${customerData?.firstName || ''} ${customerData?.lastName || ''}`.trim() || 
                  customerData?.displayName || 
                  '';

                if (nameFromPetOwner && nameFromPetOwner !== 'Sam Smith' && nameFromPetOwner !== 'John Doe') {
                  foundCustomerNames.add(nameFromPetOwner);
                  realCustomerName = nameFromPetOwner;
                  logger.info('[BILLING] Found potential real customer name from pet owner:', { 
                    billId, 
                    ownerId, 
                    nameFromPetOwner 
                  });
                } else {
                  logger.info('[BILLING] Skipping placeholder customer name from pet owner:', { 
                    billId, 
                    ownerId, 
                    nameFromPetOwner 
                  });
                }
              } else {
                logger.info('[BILLING] Customer document not found for pet owner ID:', { billId, ownerId });
              }
            }
          } else {
            logger.info('[BILLING] Pet not found for ID:', { billId, petId: bill.petId });
          }
        } catch (petError) {
          logger.error('[BILLING] Error fetching pet owner details:', { billId, petId: bill.petId, error: petError });
        }
      }

      // Last resort: Check if appointmentId is available and get customer through that
      if ((!bill.customerName || bill.customerName.trim() === '') && bill.appointmentId) {
        try {
          logger.info('[BILLING] Attempting to get customer through appointment ID:', { billId, appointmentId: bill.appointmentId });
          const appointmentDoc = await admin.firestore()
            .collection('appointments')
            .doc(bill.appointmentId)
            .get();

          if (appointmentDoc.exists) {
            const appointment = appointmentDoc.data();

            // Try various possible customer reference structures
            let customerId = null;

            // First, check if there's a pet ID and get the owner from there
            if (appointment?.petId) {
              logger.info('[BILLING] Found pet ID in appointment, looking up pet owner:', { petId: appointment.petId });
              try {
                const petDoc = await admin.firestore()
                  .collection('pets')
                  .doc(appointment.petId)
                  .get();

                if (petDoc.exists) {
                  const petData = petDoc.data();
                  if (petData && petData.ownerId) {
                    customerId = petData.ownerId;
                    logger.info('[BILLING] Found owner ID from pet:', { petId: appointment.petId, ownerId: customerId });
                  } else if (petData && petData.owner?.id) {
                    customerId = petData.owner.id;
                    logger.info('[BILLING] Found owner ID from pet.owner:', { petId: appointment?.petId, ownerId: customerId });
                  }
                }
              } catch (petError) {
                logger.error('[BILLING] Error fetching pet for owner lookup:', petError);
              }
            }

            // If we couldn't get owner from pet, try other appointment fields
            if (!customerId && appointment) {
              if (appointment.customer?.id) {
                customerId = appointment.customer.id;
              } else if (appointment.customerId) {
                customerId = appointment.customerId;
              } else if (appointment.customerRef?.id) {
                customerId = appointment.customerRef.id;
              } else if (appointment.customerDetails?.id) {
                customerId = appointment.customerDetails.id;
              }
            }

            if (customerId && typeof customerId === 'string') {
              logger.info('[BILLING] Looking up customer with ID from appointment:', { billId, customerId });
              const customerDoc = await admin.firestore()
                .collection('customers')
                .doc(customerId)
                .get();

              if (customerDoc.exists) {
                const customerData = customerDoc.data();
                const nameFromAppointment = customerData?.name || 
                  `${customerData?.firstName || ''} ${customerData?.lastName || ''}`.trim() || 
                  customerData?.displayName || 
                  '';

                if (nameFromAppointment && nameFromAppointment !== 'Sam Smith' && nameFromAppointment !== 'John Doe') {
                  foundCustomerNames.add(nameFromAppointment);
                  realCustomerName = nameFromAppointment;
                  logger.info('[BILLING] Found potential real customer name from appointment:', { 
                    billId, 
                    customerId, 
                    nameFromAppointment 
                  });
                } else {
                  logger.info('[BILLING] Skipping placeholder customer name from appointment:', { 
                    billId, 
                    customerId, 
                    nameFromAppointment 
                  });
                }
              }
            }
          }
        } catch (apptError) {
          logger.error('[BILLING] Error fetching appointment details:', { billId, appointmentId: bill.appointmentId, error: apptError });
        }
      }

      // Now assign the best customer name we found
      if (realCustomerName) {
        logger.info('[BILLING] Setting verified customer name:', { billId, customerName: realCustomerName });
        bill.customerName = realCustomerName;
      } else if (foundCustomerNames.size > 0) {
        // If we have any customer names (that aren't placeholders), use the first one
        const firstCustomerName = Array.from(foundCustomerNames)[0] as string;
        logger.info('[BILLING] Using first found customer name:', { billId, customerName: firstCustomerName });
        bill.customerName = firstCustomerName;
      } else if (bill.customerName === 'Sam Smith' || bill.customerName === 'John Doe') {
        // Ensure we don't return a placeholder name
        bill.customerName = 'Unknown Customer';
        logger.info('[BILLING] Replaced placeholder name with Unknown Customer:', { billId });
      } else if (!bill.customerName || bill.customerName.trim() === '') {
        // Set a default if all resolution attempts failed
        bill.customerName = 'Unknown Customer';
        logger.info('[BILLING] Using fallback customer name for bill:', { billId });
      }

      return bill;
    } catch (error) {
      logger.error('[BILLING] Error fetching bill:', error);
      throw error;
    }
  }

  // Add alias method for getBillById to match the API endpoint
  async getBillById(billId: string): Promise<Bill | null> {
    try {
      logger.info('[BILLING] Fetching bill:', billId);

      const billDoc = await admin.firestore()
        .collection('bills')
        .doc(billId)
        .get();

      if (!billDoc.exists) {
        return null;
      }

      const billData = billDoc.data() as Bill;

      // If there's an appointmentId, update its paymentStatus
      if (billData.appointmentId) {
        // Get the appointment and update its payment status
        const appointmentRef = admin.firestore().collection('appointments').doc(billData.appointmentId);
        await appointmentRef.update({
          billId: billId,
          paymentStatus: billData.paymentStatus || 'pending'
        });
      }

      return { 
        ...billData, 
        id: billDoc.id,
        createdAt: billData.createdAt ? billData.createdAt : new Date() 
      };
    } catch (error) {
      console.error('Error getting bill by ID:', error);
      throw error;
    }
  }
  async updateBill(billId: string, updateData: Partial<Bill>): Promise<void> {
    try {
      logger.info('[BILLING] Updating bill:', { billId, updateData });
      await admin.firestore().collection('bills').doc(billId).update(updateData);
    } catch (error) {
      logger.error('[BILLING] Error updating bill:', error);
      throw error;
    }
  }

  private async resolveAndUpdateCustomerName(billId: string, bill: Bill) {
    try {
      if (bill.customerId) {
        const customerDoc = await admin.firestore().collection('customers').doc(bill.customerId).get();
        if (customerDoc.exists) {
          const customer = customerDoc.data();
          const customerName = customer?.name || `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim();
          if (customerName) {
            await this.updateBill(billId, { customerName });
            logger.info(`[BILLING] Updated customer name for bill ${billId} to ${customerName}`);
          } else {
            logger.warn(`[BILLING] Could not resolve customer name for bill ${billId}, customerId ${bill.customerId}`);
          }
        } else {
          logger.warn(`[BILLING] Customer not found for bill ${billId}, customerId ${bill.customerId}`);
        }
      } else {
        logger.warn(`[BILLING] customerId missing for bill ${billId}`);
      }
    } catch (error) {
      logger.error(`[BILLING] Error resolving and updating customer name for bill ${billId}:`, error);
    }
  }

  // Create a new bill record
  async createBill(data: BillCreateInput): Promise<string> {
    try {
      const billRef = admin.firestore().collection('bills').doc();
      const billId = billRef.id;

      logger.info('[BILLING] Creating new bill:', { billId, data });

      // Add default values
      const billData: any = {
        ...data,
        id: billId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: data.status || 'unpaid',
        paymentStatus: 'PENDING_PAYMENT' // Added paymentStatus
      };

      // Ensure we have a valid amount
      if (!billData.amount || isNaN(parseFloat(billData.amount))) {
        billData.amount = 0;
      }

      // Try to get customer name from pet if we have petId but no customerName
      if (billData.petId && (!billData.customerName || billData.customerName.trim() === '')) {
        logger.info('[BILLING] Bill has petId but no customer name, attempting to resolve:', { 
          billId, 
          petId: billData.petId 
        });

        try {
          const petDoc = await admin.firestore()
            .collection('pets')
            .doc(billData.petId)
            .get();

          if (petDoc.exists) {
            const petData = petDoc.data();
            logger.info('[BILLING] Found pet data:', { petId: billData.petId, petData });

            // Try to get customerId from pet
            let customerId = null;
            if (petData?.customerId) {
              customerId = petData.customerId;
              logger.info('[BILLING] Found customerId on pet:', { customerId });
            } else if (petData?.ownerId) {
              customerId = petData.ownerId;
              logger.info('[BILLING] Found ownerId on pet:', { customerId });
            } else if (petData?.owner?.id) {
              customerId = petData.owner.id;
              logger.info('[BILLING] Found owner.id reference on pet:', { customerId });
            } else if (typeof petData?.owner === 'string') {
              customerId = petData.owner;
              logger.info('[BILLING] Found owner as string on pet:', { customerId });
            }

            // If we found a customerId, get customer name
            if (customerId) {
              const customerDoc = await admin.firestore()
                .collection('customers')
                .doc(customerId)
                .get();

              if (customerDoc.exists) {
                const customerData = customerDoc.data();
                // Try multiple name formats
                const fullName = customerData?.name || 
                               `${customerData?.firstName || ''} ${customerData?.lastName || ''}`.trim() || 
                               customerData?.displayName || '';

                if (fullName && fullName !== 'Sam Smith' && fullName !== 'John Doe') {
                  logger.info('[BILLING] Found customer name from pet:', { fullName, customerId });
                  billData.customerName = fullName;
                  billData.customerId = customerId;
                }
              }
            }
          }
        } catch (error) {
          logger.error('[BILLING] Error resolving customer from pet:', { error, petId: billData.petId });
        }
      }

      await billRef.set(billData);
      logger.info('[BILLING] Bill created successfully:', { billId, customerName: billData.customerName });

      return billId;
    } catch (error) {
      logger.error('[BILLING] Error creating bill:', error);
      throw new Error(`Failed to create bill: ${error.message}`);
    }
  }
}

interface BillCreateInput {
  appointmentId: string;
  petId?: string;
  items: BillItem[];
  amount: number;
  status?: string;
  customerName?: string;
  customerId?: string;

}