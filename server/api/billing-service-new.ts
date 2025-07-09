import { admin } from '../firebase.js';
import { Bill, BillCreateInput, BillStatus, GSTDetails } from '../types/billing.js';
import logger from '../utils/logger.js';

export class BillingService {
  private readonly billsCollection = 'bills';
  private readonly appointmentsCollection = 'appointments';
  private readonly customersCollection = 'customers';
  private readonly servicesCollection = 'services';

  // Standard GST rate for pet grooming services in India
  private readonly DEFAULT_GST_RATE = 18;
  
  // Firestore database reference
  private get db() {
    return admin.firestore();
  }

  /**
   * Get all bills with optional filtering
   */
  async getAllBills(filters?: {
    status?: BillStatus;
    customerId?: string;
    appointmentId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<Bill[]> {
    try {
      logger.info('[BILLING] Fetching all bills with filters:', filters);

      let query: any = this.db.collection(this.billsCollection);

      // Apply filters
      if (filters?.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters?.customerId) {
        query = query.where('customerId', '==', filters.customerId);
      }

      if (filters?.appointmentId) {
        query = query.where('appointmentId', '==', filters.appointmentId);
      }

      if (filters?.fromDate) {
        query = query.where('createdAt', '>=', admin.firestore.Timestamp.fromDate(filters.fromDate));
      }

      if (filters?.toDate) {
        query = query.where('createdAt', '<=', admin.firestore.Timestamp.fromDate(filters.toDate));
      }

      // Add ordering
      query = query.orderBy('createdAt', 'desc');

      const snapshot = await query.get();
      const bills = await Promise.all(snapshot.docs.map(async (doc: any) => {
        const billData = this.convertFirestoreDocToBill(doc.id, doc.data());
        
        // Resolve customer name if missing or incorrect
        if (billData.customerId && (!billData.customerName || billData.customerName.includes('??'))) {
          const customer = await this.getCustomerById(billData.customerId);
          if (customer) {
            billData.customerName = customer.firstName && customer.lastName 
              ? `${customer.firstName} ${customer.lastName}`.trim()
              : customer.name || customer.firstName || customer.lastName || 'Unknown Customer';
          }
        }
        
        return billData;
      }));

      logger.info(`[BILLING] Successfully fetched ${bills.length} bills`);
      return bills;
    } catch (error) {
      logger.error('[BILLING] Error fetching bills:', error);
      throw error;
    }
  }

  /**
   * Get a specific bill by ID
   */
  async getBillById(billId: string): Promise<Bill | null> {
    try {
      logger.info('[BILLING] Fetching bill by ID:', billId);

      const docRef = this.db.collection(this.billsCollection).doc(billId);
      const doc = await docRef.get();

      if (!doc.exists) {
        logger.warn('[BILLING] Bill not found:', billId);
        return null;
      }

      const bill = this.convertFirestoreDocToBill(doc.id, doc.data()!);
      
      // Resolve customer name if missing or incorrect
      if (bill.customerId && (!bill.customerName || bill.customerName.includes('??'))) {
        const customer = await this.getCustomerById(bill.customerId);
        if (customer) {
          bill.customerName = customer.firstName && customer.lastName 
            ? `${customer.firstName} ${customer.lastName}`.trim()
            : customer.name || customer.firstName || customer.lastName || 'Unknown Customer';
        }
      }
      
      logger.info('[BILLING] Successfully fetched bill:', billId);
      return bill;
    } catch (error) {
      logger.error('[BILLING] Error fetching bill by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new bill from an appointment
   */
  async createBillFromAppointment(
    appointmentId: string,
    input: BillCreateInput,
    userId: string
  ): Promise<Bill> {
    try {
      logger.info('[BILLING] Creating bill for appointment:', appointmentId);

      // Get appointment details
      const appointment = await this.getAppointmentById(appointmentId);
      if (!appointment) {
        throw new Error(`Appointment not found: ${appointmentId}`);
      }

      // Log appointment data for debugging
      logger.info('[BILLING] Appointment data:', {
        id: appointment.id,
        customerId: appointment.customerId,
        customerReference: appointment.customerReference,
        customerRef: appointment.customerRef,
        customer: appointment.customer,
        petId: appointment.petId,
        services: appointment.services?.length || 0
      });

      // Get customer ID through pet relationship (primary method)
      let customerId = null;
      
      if (appointment.petId) {
        // Get pet data to find customer ID
        const petDoc = await this.db.collection('pets').doc(appointment.petId).get();
        if (petDoc.exists) {
          const petData = petDoc.data();
          customerId = petData?.customerId;
          logger.info('[BILLING] Found customer ID through pet:', { petId: appointment.petId, customerId });
        }
      }

      // Fallback: Try direct customer references in appointment
      if (!customerId) {
        customerId = appointment.customerId;
        if (!customerId && appointment.customerReference) {
          customerId = appointment.customerReference.id || appointment.customerReference;
        }
        if (!customerId && appointment.customerRef) {
          customerId = appointment.customerRef.id || appointment.customerRef;
        }
        if (!customerId && appointment.customer) {
          customerId = appointment.customer.id || appointment.customer;
        }
      }

      logger.info('[BILLING] Resolved customer ID:', customerId);

      // Get customer details
      const customer = await this.getCustomerById(customerId);
      if (!customer) {
        throw new Error(`Customer not found: ${customerId}`);
      }

      // Calculate bill items from services
      const billItems = await this.calculateBillItems(appointment.services || []);
      
      // Calculate totals
      const subtotal = billItems.reduce((sum, item) => sum + item.subtotal, 0);
      const discountAmount = input.discount ? this.calculateDiscountAmount(subtotal, input.discount) : 0;
      const taxableAmount = subtotal - discountAmount;
      
      // For now, disable GST by default until proper GST configuration is implemented
      const gstEnabled = false; // TODO: Read from GST configuration
      const gstDetails = gstEnabled 
        ? this.calculateGST(taxableAmount, this.DEFAULT_GST_RATE, false)
        : { cgst: 0, sgst: 0, igst: 0, totalGST: 0 };
      
      const totalAmount = taxableAmount + gstDetails.totalGST;

      // Generate bill number
      const billNumber = await this.generateBillNumber();

      // Create bill document
      const billData = {
        billNumber,
        status: 'DRAFT' as BillStatus,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        customerId: customer.id,
        customerName: customer.name,
        appointmentId,
        petId: appointment.petId,
        items: billItems,
        subtotal,
        discount: input.discount || null,
        discountAmount,
        gstDetails,
        totalTaxAmount: gstDetails.totalGST,
        totalAmount,
        currency: 'INR',
        notes: input.notes || null,
        billingAddress: input.billingAddress || customer.address || null,
        shippingAddress: customer.address || null,
        termsAndConditions: null,
        createdBy: userId,
        updatedBy: userId
      };

      // Add to Firestore
      const docRef = await this.db.collection(this.billsCollection).add(billData);
      
      // Get the created document
      const createdDoc = await docRef.get();
      const bill = this.convertFirestoreDocToBill(createdDoc.id, createdDoc.data()!);

      logger.info('[BILLING] Successfully created bill:', bill.id);
      return bill;
    } catch (error) {
      logger.error('[BILLING] Error creating bill:', error);
      throw error;
    }
  }

  /**
   * Update an existing bill
   */
  async updateBill(
    billId: string,
    updates: Partial<Bill>,
    userId: string
  ): Promise<Bill> {
    try {
      logger.info('[BILLING] Updating bill:', billId);

      // Remove system fields that shouldn't be updated directly
      const { id, createdAt, createdBy, ...updateData } = updates as any;
      
      // Add update metadata
      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      updateData.updatedBy = userId;

      // Remove undefined values
      Object.keys(updateData).forEach(key => 
        updateData[key] === undefined && delete updateData[key]
      );

      // Update document
      const docRef = this.db.collection(this.billsCollection).doc(billId);
      await docRef.update(updateData);

      // Get updated document
      const updatedDoc = await docRef.get();
      if (!updatedDoc.exists) {
        throw new Error(`Bill not found after update: ${billId}`);
      }

      const bill = this.convertFirestoreDocToBill(updatedDoc.id, updatedDoc.data()!);
      logger.info('[BILLING] Successfully updated bill:', billId);
      return bill;
    } catch (error) {
      logger.error('[BILLING] Error updating bill:', error);
      throw error;
    }
  }

  /**
   * Update bill status
   */
  async updateBillStatus(
    billId: string,
    status: BillStatus, 
    userId: string,
    metadata?: {
      paymentId?: string;
      paymentMethod?: string;
      paymentDate?: Date;
      notes?: string;
    }
  ): Promise<Bill> {
    try {
      logger.info('[BILLING] Updating bill status:', { billId, status });

      const updateData: any = {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: userId
      };

      if (metadata) {
        Object.assign(updateData, metadata);
      }

      const docRef = this.db.collection(this.billsCollection).doc(billId);
      await docRef.update(updateData);

      // Get updated document
      const updatedDoc = await docRef.get();
      if (!updatedDoc.exists) {
        throw new Error(`Bill not found after status update: ${billId}`);
      }

      const bill = this.convertFirestoreDocToBill(updatedDoc.id, updatedDoc.data()!);
      logger.info('[BILLING] Successfully updated bill status:', billId);
      return bill;
    } catch (error) {
      logger.error('[BILLING] Error updating bill status:', error);
      throw error;
    }
  }

  /**
   * Get bills for a specific customer
   */
  async getBillsByCustomer(customerId: string): Promise<Bill[]> {
    try {
      logger.info('[BILLING] Fetching bills for customer:', customerId);

      const snapshot = await this.db.collection(this.billsCollection)
        .where('customerId', '==', customerId)
        .orderBy('createdAt', 'desc')
        .get();

      const bills = snapshot.docs.map((doc: any) => 
        this.convertFirestoreDocToBill(doc.id, doc.data())
      );

      logger.info(`[BILLING] Found ${bills.length} bills for customer:`, customerId);
      return bills;
    } catch (error) {
      logger.error('[BILLING] Error fetching bills by customer:', error);
      throw error;
    }
  }

  /**
   * Get bills for a specific appointment
   */
  async getBillsByAppointment(appointmentId: string): Promise<Bill[]> {
    try {
      logger.info('[BILLING] Fetching bills for appointment:', appointmentId);

      const snapshot = await this.db.collection(this.billsCollection)
        .where('appointmentId', '==', appointmentId)
        .orderBy('createdAt', 'desc')
        .get();

      const bills = snapshot.docs.map((doc: any) => 
        this.convertFirestoreDocToBill(doc.id, doc.data())
      );

      logger.info(`[BILLING] Found ${bills.length} bills for appointment:`, appointmentId);
      return bills;
    } catch (error) {
      logger.error('[BILLING] Error fetching bills by appointment:', error);
      throw error;
    }
  }

  // Private helper methods

  private convertFirestoreDocToBill(id: string, data: any): Bill {
    return {
      id,
      billNumber: data.billNumber,
      status: data.status,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt ? new Date(data.updatedAt) : null,
      customerId: data.customerId,
      customerName: data.customerName,
      appointmentId: data.appointmentId,
      petId: data.petId,
      items: data.items || [],
      subtotal: data.subtotal || 0,
      discount: data.discount,
      discountAmount: data.discountAmount || 0,
      gstDetails: data.gstDetails || {
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalGST: 0,
        gstNumber: data.gstNumber
      },
      totalTaxAmount: data.totalTaxAmount || 0,
      totalAmount: data.totalAmount || 0,
      currency: data.currency || 'INR',
      paymentId: data.paymentId,
      paymentMethod: data.paymentMethod,
      paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : data.paymentDate ? new Date(data.paymentDate) : null,
      notes: data.notes,
      paymentLink: data.paymentLink,
      billingAddress: data.billingAddress,
      shippingAddress: data.shippingAddress,
      termsAndConditions: data.termsAndConditions,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy
    };
  }

  private async getAppointmentById(appointmentId: string): Promise<any> {
    const doc = await this.db.collection(this.appointmentsCollection).doc(appointmentId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  private async getCustomerById(customerId: string): Promise<any> {
    if (!customerId || customerId.trim() === '') {
      logger.error('[BILLING] Customer ID is empty or null');
      throw new Error('Customer ID is required but not provided');
    }
    
    const doc = await this.db.collection(this.customersCollection).doc(customerId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  private async calculateBillItems(services: any[]): Promise<any[]> {
    const billItems = [];

    for (const serviceRef of services) {
      let serviceData;
      
      if (typeof serviceRef === 'string') {
        // Service ID reference
        const serviceDoc = await this.db.collection(this.servicesCollection).doc(serviceRef).get();
        serviceData = serviceDoc.exists ? { id: serviceDoc.id, ...serviceDoc.data() } : null;
      } else if (serviceRef.id) {
        // Service object with ID
        const serviceDoc = await this.db.collection(this.servicesCollection).doc(serviceRef.id).get();
        serviceData = serviceDoc.exists ? { id: serviceDoc.id, ...serviceDoc.data() } : serviceRef;
      } else {
        // Direct service object
        serviceData = serviceRef;
      }

      if (serviceData) {
        const quantity = serviceRef.quantity || 1;
        const price = serviceData.price || 0;
        const subtotal = price * quantity;

        billItems.push({
          id: serviceData.id || `service_${Date.now()}`,
          serviceName: serviceData.name || 'Unknown Service',
          price,
          quantity,
          subtotal,
          description: serviceData.description || null
        });
      }
    }

    return billItems;
  }

  private calculateDiscountAmount(amount: number, discount: any): number {
    if (!discount) return 0;
    
    if (discount.type === 'PERCENTAGE') {
      const discountAmount = (amount * discount.value) / 100;
      return discount.maxAmount ? Math.min(discountAmount, discount.maxAmount) : discountAmount;
    } else {
      return Math.min(discount.value, amount);
    }
  }

  private calculateGST(amount: number, gstRate: number, isInterState: boolean = false): GSTDetails {
    const gstAmount = (amount * gstRate) / 100;
    
    if (isInterState) {
      return {
        cgst: 0,
        sgst: 0,
        igst: gstAmount,
        totalGST: gstAmount,
        gstNumber: undefined
      };
    } else {
      return {
        cgst: gstAmount / 2,
        sgst: gstAmount / 2,
        igst: 0,
        totalGST: gstAmount,
        gstNumber: undefined
      };
    }
  }

  private async generateBillNumber(): Promise<string> {
    try {
      // Get current fiscal year (April 1 to March 31)
      const now = new Date();
      const fiscalYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      
      // Query bills from current fiscal year
      const startOfFiscalYear = new Date(fiscalYear, 3, 1, 0, 0, 0); // April 1st
      const endOfFiscalYear = new Date(fiscalYear + 1, 2, 31, 23, 59, 59); // March 31st next year
      
      const snapshot = await this.db.collection(this.billsCollection)
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfFiscalYear))
        .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endOfFiscalYear))
        .orderBy('createdAt', 'desc')
        .get();

      const count = snapshot.size + 1;
      
      // Format: GROOMIT-FY23-24-001
      const fyString = `FY${fiscalYear.toString().slice(-2)}-${(fiscalYear + 1).toString().slice(-2)}`;
      const billNumber = `GROOMIT-${fyString}-${count.toString().padStart(3, '0')}`;
      
      return billNumber;
    } catch (error) {
      logger.error('[BILLING] Error generating bill number:', error);
      // Fallback to timestamp-based number
      const timestamp = Date.now();
      return `GROOMIT-${timestamp}`;
    }
  }
}

export const billingService = new BillingService();