import { z } from 'zod';

export const BillStatusSchema = z.enum([
  'DRAFT',
  'PENDING_PAYMENT',
  'PAID',
  'FAILED'
]);

export type BillStatus = z.infer<typeof BillStatusSchema>;

export const BillItemSchema = z.object({
  id: z.string(),
  serviceName: z.string(),
  description: z.string().optional(),
  price: z.number(),
  quantity: z.number(),
  subtotal: z.number()
});

export type BillItem = z.infer<typeof BillItemSchema>;

export const BillSchema = z.object({
  id: z.string().optional(),
  appointmentId: z.string(),
  customerId: z.string(),
  customerName: z.string().optional(),
  items: z.array(BillItemSchema),
  subtotal: z.number(),
  tax: z.number(),
  totalAmount: z.number(),
  status: BillStatusSchema,
  paymentId: z.string().optional(),
  paymentLink: z.string().optional(),
  createdAt: z.date().or(z.string()), // Support both date objects and string dates
  updatedAt: z.date().or(z.string())
});

export type Bill = z.infer<typeof BillSchema>;

export const BillDraftSchema = BillSchema.omit({ 
  id: true,
  status: true,
  paymentId: true,
  paymentLink: true,
  createdAt: true,
  updatedAt: true
});

export type BillDraft = z.infer<typeof BillDraftSchema>;