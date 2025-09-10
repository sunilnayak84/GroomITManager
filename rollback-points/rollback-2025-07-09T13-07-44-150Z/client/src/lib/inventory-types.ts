import { z } from "zod";
import { Timestamp } from "firebase/firestore";

// Inventory item schema with validation
export const inventoryItemSchema = z.object({
  item_id: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().nullable().default(null),
  quantity: z.number().min(0, "Quantity cannot be negative").default(0),
  minimum_quantity: z.number().min(0, "Minimum quantity cannot be negative").default(0),
  unit: z.string().min(1, "Unit is required"),
  cost_per_unit: z.number().min(0, "Cost must be non-negative").default(0),
  category: z.string().min(1, "Category is required"),
  supplier: z.string().nullable().default(null),
  last_restock_date: z.date().nullable().default(null),
  isActive: z.boolean().default(true),
  quantity_per_use: z.number().min(0, "Quantity per use must be non-negative").default(1),
  service_linked: z.boolean().default(false),
  reorder_point: z.number().min(0, "Reorder point cannot be negative").default(0),
  reorder_quantity: z.number().min(0, "Reorder quantity cannot be negative").default(0),
  location: z.string().nullable().default(null),
  barcode: z.string().nullable().default(null),
  created_at: z.date(),
  updated_at: z.date().nullable(),
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;

// Schema for inserting new inventory items
export const insertInventoryItemSchema = inventoryItemSchema.omit({ 
  item_id: true,
  created_at: true,
  updated_at: true 
}).extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  quantity: z.number().min(0, "Quantity cannot be negative"),
  unit: z.string().min(1, "Unit is required"),
  supplier: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  minimum_quantity: z.number().min(0, "Minimum quantity cannot be negative"),
  cost_per_unit: z.number().min(0, "Cost per unit cannot be negative"),
  category: z.string().min(1, "Category is required"),
  last_restock_date: z.date().nullable().default(null),
  location: z.string().nullable().default(null),
  barcode: z.string().nullable().default(null)
});

export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

// Usage tracking schema
export const usageRecordSchema = z.object({
  record_id: z.string(),
  item_id: z.string(),
  quantity_used: z.number().min(0, "Usage quantity must be positive"),
  service_id: z.string().optional(),
  appointment_id: z.string().optional(),
  used_by: z.string(),
  notes: z.string().nullable().default(null),
  timestamp: z.date()
});

export type UsageRecord = z.infer<typeof usageRecordSchema>;
export type InsertUsageRecord = Omit<UsageRecord, "record_id" | "timestamp">;
