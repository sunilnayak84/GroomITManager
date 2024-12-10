import { z } from "zod";

// Define the consumable schema
export const serviceConsumableSchema = z.object({
  item_id: z.string(),
  item_name: z.string(),
  quantity_used: z.number().positive("Quantity must be greater than 0"),
});

// Define the service schema
export const serviceSchema = z.object({
  service_id: z.string(),
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  price: z.number().min(0, "Price cannot be negative"),
  consumables: z.array(serviceConsumableSchema).default([]),
  isActive: z.boolean().default(true),
  created_at: z.date(),
  updated_at: z.date(),
});

// Export types based on the schema
export type ServiceConsumable = z.infer<typeof serviceConsumableSchema>;
export type Service = z.infer<typeof serviceSchema>;

// Schema for creating/updating a service
export const insertServiceSchema = serviceSchema.omit({
  service_id: true,
  created_at: true,
  updated_at: true,
});

export type InsertService = z.infer<typeof insertServiceSchema>;

// Service status enum
export const ServiceStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export type ServiceStatus = typeof ServiceStatus[keyof typeof ServiceStatus];
