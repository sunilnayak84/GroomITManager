import { z } from 'zod';

export type BillStatus = "DRAFT" | "PENDING_PAYMENT" | "PAID" | "FAILED" | "CANCELED" | "REFUNDED";

export interface BillItem {
  id: string;
  serviceName: string;
  price: number;
  quantity: number;
  subtotal: number;
  description?: string;
}

export interface Bill {
  id: string;
  status: BillStatus;
  createdAt: Date;
  updatedAt: Date;
  appointmentId: string;
  customerId: string;
  customerName?: string;
  petId?: string;
  items: BillItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  currency: string;
  notes?: string;
  paymentMethod?: string;
  paymentId?: string;
  paymentDate?: Date;
  paymentLink?: string;
}

export type BillDraft = Omit<Bill, 
  'id' | 
  'status' | 
  'paymentId' | 
  'paymentLink' | 
  'createdAt' | 
  'updatedAt'
>;