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

// System Configuration for Indian Billing
export interface GSTConfiguration {
  enabled: boolean;
  companyGSTNumber: string;
  companyName: string;
  companyAddress: Address;
  defaultGSTRate: number; // Usually 18% for pet services
  cgstRate: number; // Usually 9%
  sgstRate: number; // Usually 9%
  igstRate: number; // Usually 18% for inter-state
  stateCode: string; // For GST state identification
}

// Payment Methods for Indian market
export type PaymentMethod = 
  | 'CASH' 
  | 'UPI_QR' 
  | 'UPI_ID' 
  | 'CARD' 
  | 'NET_BANKING' 
  | 'WALLET' 
  | 'RAZORPAY' 
  | 'BANK_TRANSFER';

// Payment Status
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface PaymentInfo {
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  transactionId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  paidAt?: Date;
  paidBy?: string; // User who marked as paid
  notes?: string;
}

// Enhanced Bill with payment info
export interface BillWithPayment extends Bill {
  paymentInfo?: PaymentInfo;
  isGSTApplicable: boolean;
  customerGSTNumber?: string;
}

// Discount Management with role restrictions
export interface DiscountApplication {
  percentage: number;
  maxAmount?: number;
  reason: string;
  appliedBy: string;
  appliedByRole: 'admin' | 'manager' | 'staff';
  requiresApproval: boolean;
  approvedBy?: string;
  appliedAt: Date;
}

// Bill generation input with discount support
export interface BillCreateInput {
  appointmentId: string;
  discount?: Discount;
  notes?: string;
  billingAddress?: Address;
}