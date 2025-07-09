import { z } from 'zod';

// Define billing-related types for the server (Indian Compliance)
export const BillStatusSchema = z.enum([
  'DRAFT',
  'PENDING_PAYMENT',
  'PAID',
  'FAILED',
  'CANCELED',
  'REFUNDED'
]);

export type BillStatus = z.infer<typeof BillStatusSchema>;

// GST Tax Structure for India
export const GSTDetailsSchema = z.object({
  cgst: z.number(), // Central GST
  sgst: z.number(), // State GST  
  igst: z.number(), // Integrated GST (for inter-state)
  totalGST: z.number(),
  gstNumber: z.string().optional(), // Customer's GST number if business
});

export type GSTDetails = z.infer<typeof GSTDetailsSchema>;

// Discount Structure
export const DiscountSchema = z.object({
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  value: z.number(),
  reason: z.string().optional(),
  appliedBy: z.string(), // User ID who applied discount
  appliedAt: z.date().or(z.string()),
  maxAmount: z.number().optional(), // For percentage discounts
});

export type Discount = z.infer<typeof DiscountSchema>;

export const BillItemSchema = z.object({
  id: z.string(),
  serviceName: z.string(),
  description: z.string().optional(),
  price: z.number(),
  quantity: z.number(),
  subtotal: z.number(),
  taxRate: z.number().default(18), // Default 18% GST
  taxAmount: z.number(),
  discount: DiscountSchema.optional(),
});

export type BillItem = z.infer<typeof BillItemSchema>;

// Address for Indian Tax Compliance
export const AddressSchema = z.object({
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  country: z.string().default('India'),
});

export type Address = z.infer<typeof AddressSchema>;

export const BillSchema = z.object({
  id: z.string().optional(),
  // Basic Info
  billNumber: z.string().optional(), // Auto-generated sequential number
  appointmentId: z.string(),
  customerId: z.string(),
  customerName: z.string().optional(),
  petId: z.string().optional(),
  
  // Items and Pricing
  items: z.array(BillItemSchema),
  subtotal: z.number(),
  discount: DiscountSchema.optional(),
  discountAmount: z.number().default(0),
  
  // Tax Details (Indian GST)
  gstDetails: GSTDetailsSchema,
  totalTaxAmount: z.number(),
  totalAmount: z.number(),
  
  // Payment Info
  status: BillStatusSchema,
  paymentMethod: z.string().optional(),
  paymentId: z.string().optional(),
  paymentLink: z.string().optional(),
  paymentDate: z.date().or(z.string()).optional(),
  
  // Indian Compliance
  currency: z.string().default('INR'),
  billingAddress: AddressSchema.optional(),
  shippingAddress: AddressSchema.optional(),
  
  // Notes and References
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  
  // Audit Trail
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

export type Bill = z.infer<typeof BillSchema>;

export const BillDraftSchema = BillSchema.omit({ 
  id: true,
  billNumber: true,
  status: true,
  paymentId: true,
  paymentLink: true,
  createdAt: true,
  updatedAt: true
});

export type BillDraft = z.infer<typeof BillDraftSchema>;

// Bill generation input with discount support
export const BillCreateInputSchema = z.object({
  appointmentId: z.string(),
  discount: DiscountSchema.optional(),
  notes: z.string().optional(),
  billingAddress: AddressSchema.optional(),
});

export type BillCreateInput = z.infer<typeof BillCreateInputSchema>;