import { z } from 'zod';

export type BillStatus = "DRAFT" | "PENDING_PAYMENT" | "PAID" | "FAILED" | "CANCELED" | "REFUNDED";

// GST Details for Indian Tax Compliance
export interface GSTDetails {
  cgst: number; // Central GST
  sgst: number; // State GST  
  igst: number; // Integrated GST (for inter-state)
  totalGST: number;
  gstNumber?: string; // Customer's GST number if business
}

// Discount Structure
export interface Discount {
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
  reason?: string;
  appliedBy: string; // User ID who applied discount
  appliedAt: Date;
  maxAmount?: number; // For percentage discounts
}

export interface BillItem {
  id: string;
  serviceName: string;
  price: number;
  quantity: number;
  subtotal: number;
  description?: string;
  taxRate: number;
  taxAmount: number;
  discount?: Discount;
}

// Address for Indian Tax Compliance
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface Bill {
  id: string;
  // Basic Info
  billNumber?: string;
  status: BillStatus;
  createdAt: Date;
  updatedAt: Date;
  appointmentId: string;
  customerId: string;
  customerName?: string;
  petId?: string;
  
  // Items and Pricing
  items: BillItem[];
  subtotal: number;
  discount?: Discount;
  discountAmount: number;
  
  // Tax Details (Indian GST)
  gstDetails: GSTDetails;
  totalTaxAmount: number;
  totalAmount: number;
  
  // Payment Info
  paymentMethod?: string;
  paymentId?: string;
  paymentDate?: Date;
  paymentLink?: string;
  
  // Indian Compliance
  currency: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  
  // Notes and References
  notes?: string;
  termsAndConditions?: string;
  
  // Audit Trail
  createdBy?: string;
  updatedBy?: string;
}

export type BillDraft = Omit<Bill, 
  'id' | 
  'billNumber' |
  'status' | 
  'paymentId' | 
  'paymentLink' | 
  'createdAt' | 
  'updatedAt'
>;

// Bill generation input with discount support
export interface BillCreateInput {
  appointmentId: string;
  discount?: Discount;
  notes?: string;
  billingAddress?: Address;
}