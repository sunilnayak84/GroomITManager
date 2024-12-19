import { z } from "zod";

// Service categories
export const ServiceCategory = {
  SERVICE: 'Service',
  ADDON: 'Addon',
  PACKAGE: 'Package'
} as const;

// Base consumable schema for form validation and service operations
export const baseConsumableSchema = z.object({
  item_id: z.string().min(1, "Item ID is required"),
  item_name: z.string().min(1, "Item name is required"),
  quantity_used: z.coerce.number().min(0.1, "Quantity must be greater than 0")
});

// Service consumable schema - using the base schema directly since we handle number conversion in the form
export const serviceConsumableSchema = baseConsumableSchema;

// Package item type
export type PackageItem = {
  service_id: string;
  name: string;
  duration: number;
  price: number;
  category: typeof ServiceCategory[keyof typeof ServiceCategory];
};

// Base service schema with essential fields
export const baseServiceSchema = {
  name: z.string().min(2, "Service name must be at least 2 characters"),
  category: z.enum([ServiceCategory.SERVICE, ServiceCategory.ADDON, ServiceCategory.PACKAGE]),
  duration: z.number().min(15, "Duration must be at least 15 minutes"),
  price: z.number().min(0, "Price cannot be negative"),
  description: z.string().nullable().default(null),
};

// Full service schema for database operations
export const serviceSchema = z.object({
  service_id: z.string(),
  ...baseServiceSchema,
  discount_percentage: z.number().min(0).max(100).optional().default(0),
  consumables: z.array(serviceConsumableSchema).optional().default([]),
  required_categories: z.array(z.string()).default([]), // Added required_categories field
  isActive: z.boolean().default(true),
  created_at: z.date().or(z.string()).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  updated_at: z.date().or(z.string()).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  selectedServices: z.array(z.object({
    service_id: z.string(),
    name: z.string(),
    duration: z.number(),
    price: z.number(),
    category: z.enum([ServiceCategory.SERVICE, ServiceCategory.ADDON, ServiceCategory.PACKAGE])
  })).optional(),
  selectedAddons: z.array(z.object({
    service_id: z.string(),
    name: z.string(),
    duration: z.number(),
    price: z.number(),
    category: z.enum([ServiceCategory.SERVICE, ServiceCategory.ADDON, ServiceCategory.PACKAGE])
  })).optional()
});

// Schema for creating a new service
export const insertServiceSchema = z.object({
  ...baseServiceSchema,
  discount_percentage: z.number().min(0).max(100).optional().default(0),
  consumables: z.array(serviceConsumableSchema).optional().default([]),
  required_categories: z.array(z.string()).default([]), // Added required_categories field
  isActive: z.boolean().default(true),
  selectedServices: z.array(z.object({
    service_id: z.string(),
    name: z.string(),
    duration: z.number(),
    price: z.number(),
    category: z.enum([ServiceCategory.SERVICE, ServiceCategory.ADDON, ServiceCategory.PACKAGE])
  })).optional(),
  selectedAddons: z.array(z.object({
    service_id: z.string(),
    name: z.string(),
    duration: z.number(),
    price: z.number(),
    category: z.enum([ServiceCategory.SERVICE, ServiceCategory.ADDON, ServiceCategory.PACKAGE])
  })).optional()
});

// Export types
export type ServiceConsumable = z.infer<typeof serviceConsumableSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type UpdateService = Partial<InsertService>;

// Update service schema
export const updateServiceSchema = insertServiceSchema.partial();