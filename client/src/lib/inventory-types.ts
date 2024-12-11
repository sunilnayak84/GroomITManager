import { z } from "zod";
import { Timestamp } from "firebase/firestore";

// Inventory item schema with validation
export const inventoryItemSchema = z.object({
  item_id: z.string().optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  quantity: z.number().min(0, "Quantity cannot be negative"),
  unit: z.string().min(1, "Unit is required"),
  supplier: z.string().nullable(),
  description: z.string().nullable(),
  minimum_quantity: z.number().min(0, "Minimum quantity cannot be negative"),
  createdAt: z.union([z.string(), z.instanceof(Timestamp)]).optional(),
  updatedAt: z.union([z.string(), z.instanceof(Timestamp), z.null()]).optional(),
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;

// Usage tracking schema
export const usageRecordSchema = z.object({
  record_id: z.string().optional(),
  item_id: z.string(),
  quantity_used: z.number().min(0, "Usage quantity must be positive"),
  service_id: z.string().optional(),
  appointment_id: z.string().optional(),
  used_by: z.string(),
  notes: z.string().optional(),
  timestamp: z.union([z.string(), z.instanceof(Timestamp)]).optional(),
});

export type UsageRecord = z.infer<typeof usageRecordSchema>;

// Helper type for inventory item creation
export const insertInventoryItemSchema = inventoryItemSchema.extend({
  cost_per_unit: z.number().min(0, "Cost per unit cannot be negative"),
  category: z.string().min(1, "Category is required"),
  last_restock_date: z.date().nullable(),
  isActive: z.boolean().default(true),
  reorder_point: z.number().min(0, "Reorder point cannot be negative"),
  reorder_quantity: z.number().min(0, "Reorder quantity cannot be negative"),
  location: z.string().nullable(),
  barcode: z.string().nullable(),
});

export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

// Helper type for usage record creation
export type InsertUsageRecord = Omit<UsageRecord, "record_id" | "timestamp">;
